import { CandleData, Cluster } from "@shared/schema";

export function calculatePriceRange(candleData: CandleData[]): { min: number; max: number } {
  if (candleData.length === 0) return { min: 0, max: 100000 };

  const allPrices = candleData.flatMap(candle => [candle.low, candle.high]);
  return {
    min: Math.min(...allPrices),
    max: Math.max(...allPrices),
  };
}

export function formatPrice(price: number): string {
  return price.toFixed(2);
}

export function formatVolume(volume: number): string {
  if (volume >= 1000) {
    return `${(volume / 1000).toFixed(1)}K`;
  }
  return volume.toFixed(2);
}

export function formatTime(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleTimeString();
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString();
}

export function calculateVolumeProfile(candleData: CandleData[], priceLevels: number = 100) {
  if (candleData.length === 0) return [];

  const priceRange = calculatePriceRange(candleData);
  const priceStep = (priceRange.max - priceRange.min) / priceLevels;
  
  const levels = new Map<number, { totalVolume: number; buyVolume: number; sellVolume: number }>();

  candleData.forEach(candle => {
    candle.clusters.forEach(cluster => {
      const priceLevel = Math.floor((cluster.price - priceRange.min) / priceStep) * priceStep + priceRange.min;
      
      const existing = levels.get(priceLevel) || { totalVolume: 0, buyVolume: 0, sellVolume: 0 };
      
      existing.totalVolume += cluster.volume;
      existing.buyVolume += cluster.buyVolume;
      existing.sellVolume += cluster.sellVolume;
      
      levels.set(priceLevel, existing);
    });
  });

  return Array.from(levels.entries()).map(([price, data]) => ({
    price,
    ...data,
  })).sort((a, b) => b.price - a.price);
}

export function getClusterColor(cluster: Cluster, isHovered: boolean = false): string {
  const isGreen = cluster.delta > 0;
  const intensity = Math.min(Math.abs(cluster.aggression), 1);
  const opacity = isHovered ? 0.9 : Math.max(0.3, intensity * 0.8);
  
  return isGreen 
    ? `rgba(38, 166, 154, ${opacity})` 
    : `rgba(239, 83, 80, ${opacity})`;
}

export function getClusterWidth(cluster: Cluster, maxVolume: number, maxWidth: number = 20): number {
  if (maxVolume === 0) return 3;
  return Math.max(3, (cluster.volume / maxVolume) * maxWidth);
}

export function findLargestCluster(clusters: Cluster[]): Cluster | null {
  if (clusters.length === 0) return null;
  return clusters.reduce((largest, current) => 
    current.volume > largest.volume ? current : largest
  );
}

export function priceToY(price: number, priceRange: { min: number; max: number }, height: number): number {
  const range = priceRange.max - priceRange.min;
  if (range === 0) return height / 2;
  return height - ((price - priceRange.min) / range) * height;
}

export function yToPrice(y: number, priceRange: { min: number; max: number }, height: number): number {
  const range = priceRange.max - priceRange.min;
  return priceRange.min + ((height - y) / height) * range;
}
