import { CandleData } from "@shared/schema";
import { useState, useCallback } from "react";

interface ClusterOverlayProps {
  candleData: CandleData[];
  priceRange: { min: number; max: number };
  zoom: number;
  pan: number;
  onClusterHover?: (data: any, x: number, y: number) => void;
}

export default function ClusterOverlay({ candleData, priceRange, zoom, pan, onClusterHover }: ClusterOverlayProps) {
  const [hoveredCluster, setHoveredCluster] = useState<{candleIndex: number, clusterIndex: number} | null>(null);

  const handleClusterHover = useCallback((cluster: any, candleIndex: number, clusterIndex: number, event: React.MouseEvent) => {
    setHoveredCluster({ candleIndex, clusterIndex });
    if (onClusterHover) {
      onClusterHover({
        type: 'cluster',
        price: cluster.price,
        volume: cluster.volume,
        buyVolume: cluster.buyVolume,
        sellVolume: cluster.sellVolume,
        delta: cluster.delta,
        aggression: cluster.aggression
      }, event.clientX, event.clientY);
    }
  }, [onClusterHover]);

  const handleClusterLeave = useCallback(() => {
    setHoveredCluster(null);
  }, []);

  if (candleData.length === 0) return null;

  const priceToY = (price: number, height: number) => {
    const range = priceRange.max - priceRange.min;
    return height - ((price - priceRange.min) / range) * height;
  };

  // Параметры для кластеров
  const candleSpacing = Math.max(2, 60 * zoom);
  const clusterWidth = 20; // Фиксированная ширина кластера
  const startX = 80 - pan;

  return (
    <div className="absolute inset-0 pointer-events-none">
      <svg width="100%" height="100%" className="overflow-visible">
        {candleData.map((candle, candleIndex) => {
          const x = startX + candleIndex * candleSpacing;
          
          // Показывать только если свеча видна на экране
          if (x < -clusterWidth || x > window.innerWidth + clusterWidth) {
            return null;
          }

          // Находим максимальный объем для этой свечи
          const maxVolumeInCandle = Math.max(...(candle.clusters?.map(c => c.volume) || [1]));
          
          return (
            <g key={candle.time}>
              {candle.clusters?.map((cluster, clusterIndex) => {
                const clusterY = priceToY(cluster.price, window.innerHeight - 100);
                const volumeWidth = (cluster.volume / maxVolumeInCandle) * clusterWidth;
                
                // Пропорции покупок и продаж
                const buyPercent = cluster.buyVolume / cluster.volume;
                const sellPercent = cluster.sellVolume / cluster.volume;
                const buyWidth = volumeWidth * buyPercent;
                const sellWidth = volumeWidth * sellPercent;
                
                const isHovered = hoveredCluster?.candleIndex === candleIndex && 
                                hoveredCluster?.clusterIndex === clusterIndex;
                
                return (
                  <g key={`${candle.time}-${cluster.price}`}>
                    {/* Фон кластера */}
                    <rect
                      x={x}
                      y={clusterY - 1}
                      width={volumeWidth}
                      height={2}
                      fill="rgba(63, 63, 70, 0.1)"
                      className={`pointer-events-auto cursor-crosshair ${
                        isHovered ? "opacity-100" : "opacity-50"
                      }`}
                      onMouseMove={(e) => handleClusterHover(cluster, candleIndex, clusterIndex, e)}
                      onMouseLeave={handleClusterLeave}
                    />
                    
                    {/* Покупки (зеленый слой) */}
                    <rect
                      x={x}
                      y={clusterY - 1}
                      width={buyWidth}
                      height={2}
                      fill={cluster.delta > 0 ? "rgba(34, 197, 94, 0.8)" : "rgba(34, 197, 94, 0.6)"}
                      className={`pointer-events-auto cursor-crosshair ${
                        isHovered ? "opacity-100" : "opacity-75"
                      }`}
                      onMouseMove={(e) => handleClusterHover(cluster, candleIndex, clusterIndex, e)}
                      onMouseLeave={handleClusterLeave}
                    />
                    
                    {/* Продажи (красный слой) */}
                    <rect
                      x={x + buyWidth}
                      y={clusterY - 1}
                      width={sellWidth}
                      height={2}
                      fill={cluster.delta < 0 ? "rgba(239, 68, 68, 0.8)" : "rgba(239, 68, 68, 0.6)"}
                      className={`pointer-events-auto cursor-crosshair ${
                        isHovered ? "opacity-100" : "opacity-75"
                      }`}
                      onMouseMove={(e) => handleClusterHover(cluster, candleIndex, clusterIndex, e)}
                      onMouseLeave={handleClusterLeave}
                    />
                    
                    {/* Агрессивность индикатор */}
                    {cluster.aggression > 0.7 && (
                      <circle
                        cx={x + volumeWidth + 2}
                        cy={clusterY}
                        r={1.5}
                        fill="#facc15"
                        className={`pointer-events-auto ${
                          isHovered ? "opacity-100" : "opacity-80"
                        }`}
                      />
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
}