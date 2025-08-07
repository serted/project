import { CandleData, Cluster, OrderBookData, OrderBookLevel } from "@shared/schema";

/**
 * Расширенный движок кластерного анализа
 * Реализует концепции из архитектуры: Smart Refresh, Adaptive Cluster Size, Depth Filter
 */
export class ClusterEngine {
  private atrCache = new Map<string, number>();
  private lastProcessedPrice = new Map<string, number>();
  private clusterCache = new Map<string, { data: CandleData[], timestamp: number }>();
  private readonly CACHE_TTL = 60000; // 1 минута
  private readonly PRICE_CHANGE_THRESHOLD = 0.0005; // 0.05% изменение для обновления

  /**
   * 📊 Adaptive Cluster Size - шаг кластеров зависит от ATR
   */
  calculateATR(candles: CandleData[], period: number = 14): number {
    if (candles.length < 2) return 0.001; // Базовое значение

    const trueRanges: number[] = [];
    
    for (let i = 1; i < Math.min(candles.length, period + 1); i++) {
      const current = candles[i];
      const previous = candles[i - 1];
      
      const tr1 = current.high - current.low;
      const tr2 = Math.abs(current.high - previous.close);
      const tr3 = Math.abs(current.low - previous.close);
      
      trueRanges.push(Math.max(tr1, tr2, tr3));
    }

    return trueRanges.reduce((sum, tr) => sum + tr, 0) / trueRanges.length;
  }

  /**
   * 🔄 Smart Refresh - обновление только при значимом изменении цены
   */
  shouldRefreshClusters(symbol: string, currentPrice: number): boolean {
    const lastPrice = this.lastProcessedPrice.get(symbol);
    if (!lastPrice) {
      this.lastProcessedPrice.set(symbol, currentPrice);
      return true;
    }

    const priceChange = Math.abs(currentPrice - lastPrice) / lastPrice;
    if (priceChange > this.PRICE_CHANGE_THRESHOLD) {
      this.lastProcessedPrice.set(symbol, currentPrice);
      return true;
    }

    return false;
  }

