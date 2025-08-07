import { CandleData, Cluster, OrderBookData, OrderBookLevel } from "@shared/schema";
import { ClusterEngine } from "./clusterEngine";

export class TestDataGenerator {
  private currentPrice: number = 67500;
  private currentTime: number = Math.floor(Date.now() / 1000);
  private priceHistory: number[] = [];
  private clusterEngine = new ClusterEngine();
  private historicalCandles: CandleData[] = [];

  // Binance available intervals
  static readonly INTERVALS = [
    '1s', '1m', '3m', '5m', '15m', '30m', '1h', 
    '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w', '1M'
  ];

  // Order book depth options
  static readonly ORDER_BOOK_DEPTHS = [5, 10, 20, 50, 100, 500, 1000, 5000];

  constructor(initialPrice: number = 67500) {
    this.currentPrice = initialPrice;
    this.priceHistory = Array.from({ length: 100 }, () => this.currentPrice);
  }

  generateHistoricalCandles(count: number = 100, interval: string = '1m'): CandleData[] {
    const candles: CandleData[] = [];
    let time = this.currentTime - (count * this.getIntervalInSeconds(interval));
    let price = this.currentPrice * (0.95 + Math.random() * 0.1); // Start within ±5%

    for (let i = 0; i < count; i++) {
      const candle = this.generateSingleCandle(time, price, interval);
      candles.push(candle);
      
      price = candle.close;
      time += this.getIntervalInSeconds(interval);
    }

    this.currentTime = time;
    this.currentPrice = price;
    return candles;
  }

  generateSingleCandle(time: number, startPrice: number, interval: string = '1m'): CandleData {
    // 🧠 Используем расширенный движок кластерного анализа
    const candle = this.clusterEngine.generateEnhancedCandle(
      time, 
      startPrice, 
      interval, 
      this.historicalCandles
    );
    
    // Сохраняем для истории (последние 100 свечей)
    this.historicalCandles.push(candle);
    if (this.historicalCandles.length > 100) {
      this.historicalCandles.shift();
    }
    
    return candle;
  }

  // 📊 Генерация кластеров теперь делегируется ClusterEngine
  generateClusters(low: number, high: number, totalVolume: number, totalBuyVolume: number, totalSellVolume: number): Cluster[] {
    const atr = this.clusterEngine.getCachedATR('BTCUSDT');
    const currentPrice = (low + high) / 2;
    
    return this.clusterEngine.generateAdaptiveClusters(
      low, high, totalVolume, totalBuyVolume, totalSellVolume, atr, currentPrice
    );
  }

  generateOrderBook(depth: number = 20, applyDepthFilter: boolean = true): OrderBookData {
    const spread = this.currentPrice * 0.0001; // 0.01% spread
    const bidPrice = this.currentPrice - spread / 2;
    const askPrice = this.currentPrice + spread / 2;

    const bids: OrderBookLevel[] = [];
    const asks: OrderBookLevel[] = [];

    // Generate bids (decreasing prices)
    for (let i = 0; i < depth; i++) {
      const price = bidPrice - (i * spread * 0.1);
      const volume = (10 + Math.random() * 50) * (1 - i * 0.05); // Decreasing volume with distance
      bids.push({ price, volume });
    }

    // Generate asks (increasing prices)
    for (let i = 0; i < depth; i++) {
      const price = askPrice + (i * spread * 0.1);
      const volume = (10 + Math.random() * 50) * (1 - i * 0.05); // Decreasing volume with distance
      asks.push({ price, volume });
    }

    const orderBook = {
      bids,
      asks,
      lastUpdate: Date.now(),
    };

    // 📊 Применяем фильтр глубины стакана
    if (applyDepthFilter) {
      return this.clusterEngine.filterDepth(orderBook, this.currentPrice, 1.5); // ±1.5%
    }
    
    return orderBook;
  }

  updateCurrentPrice(newPrice: number): void {
    this.currentPrice = newPrice;
    this.priceHistory.push(newPrice);
    if (this.priceHistory.length > 1000) {
      this.priceHistory.shift();
    }
  }

