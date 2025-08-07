import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { 
  WSMessage, 
  candleDataSchema, 
  orderBookDataSchema, 
  type CandleData,
  type OrderBookData,
  type InsertCandle,
  type InsertOrderBook,
  wsMessageSchema
} from "@shared/schema";
import axios from "axios";
import { TestDataGenerator } from "./testDataGenerator";

// Trading data manager for handling connections and real-time updates
class TradingDataManager {
  private connections = new Set<WebSocket>();
  private subscriptions = new Map<string, Set<WebSocket>>();
  private dataGenerators = new Map<string, TestDataGenerator>();
  private updateIntervals = new Map<string, NodeJS.Timeout>();
  private cacheCleanupInterval: NodeJS.Timeout;
  private useMockData = true; // Use test data instead of Binance API due to restrictions

  constructor() {
    // Generators will be created on-demand to improve startup performance
    console.log('TradingDataManager инициализирован');
    
    // 🧹 Периодическая очистка кэшей
    this.cacheCleanupInterval = setInterval(() => {
      this.dataGenerators.forEach(generator => {
        generator.cleanupCache();
      });
    }, 300000); // Каждые 5 минут
  }

  getOrCreateGenerator(symbol: string): TestDataGenerator {
    if (!this.dataGenerators.has(symbol)) {
      const basePrice = TestDataGenerator.getBasePriceForSymbol(symbol);
      this.dataGenerators.set(symbol, new TestDataGenerator(basePrice));
      console.log(`Создан генератор данных для ${symbol}`);
    }
    return this.dataGenerators.get(symbol)!;
  }

  addConnection(ws: WebSocket) {
    this.connections.add(ws);
    console.log(`Клиент подключен. Всего подключений: ${this.connections.size}`);
  }

  removeConnection(ws: WebSocket) {
    this.connections.delete(ws);
    
    // Clean up subscriptions for this connection
    this.subscriptions.forEach((clients, symbol) => {
      clients.delete(ws);
      if (clients.size === 0) {
        this.stopDataStream(symbol);
      }
    });
    
    console.log(`Клиент отключен. Всего подключений: ${this.connections.size}`);
  }

  subscribeToSymbol(symbol: string, interval: string, ws: WebSocket) {
    const key = `${symbol}_${interval}`;
    
    if (!this.subscriptions.has(key)) {
      this.subscriptions.set(key, new Set());
    }
    
    this.subscriptions.get(key)!.add(ws);
    
    // Start data stream if this is the first subscription
    if (this.subscriptions.get(key)!.size === 1) {
      this.startDataStream(symbol, interval);
    }
    
    console.log(`Подписка на ${symbol} ${interval}. Подписчиков: ${this.subscriptions.get(key)!.size}`);
  }