  /**
   * 🧠 Enhanced Cluster Generation with ATR-based sizing
   */
  generateAdaptiveClusters(
    low: number, 
    high: number, 
    totalVolume: number, 
    totalBuyVolume: number, 
    totalSellVolume: number,
    atr: number,
    currentPrice: number
  ): Cluster[] {
    // Адаптивный размер кластера на основе ATR
    const baseClusterSize = atr * 0.5; // 50% от ATR
    const priceRange = high - low;
    const optimalClusters = Math.max(5, Math.min(25, Math.floor(priceRange / baseClusterSize)));
    
    const clusters: Cluster[] = [];
    const step = priceRange / optimalClusters;

    for (let i = 0; i < optimalClusters; i++) {
      const price = low + (step * i) + (step / 2);
      
      // Умный расчет важности уровня
      const distanceFromCurrent = Math.abs(price - currentPrice);
      const distanceFromMiddle = Math.abs(price - (high + low) / 2);
      
      // Комбинированная важность: близость к текущей цене + центр диапазона
      const currentPriceWeight = 1 / (1 + distanceFromCurrent / currentPrice);
      const middleWeight = 1 - (distanceFromMiddle / (priceRange / 2));
      const importance = (currentPriceWeight * 0.6 + middleWeight * 0.4);
      
      // Распределение объема с учетом важности и случайности
      const volumeMultiplier = importance * (0.7 + Math.random() * 0.6);
      const volume = (totalVolume / optimalClusters) * volumeMultiplier;
      
      // Интеллектуальное распределение покупок/продаж
      const baseRatio = totalBuyVolume / totalVolume;
      const pricePosition = (price - low) / priceRange; // 0-1
      
      // Покупки чаще внизу диапазона, продажи - вверху
      const positionBias = pricePosition < 0.5 ? (1 - pricePosition) * 0.2 : -pricePosition * 0.2;
      const buyRatio = Math.max(0.1, Math.min(0.9, baseRatio + positionBias + (Math.random() - 0.5) * 0.1));
      
      const buyVolume = volume * buyRatio;
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

    return clusters.sort((a, b) => b.volume - a.volume);
  }

  /**
   * 🔮 Predictive Preload - предварительная генерация данных
   */
  preloadHistoricalClusters(
    symbol: string, 
    interval: string, 
    fromTime: number, 
    toTime: number
  ): CandleData[] {
    const cacheKey = `${symbol}_${interval}_${fromTime}_${toTime}`;
    const cached = this.clusterCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    // Здесь будет логика загрузки исторических данных
    // Для демонстрации возвращаем пустой массив
    const data: CandleData[] = [];
    this.clusterCache.set(cacheKey, { data, timestamp: Date.now() });
    
    return data;
  }

  /**
   * 📈 Enhanced Single Candle with Adaptive Clustering
   */
  generateEnhancedCandle(
    time: number, 
    startPrice: number, 
    interval: string,
    historicalCandles: CandleData[] = []
  ): CandleData {
    // Рассчитываем ATR на основе исторических данных
    const atr = this.calculateATR(historicalCandles);
    
    // Генерируем базовую свечу
    const volatility = Math.max(0.005, atr / startPrice * 2); // Волатильность на основе ATR
    const trend = (Math.random() - 0.5) * 0.005; // Небольшой тренд
    
    const open = startPrice;
    const priceChange = startPrice * (trend + (Math.random() - 0.5) * volatility);
    const close = Math.max(open + priceChange, 1);
    
    // Генерируем high/low с учетом ATR
    const atrMultiplier = 0.5 + Math.random();
    const wickRange = atr * atrMultiplier;
    
    const high = Math.max(open, close) + Math.random() * wickRange;
    const low = Math.min(open, close) - Math.random() * wickRange;

    // Объем коррелирован с волатильностью
    const baseVolume = 50 + Math.random() * 150;
    const volatilityMultiplier = 1 + Math.abs(priceChange / startPrice) * 20;
    const volume = baseVolume * volatilityMultiplier;

    // Распределение покупок/продаж
    const isGreen = close > open;
    const buyRatio = isGreen ? 0.55 + Math.random() * 0.25 : 0.25 + Math.random() * 0.3;
    const buyVolume = volume * buyRatio;
    const sellVolume = volume - buyVolume;
    const delta = buyVolume - sellVolume;

    // Адаптивные кластеры с учетом ATR
    const clusters = this.generateAdaptiveClusters(
      low, high, volume, buyVolume, sellVolume, atr, close
    );

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

  /**
   * 📊 Depth Filter - фильтрация стакана по динамической глубине
   */
  filterDepth(
    orderBook: OrderBookData, 
    centerPrice: number, 
    rangePercent: number = 2
  ): OrderBookData {
    const minPrice = centerPrice * (1 - rangePercent / 100);
    const maxPrice = centerPrice * (1 + rangePercent / 100);
    
    const filteredBids = orderBook.bids
      .filter(level => level.price >= minPrice && level.price <= centerPrice)
      .sort((a, b) => b.price - a.price) // Сортируем по убыванию для бидов
      .slice(0, 50); // Максимум 50 уровней
    
    const filteredAsks = orderBook.asks
      .filter(level => level.price <= maxPrice && level.price >= centerPrice)
      .sort((a, b) => a.price - b.price) // Сортируем по возрастанию для асков
      .slice(0, 50); // Максимум 50 уровней

    return {
      bids: filteredBids,
      asks: filteredAsks,
      lastUpdate: orderBook.lastUpdate,
    };
  }

  /**
   * 🧹 Cache Management
   */
  cleanupCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    this.clusterCache.forEach((value, key) => {
      if (now - value.timestamp > this.CACHE_TTL) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.clusterCache.delete(key));
  }

  /**
   * 📊 Volume Profile Generation
   */
  generateVolumeProfile(
    candles: CandleData[], 
    priceLevels: number = 50
  ): Array<{ price: number; volume: number; buyVolume: number; sellVolume: number }> {
    if (!candles.length) return [];

    const minPrice = Math.min(...candles.map(c => c.low));
    const maxPrice = Math.max(...candles.map(c => c.high));
    const priceStep = (maxPrice - minPrice) / priceLevels;
    
    const profile = Array.from({ length: priceLevels }, (_, i) => ({
      price: minPrice + (priceStep * i) + (priceStep / 2),
      volume: 0,
      buyVolume: 0,
      sellVolume: 0,
    }));

    // Агрегируем объемы по уровням цен
    candles.forEach(candle => {
      candle.clusters?.forEach(cluster => {
        const levelIndex = Math.floor((cluster.price - minPrice) / priceStep);
        if (levelIndex >= 0 && levelIndex < priceLevels) {
          profile[levelIndex].volume += cluster.volume;
          profile[levelIndex].buyVolume += cluster.buyVolume;
          profile[levelIndex].sellVolume += cluster.sellVolume;
        }
      });
    });

    return profile.filter(level => level.volume > 0);
  }

  /**
   * 🔄 Update ATR Cache
   */
  updateATRCache(symbol: string, candles: CandleData[]): void {
    const atr = this.calculateATR(candles);
    this.atrCache.set(symbol, atr);
  }

  /**
   * 📈 Get Cached ATR
   */
  getCachedATR(symbol: string): number {
    return this.atrCache.get(symbol) || 0.001;
  }
}