  simulatePriceMovement(): number {
    // Simulate realistic price movement
    const volatility = 0.001; // 0.1% per update
    const meanReversion = 0.1; // Tendency to revert to recent average
    
    const recentAverage = this.priceHistory.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const meanReversionForce = (recentAverage - this.currentPrice) / this.currentPrice * meanReversion;
    
    const randomWalk = (Math.random() - 0.5) * volatility;
    const priceChange = meanReversionForce + randomWalk;
    
    this.currentPrice = Math.max(this.currentPrice * (1 + priceChange), 1);
    this.updateCurrentPrice(this.currentPrice);
    
    return this.currentPrice;
  }

  generateRealtimeUpdate(interval: string = '1m'): CandleData | null {
    const newPrice = this.simulatePriceMovement();
    
    // 🔄 Smart Refresh - обновляем только при значимом изменении цены
    if (!this.clusterEngine.shouldRefreshClusters('BTCUSDT', newPrice)) {
      return null; // Не обновляем, если изменение незначительное
    }
    
    const candle = this.generateSingleCandle(this.currentTime, newPrice, interval);
    
    // Обновляем ATR кэш
    this.clusterEngine.updateATRCache('BTCUSDT', this.historicalCandles);
    
    return candle;
  }

  private getIntervalInSeconds(interval: string): number {
    const value = parseInt(interval);
    const unit = interval.slice(-1);
    
    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      case 'w': return value * 604800;
      case 'M': return value * 2629746; // Approximate month
      default: return 60; // Default to 1 minute
    }
  }

  static getIntervalMs(interval: string): number {
    const generator = new TestDataGenerator();
    return generator.getIntervalInSeconds(interval) * 1000;
  }

  // Generate realistic symbol data
  static getAvailableSymbols(): string[] {
    return [
      'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'SOLUSDT',
      'XRPUSDT', 'DOTUSDT', 'DOGEUSDT', 'AVAXUSDT', 'MATICUSDT',
      'LINKUSDT', 'LTCUSDT', 'BCHUSDT', 'XLMUSDT', 'VETUSDT'
    ];
  }

  // Get realistic base prices for different symbols
  // 🔮 Предварительная загрузка исторических данных
  preloadHistoricalData(symbol: string, interval: string, fromTime: number, toTime: number): CandleData[] {
    return this.clusterEngine.preloadHistoricalClusters(symbol, interval, fromTime, toTime);
  }

  // 📈 Генерация Volume Profile
  generateVolumeProfile(timeRange: string = '1d'): Array<{price: number; volume: number; buyVolume: number; sellVolume: number}> {
    const relevantCandles = this.getRelevantCandles(timeRange);
    return this.clusterEngine.generateVolumeProfile(relevantCandles);
  }

  private getRelevantCandles(timeRange: string): CandleData[] {
    const now = Date.now() / 1000;
    let timeRangeSeconds: number;
    
    switch (timeRange) {
      case '1h': timeRangeSeconds = 3600; break;
      case '4h': timeRangeSeconds = 14400; break;
      case '1d': timeRangeSeconds = 86400; break;
      case '1w': timeRangeSeconds = 604800; break;
      default: timeRangeSeconds = 86400;
    }
    
    const cutoffTime = now - timeRangeSeconds;
    return this.historicalCandles.filter(candle => candle.time >= cutoffTime);
  }

  // 🧹 Очистка кэша
  cleanupCache(): void {
    this.clusterEngine.cleanupCache();
  }

  static getBasePriceForSymbol(symbol: string): number {
    const basePrices: Record<string, number> = {
      'BTCUSDT': 67500,
      'ETHUSDT': 3200,
      'BNBUSDT': 420,
      'ADAUSDT': 0.85,
      'SOLUSDT': 180,
      'XRPUSDT': 0.58,
      'DOTUSDT': 8.5,
      'DOGEUSDT': 0.15,
      'AVAXUSDT': 42,
      'MATICUSDT': 1.2,
      'LINKUSDT': 16,
      'LTCUSDT': 95,
      'BCHUSDT': 380,
      'XLMUSDT': 0.12,
      'VETUSDT': 0.035,
    };
    
    return basePrices[symbol] || 100;
  }
}