  private async startDataStream(symbol: string, interval: string) {
    const key = `${symbol}_${interval}`;
    const generator = this.getOrCreateGenerator(symbol);

    // Generate and save initial historical data (reduced for faster startup)
    const historicalCandles = generator.generateHistoricalCandles(50, interval);
    for (const candleData of historicalCandles) {
      const insertCandle: InsertCandle = {
        symbol,
        interval,
        openTime: new Date(candleData.time * 1000),
        closeTime: new Date((candleData.time + TestDataGenerator.getIntervalMs(interval) / 1000) * 1000),
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
      await storage.saveCandleData(insertCandle);
    }

    // 🔄 Smart Refresh - обновления в реальном времени
    const updateInterval = setInterval(async () => {
      if (!this.subscriptions.has(key)) return;

      try {
        // 🔄 Smart Refresh: генератор возвращает null если изменения незначительные
        const candleUpdate = generator.generateRealtimeUpdate(interval);
        if (!candleUpdate) {
          return; // Пропускаем обновление если нет значимых изменений
        }

        const insertCandle: InsertCandle = {
          symbol,
          interval,
          openTime: new Date(candleUpdate.time * 1000),
          closeTime: new Date((candleUpdate.time + TestDataGenerator.getIntervalMs(interval) / 1000) * 1000),
          open: candleUpdate.open,
          high: candleUpdate.high,
          low: candleUpdate.low,
          close: candleUpdate.close,
          volume: candleUpdate.volume,
          buyVolume: candleUpdate.buyVolume,
          sellVolume: candleUpdate.sellVolume,
          delta: candleUpdate.delta,
          clusters: candleUpdate.clusters,
        };
        
        await storage.saveCandleData(insertCandle);

        // 📊 Генерируем стакан с фильтром глубины
        const orderBookData = generator.generateOrderBook(50, true);
        const insertOrderBook: InsertOrderBook = {
          symbol,
          bids: orderBookData.bids,
          asks: orderBookData.asks,
          lastUpdate: new Date(orderBookData.lastUpdate),
        };
        await storage.saveOrderBookData(insertOrderBook);

        // Broadcast updates to subscribed clients
        this.broadcastToSubscribers(key, {
          type: 'candle_update',
          symbol,
          interval,
          data: candleUpdate
        });

        this.broadcastToSubscribers(key, {
          type: 'orderbook_update',
          symbol,
          data: orderBookData
        });

      } catch (error) {
        console.error(`Ошибка обновления данных для ${symbol}:`, error);
      }
    }, Math.min(TestDataGenerator.getIntervalMs(interval), 2000)); // Более частые проверки для Smart Refresh

    this.updateIntervals.set(key, updateInterval);
  }

  private stopDataStream(symbol: string) {
    this.subscriptions.delete(symbol);
    const interval = this.updateIntervals.get(symbol);
    if (interval) {
      clearInterval(interval);
      this.updateIntervals.delete(symbol);
    }
    console.log(`Остановлен поток данных для ${symbol}`);
  }

  private broadcastToSubscribers(subscriptionKey: string, message: any) {
    const clients = this.subscriptions.get(subscriptionKey);
    if (!clients) return;

    const messageStr = JSON.stringify(message);
    
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }

  async getHistoricalData(symbol: string, interval: string, limit: number = 200) {
    try {
      // Get data from storage first
      const cachedCandles = await storage.getCandleData(symbol, interval, limit);
      const cachedOrderBook = await storage.getOrderBookData(symbol);
      
      if (cachedCandles.length > 0) {
        return {
          candles: cachedCandles,
          orderBook: cachedOrderBook,
          symbol,
          interval,
        };
      }

      // Generate test data if no cached data available
      const generator = this.getOrCreateGenerator(symbol);
      const testCandles = generator.generateHistoricalCandles(limit, interval);
      const testOrderBook = generator.generateOrderBook(50, true); // С фильтром глубины
      
      return {
        candles: testCandles,
        orderBook: testOrderBook,
        symbol,
        interval,
      };
      
    } catch (error) {
      console.error('Ошибка получения исторических данных:', error);
      throw error;
    }
  }
}

const tradingManager = new TradingDataManager();

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Add API routes
  app.get("/api/trading/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;
      const interval = (req.query.interval as string) || '1m';
      const limit = parseInt(req.query.limit as string) || 200;
      
      const data = await tradingManager.getHistoricalData(symbol.toUpperCase(), interval, limit);
      res.json(data);
      
    } catch (error) {
      console.error('Ошибка получения торговых данных:', error);
      res.status(500).json({ error: 'Не удалось получить торговые данные' });
    }
  });

  // 🔮 Предварительная загрузка данных
  app.get("/api/preload/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;
      const interval = (req.query.interval as string) || '1m';
      const fromTime = parseInt(req.query.from as string) || (Date.now() / 1000 - 86400);
      const toTime = parseInt(req.query.to as string) || (Date.now() / 1000);
      
      const generator = tradingManager.getOrCreateGenerator(symbol.toUpperCase());
      const preloadedData = generator.preloadHistoricalData(symbol.toUpperCase(), interval, fromTime, toTime);
      
      res.json({ 
        symbol: symbol.toUpperCase(), 
        interval, 
        data: preloadedData, 
        cached: true 
      });
    } catch (error) {
      res.status(500).json({ error: 'Ошибка предварительной загрузки данных' });
    }
  });

  // 📊 Volume Profile API
  app.get("/api/volume-profile/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;
      const timeRange = (req.query.range as string) || '1d';
      
      const generator = tradingManager.getOrCreateGenerator(symbol.toUpperCase());
      const volumeProfile = generator.generateVolumeProfile(timeRange);
      
      res.json({ 
        symbol: symbol.toUpperCase(), 
        timeRange, 
        profile: volumeProfile 
      });
    } catch (error) {
      res.status(500).json({ error: 'Ошибка генерации volume profile' });
    }
  });

  app.get("/api/symbols", (req, res) => {
    res.json({
      symbols: TestDataGenerator.getAvailableSymbols(),
      intervals: TestDataGenerator.INTERVALS,
      orderBookDepths: TestDataGenerator.ORDER_BOOK_DEPTHS
    });
  });
  
  // WebSocket server for real-time trading data
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', async (ws: WebSocket) => {
    console.log('Клиент подключен к WebSocket');
    tradingManager.addConnection(ws);

    // Send connection status
    ws.send(JSON.stringify({
      type: "connection_status",
      data: { connected: true, message: "Подключение к торговому серверу установлено" }
    }));

    // Send initial data for BTCUSDT
    try {
      const initialData = await tradingManager.getHistoricalData('BTCUSDT', '1m', 200);
      
      ws.send(JSON.stringify({
        type: "historical_data",
        symbol: 'BTCUSDT',
        interval: '1m',
        data: initialData.candles
      }));

      if (initialData.orderBook) {
        ws.send(JSON.stringify({
          type: "orderbook_update",
          symbol: 'BTCUSDT',
          data: initialData.orderBook
        }));
      }

    } catch (error) {
      console.error("Ошибка отправки начальных данных:", error);
      ws.send(JSON.stringify({
        type: "error",
        message: "Ошибка загрузки данных"
      }));
    }

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        const validatedMessage = wsMessageSchema.parse(message);
        
        if (validatedMessage.type === 'subscribe' && validatedMessage.symbol) {
          const interval = validatedMessage.interval || '1m';
          tradingManager.subscribeToSymbol(
            validatedMessage.symbol.toUpperCase(), 
            interval, 
            ws
          );
          
          ws.send(JSON.stringify({
            type: "subscription_status",
            symbol: validatedMessage.symbol,
            interval,
            subscribed: true
          }));
        }
      } catch (error) {
        console.error('Некорректное WebSocket сообщение:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Некорректный формат сообщения'
        }));
      }
    });

    ws.on('close', () => {
      tradingManager.removeConnection(ws);
    });

    ws.on('error', (error) => {
      console.error('Ошибка WebSocket:', error);
      tradingManager.removeConnection(ws);
    });
  });

  console.log('WebSocket сервер запущен на пути /ws');
  console.log('API endpoints:');
  console.log('  GET /api/trading/:symbol');
  console.log('  GET /api/symbols');

  return httpServer;
}
