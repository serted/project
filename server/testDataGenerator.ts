import { CandleData, Cluster, OrderBookData, OrderBookLevel } from "@shared/schema";

export class TestDataGenerator {
  private currentPrice: number = 67500;
  private currentTime: number = Math.floor(Date.now() / 1000);
  private priceHistory: number[] = [];

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
    // Generate realistic price movement
    const volatility = 0.02; // 2% volatility
    const trend = (Math.random() - 0.5) * 0.01; // Small trend bias
    
    const open = startPrice;
    const priceChange = startPrice * (trend + (Math.random() - 0.5) * volatility);
    const close = Math.max(open + priceChange, 1); // Prevent negative prices
    
    // Generate high and low with realistic wicks
    const bodyRange = Math.abs(close - open);
    const wickRange = bodyRange * (0.5 + Math.random() * 1.5); // Wicks can extend beyond body
    
    const high = Math.max(open, close) + Math.random() * wickRange;
    const low = Math.min(open, close) - Math.random() * wickRange;

    // Generate volume with some randomness
    const baseVolume = 100 + Math.random() * 200; // Base volume between 100-300 BTC
    const volumeMultiplier = 1 + Math.abs(priceChange / startPrice) * 10; // Higher volume with bigger moves
    const volume = baseVolume * volumeMultiplier;

    // Generate buy/sell distribution
    const isGreenCandle = close > open;
    const buyRatio = isGreenCandle ? 0.55 + Math.random() * 0.2 : 0.25 + Math.random() * 0.3;
    const buyVolume = volume * buyRatio;
    const sellVolume = volume * (1 - buyRatio);
    const delta = buyVolume - sellVolume;

    // Generate clusters
    const clusters = this.generateClusters(low, high, volume, buyVolume, sellVolume);

    return {
      time,
      open,
      high,
      low,
      close,
      volume,
      buyVolume,
      sellVolume,
      delta,
      clusters,
    };
  }

  generateClusters(low: number, high: number, totalVolume: number, totalBuyVolume: number, totalSellVolume: number): Cluster[] {
    const numClusters = Math.min(20, Math.max(5, Math.floor((high - low) / (low * 0.0002)))); // Adaptive cluster count
    const priceStep = (high - low) / numClusters;
    const clusters: Cluster[] = [];

    for (let i = 0; i < numClusters; i++) {
      const price = low + (priceStep * i) + (priceStep / 2); // Center of price range
      
      // Distribute volume based on price level importance
      const distanceFromMiddle = Math.abs(price - (low + high) / 2);
      const maxDistance = (high - low) / 2;
      const importance = 1 - (distanceFromMiddle / maxDistance); // Higher importance near middle
      
      // Add some randomness but keep realistic distribution
      const volumeMultiplier = (importance * 0.7 + Math.random() * 0.3) * (0.5 + Math.random());
      const volume = (totalVolume / numClusters) * volumeMultiplier;
      
      // Distribute buy/sell within cluster
      const buyRatio = (totalBuyVolume / totalVolume) * (0.8 + Math.random() * 0.4); // Add some variation
      const buyVolume = volume * Math.min(buyRatio, 1);
      const sellVolume = volume - buyVolume;
      
      const delta = buyVolume - sellVolume;
      const aggression = volume > 0 ? Math.abs(delta) / volume : 0;

      clusters.push({
        price,
        volume,
        buyVolume,
        sellVolume,
        delta,
        aggression,
      });
    }

    // Sort by volume (largest first) for UI highlighting
    return clusters.sort((a, b) => b.volume - a.volume);
  }

  generateOrderBook(depth: number = 20): OrderBookData {
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

    return {
      bids,
      asks,
      lastUpdate: Date.now(),
    };
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

  generateRealtimeUpdate(interval: string = '1m'): CandleData {
    const newPrice = this.simulatePriceMovement();
    return this.generateSingleCandle(this.currentTime, newPrice, interval);
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