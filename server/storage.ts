import { 
  type User, 
  type InsertUser, 
  type CandleData, 
  type OrderBookData,
  type InsertCandle,
  type InsertOrderBook,
  type InsertTrade,
  type DbCandle,
  type DbOrderBook,
  type Cluster
} from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { candles, orderBooks, trades } from "@shared/schema";
import { eq, and, desc, gte, lte } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Trading data storage methods
  getCandleData(symbol: string, interval: string, limit?: number): Promise<CandleData[]>;
  saveCandleData(candleData: InsertCandle): Promise<void>;
  updateCandleData(symbol: string, interval: string, openTime: Date, candleData: Partial<InsertCandle>): Promise<void>;
  getOrderBookData(symbol: string): Promise<OrderBookData | undefined>;
  saveOrderBookData(orderBookData: InsertOrderBook): Promise<void>;
  saveTrade(tradeData: InsertTrade): Promise<void>;
  getLatestCandle(symbol: string, interval: string): Promise<DbCandle | undefined>;
  getCandleDataRange(symbol: string, interval: string, startTime: Date, endTime: Date): Promise<CandleData[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from({ users: {} as any }).where(eq({} as any, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from({ users: {} as any }).where(eq({} as any, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert({ users: {} as any })
      .values(insertUser)
      .returning();
    return user;
  }

  async getCandleData(symbol: string, interval: string, limit: number = 100): Promise<CandleData[]> {
    const dbCandles = await db
      .select()
      .from(candles)
      .where(and(eq(candles.symbol, symbol), eq(candles.interval, interval)))
      .orderBy(desc(candles.openTime))
      .limit(limit);

    return dbCandles.map(this.convertDbCandleToCandleData);
  }

  async saveCandleData(candleData: InsertCandle): Promise<void> {
    await db
      .insert(candles)
      .values(candleData)
      .onConflictDoUpdate({
        target: [candles.symbol, candles.interval, candles.openTime],
        set: {
          close: candleData.close,
          high: candleData.high,
          low: candleData.low,
          volume: candleData.volume,
          buyVolume: candleData.buyVolume,
          sellVolume: candleData.sellVolume,
          delta: candleData.delta,
          clusters: candleData.clusters,
          closeTime: candleData.closeTime,
        },
      });
  }

  async updateCandleData(symbol: string, interval: string, openTime: Date, candleData: Partial<InsertCandle>): Promise<void> {
    await db
      .update(candles)
      .set(candleData)
      .where(and(
        eq(candles.symbol, symbol),
        eq(candles.interval, interval),
        eq(candles.openTime, openTime)
      ));
  }

  async getOrderBookData(symbol: string): Promise<OrderBookData | undefined> {
    const [orderBook] = await db
      .select()
      .from(orderBooks)
      .where(eq(orderBooks.symbol, symbol))
      .orderBy(desc(orderBooks.lastUpdate))
      .limit(1);

    if (!orderBook) return undefined;

    return {
      bids: orderBook.bids,
      asks: orderBook.asks,
      lastUpdate: orderBook.lastUpdate.getTime(),
    };
  }

  async saveOrderBookData(orderBookData: InsertOrderBook): Promise<void> {
    await db.insert(orderBooks).values(orderBookData);
  }

  async saveTrade(tradeData: InsertTrade): Promise<void> {
    await db.insert(trades).values(tradeData);
  }

  async getLatestCandle(symbol: string, interval: string): Promise<DbCandle | undefined> {
    const [candle] = await db
      .select()
      .from(candles)
      .where(and(eq(candles.symbol, symbol), eq(candles.interval, interval)))
      .orderBy(desc(candles.openTime))
      .limit(1);

    return candle;
  }

  async getCandleDataRange(symbol: string, interval: string, startTime: Date, endTime: Date): Promise<CandleData[]> {
    const dbCandles = await db
      .select()
      .from(candles)
      .where(and(
        eq(candles.symbol, symbol),
        eq(candles.interval, interval),
        gte(candles.openTime, startTime),
        lte(candles.openTime, endTime)
      ))
      .orderBy(candles.openTime);

    return dbCandles.map(this.convertDbCandleToCandleData);
  }

  private convertDbCandleToCandleData(dbCandle: DbCandle): CandleData {
    return {
      time: Math.floor(dbCandle.openTime.getTime() / 1000),
      open: dbCandle.open,
      high: dbCandle.high,
      low: dbCandle.low,
      close: dbCandle.close,
      volume: dbCandle.volume,
      buyVolume: dbCandle.buyVolume,
      sellVolume: dbCandle.sellVolume,
      delta: dbCandle.delta,
      clusters: dbCandle.clusters,
    };
  }
}

// Keep memory storage for backward compatibility during development
export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private candleData: Map<string, CandleData[]>;
  private orderBookData: Map<string, OrderBookData>;

  constructor() {
    this.users = new Map();
    this.candleData = new Map();
    this.orderBookData = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getCandleData(symbol: string, interval: string, limit: number = 100): Promise<CandleData[]> {
    const key = `${symbol}_${interval}`;
    const data = this.candleData.get(key) || [];
    return data.slice(-limit);
  }

  async saveCandleData(candleData: InsertCandle): Promise<void> {
    const key = `${candleData.symbol}_${candleData.interval}`;
    const existing = this.candleData.get(key) || [];
    const candleTime = Math.floor(candleData.openTime.getTime() / 1000);
    
    const convertedCandle: CandleData = {
      time: candleTime,
      open: candleData.open,
      high: candleData.high,
      low: candleData.low,
      close: candleData.close,
      volume: candleData.volume,
      buyVolume: candleData.buyVolume,
      sellVolume: candleData.sellVolume,
      delta: candleData.delta,
      clusters: candleData.clusters,
    };

    // Replace existing candle with same time or add new one
    const existingIndex = existing.findIndex(c => c.time === candleTime);
    if (existingIndex >= 0) {
      existing[existingIndex] = convertedCandle;
    } else {
      existing.push(convertedCandle);
      existing.sort((a, b) => a.time - b.time);
    }
    
    this.candleData.set(key, existing);
  }

  async updateCandleData(symbol: string, interval: string, openTime: Date, candleData: Partial<InsertCandle>): Promise<void> {
    const key = `${symbol}_${interval}`;
    const existing = this.candleData.get(key) || [];
    const candleTime = Math.floor(openTime.getTime() / 1000);
    
    const existingIndex = existing.findIndex(c => c.time === candleTime);
    if (existingIndex >= 0) {
      const updated = { ...existing[existingIndex] };
      if (candleData.close !== undefined) updated.close = candleData.close;
      if (candleData.high !== undefined) updated.high = candleData.high;
      if (candleData.low !== undefined) updated.low = candleData.low;
      if (candleData.volume !== undefined) updated.volume = candleData.volume;
      if (candleData.buyVolume !== undefined) updated.buyVolume = candleData.buyVolume;
      if (candleData.sellVolume !== undefined) updated.sellVolume = candleData.sellVolume;
      if (candleData.delta !== undefined) updated.delta = candleData.delta;
      if (candleData.clusters !== undefined) updated.clusters = candleData.clusters;
      
      existing[existingIndex] = updated;
      this.candleData.set(key, existing);
    }
  }

  async getOrderBookData(symbol: string): Promise<OrderBookData | undefined> {
    return this.orderBookData.get(symbol);
  }

  async saveOrderBookData(orderBookData: InsertOrderBook): Promise<void> {
    const converted: OrderBookData = {
      bids: orderBookData.bids,
      asks: orderBookData.asks,
      lastUpdate: orderBookData.lastUpdate.getTime(),
    };
    this.orderBookData.set(orderBookData.symbol, converted);
  }

  async saveTrade(tradeData: InsertTrade): Promise<void> {
    // For memory storage, we don't need to persist individual trades
  }

  async getLatestCandle(symbol: string, interval: string): Promise<DbCandle | undefined> {
    const key = `${symbol}_${interval}`;
    const data = this.candleData.get(key) || [];
    if (data.length === 0) return undefined;
    
    const latest = data[data.length - 1];
    return {
      id: randomUUID(),
      symbol,
      interval,
      openTime: new Date(latest.time * 1000),
      closeTime: new Date((latest.time + 60) * 1000), // Assume 1 minute intervals
      open: latest.open,
      high: latest.high,
      low: latest.low,
      close: latest.close,
      volume: latest.volume,
      buyVolume: latest.buyVolume,
      sellVolume: latest.sellVolume,
      delta: latest.delta,
      clusters: latest.clusters,
      createdAt: new Date(),
    };
  }

  async getCandleDataRange(symbol: string, interval: string, startTime: Date, endTime: Date): Promise<CandleData[]> {
    const key = `${symbol}_${interval}`;
    const data = this.candleData.get(key) || [];
    const startTimeMs = startTime.getTime() / 1000;
    const endTimeMs = endTime.getTime() / 1000;
    
    return data.filter(candle => candle.time >= startTimeMs && candle.time <= endTimeMs);
  }
}

export const storage = new MemStorage();
