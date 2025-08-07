import { sql } from "drizzle-orm";
import { pgTable, text, varchar, real, integer, timestamp, jsonb, boolean, index, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Trading data types
export const clusterSchema = z.object({
  price: z.number(),
  volume: z.number(),
  buyVolume: z.number(),
  sellVolume: z.number(),
  delta: z.number(),
  aggression: z.number(),
});

export const candleDataSchema = z.object({
  time: z.number(), // Unix timestamp
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number(),
  buyVolume: z.number(),
  sellVolume: z.number(),
  delta: z.number(),
  clusters: z.array(clusterSchema),
});

export const orderBookLevelSchema = z.object({
  price: z.number(),
  volume: z.number(),
});

export const orderBookDataSchema = z.object({
  bids: z.array(orderBookLevelSchema),
  asks: z.array(orderBookLevelSchema),
  lastUpdate: z.number(),
});

export const volumeProfileLevelSchema = z.object({
  price: z.number(),
  totalVolume: z.number(),
  buyVolume: z.number(),
  sellVolume: z.number(),
});

export const tradingStateSchema = z.object({
  symbol: z.string(),
  isConnected: z.boolean(),
  lastUpdate: z.number(),
  currentPrice: z.number(),
  priceChange: z.number(),
  priceChangePercent: z.number(),
});

// Types
export type Cluster = z.infer<typeof clusterSchema>;
export type CandleData = z.infer<typeof candleDataSchema>;
export type OrderBookLevel = z.infer<typeof orderBookLevelSchema>;
export type OrderBookData = z.infer<typeof orderBookDataSchema>;
export type VolumeProfileLevel = z.infer<typeof volumeProfileLevelSchema>;
export type TradingState = z.infer<typeof tradingStateSchema>;

// WebSocket message types
export const wsMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("candle_update"),
    symbol: z.string().optional(),
    interval: z.string().optional(),
    data: candleDataSchema,
  }),
  z.object({
    type: z.literal("orderbook_update"),
    symbol: z.string().optional(),
    data: orderBookDataSchema,
  }),
  z.object({
    type: z.literal("trade_update"),
    symbol: z.string().optional(),
    data: z.object({
      price: z.number(),
      volume: z.number(),
      isBuyerMaker: z.boolean(),
      timestamp: z.number(),
    }),
  }),
  z.object({
    type: z.literal("connection_status"),
    data: z.object({
      connected: z.boolean(),
      message: z.string().optional(),
    }),
  }),
  z.object({
    type: z.literal("historical_data"),
    symbol: z.string().optional(),
    interval: z.string().optional(),
    data: z.array(candleDataSchema),
  }),
  z.object({
    type: z.literal("subscribe"),
    symbol: z.string(),
    interval: z.string().optional(),
  }),
  z.object({
    type: z.literal("unsubscribe"),
    symbol: z.string(),
    interval: z.string().optional(),
  }),
  z.object({
    type: z.literal("subscription_status"),
    symbol: z.string(),
    interval: z.string().optional(),
    subscribed: z.boolean(),
  }),
  z.object({
    type: z.literal("error"),
    message: z.string(),
  }),
]);

export type WSMessage = z.infer<typeof wsMessageSchema>;

// Database tables for trading data
export const candles = pgTable("candles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  symbol: text("symbol").notNull(),
  interval: text("interval").notNull(),
  openTime: timestamp("open_time").notNull(),
  closeTime: timestamp("close_time").notNull(),
  open: real("open").notNull(),
  high: real("high").notNull(),
  low: real("low").notNull(),
  close: real("close").notNull(),
  volume: real("volume").notNull(),
  buyVolume: real("buy_volume").notNull(),
  sellVolume: real("sell_volume").notNull(),
  delta: real("delta").notNull(),
  clusters: jsonb("clusters").$type<Cluster[]>().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  symbolIntervalTimeIdx: index("candles_symbol_interval_time_idx").on(table.symbol, table.interval, table.openTime),
  uniqueSymbolIntervalTime: index("candles_unique_symbol_interval_time").on(table.symbol, table.interval, table.openTime),
}));

export const orderBooks = pgTable("order_books", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  symbol: text("symbol").notNull(),
  bids: jsonb("bids").$type<OrderBookLevel[]>().notNull(),
  asks: jsonb("asks").$type<OrderBookLevel[]>().notNull(),
  lastUpdate: timestamp("last_update").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  symbolTimeIdx: index("order_books_symbol_time_idx").on(table.symbol, table.lastUpdate),
}));

export const trades = pgTable("trades", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  symbol: text("symbol").notNull(),
  tradeId: text("trade_id").notNull(),
  price: real("price").notNull(),
  quantity: real("quantity").notNull(),
  time: timestamp("time").notNull(),
  isBuyerMaker: boolean("is_buyer_maker").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  symbolTimeIdx: index("trades_symbol_time_idx").on(table.symbol, table.time),
  tradeIdIdx: index("trades_trade_id_idx").on(table.tradeId),
}));

export const connectionMetrics = pgTable("connection_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  activeConnections: integer("active_connections").notNull(),
  lastActivity: timestamp("last_activity").notNull(),
  symbol: text("symbol").notNull(),
  interval: text("interval").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  timeIdx: index("connection_metrics_time_idx").on(table.lastActivity),
}));

// Drizzle schemas for validation
export const insertCandleSchema = createInsertSchema(candles).omit({
  id: true,
  createdAt: true,
});

export const insertOrderBookSchema = createInsertSchema(orderBooks).omit({
  id: true,
  createdAt: true,
});

export const insertTradeSchema = createInsertSchema(trades).omit({
  id: true,
  createdAt: true,
});

export const insertConnectionMetricSchema = createInsertSchema(connectionMetrics).omit({
  id: true,
  createdAt: true,
});

// Types
export type InsertCandle = z.infer<typeof insertCandleSchema>;
export type InsertOrderBook = z.infer<typeof insertOrderBookSchema>;
export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type InsertConnectionMetric = z.infer<typeof insertConnectionMetricSchema>;

export type DbCandle = typeof candles.$inferSelect;
export type DbOrderBook = typeof orderBooks.$inferSelect;
export type DbTrade = typeof trades.$inferSelect;
export type DbConnectionMetric = typeof connectionMetrics.$inferSelect;

// User preferences (if needed later)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
