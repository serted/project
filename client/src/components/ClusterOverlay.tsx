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

  // ИСПРАВЛЕНО: Кластеры на всю ширину свечи и высоту, минимальное расстояние
  const candleSpacing = Math.max(4, 60 * zoom); // Синхронизируем с CandlestickChart
  const candleWidth = Math.max(2, Math.min(candleSpacing * 0.7, 6)); // Ширина как у свечи
  const startX = 20 - pan; // Синхронизируем с CandlestickChart

  return (
    <div className="absolute inset-0 pointer-events-none">
      <svg width="100%" height="100%" className="overflow-visible">
        {candleData.map((candle, candleIndex) => {
          const x = startX + candleIndex * candleSpacing;
          
          // Показывать только если свеча видна на экране
          if (x < -candleWidth || x > window.innerWidth + candleWidth) {
            return null;
          }

          // Находим максимальный объем для этой свечи
          const maxVolumeInCandle = Math.max(...(candle.clusters?.map(c => c.volume) || [1]));
          
          return (
            <g key={candle.time}>
              {candle.clusters?.map((cluster, clusterIndex) => {
                const clusterY = priceToY(cluster.price, window.innerHeight - 100);
                
                // ИСПРАВЛЕНО: кластер прикреплён с правой стороны свечи, на всю ширину
                const clusterX = x + candleWidth; // Начинается справа от свечи
                const volumeOpacity = cluster.volume / maxVolumeInCandle;
                
                // Пропорции покупок и продаж
                const buyPercent = cluster.buyVolume / cluster.volume;
                const sellPercent = cluster.sellVolume / cluster.volume;
                const buyWidth = candleWidth * buyPercent;
                const sellWidth = candleWidth * sellPercent;
                
                const isHovered = hoveredCluster?.candleIndex === candleIndex && 
                                hoveredCluster?.clusterIndex === clusterIndex;
                
                // Проверяем, является ли этот кластер самым объёмным в свече
                const isHighestVolume = cluster.volume === maxVolumeInCandle;
                
                return (
                  <g key={`${candle.time}-${cluster.price}`}>
                    {/* Фон кластера - справа от свечи */}
                    <rect
                      x={clusterX}
                      y={clusterY - 1}
                      width={candleWidth}
                      height={2}
                      fill="rgba(63, 63, 70, 0.1)"
                      opacity={volumeOpacity * 0.5}
                      className={`pointer-events-auto cursor-crosshair ${
                        isHovered ? "opacity-100" : ""
                      } ${isHighestVolume ? "stroke-zinc-400" : ""}`}
                      strokeWidth={isHighestVolume ? "0.5" : "0"}
                      onMouseMove={(e) => handleClusterHover(cluster, candleIndex, clusterIndex, e)}
                      onMouseLeave={handleClusterLeave}
                    />
                    
                    {/* Покупки (зеленый слой) */}
                    <rect
                      x={clusterX}
                      y={clusterY - 1}
                      width={buyWidth}
                      height={2}
                      fill={cluster.delta > 0 ? "rgba(34, 197, 94, 0.8)" : "rgba(34, 197, 94, 0.6)"}
                      opacity={volumeOpacity * 0.8}
                      className={`pointer-events-auto cursor-crosshair ${
                        isHovered ? "opacity-100" : ""
                      }`}
                      onMouseMove={(e) => handleClusterHover(cluster, candleIndex, clusterIndex, e)}
                      onMouseLeave={handleClusterLeave}
                    />
                    
                    {/* Продажи (красный слой) */}
                    <rect
                      x={clusterX + buyWidth}
                      y={clusterY - 1}
                      width={sellWidth}
                      height={2}
                      fill={cluster.delta < 0 ? "rgba(239, 68, 68, 0.8)" : "rgba(239, 68, 68, 0.6)"}
                      opacity={volumeOpacity * 0.8}
                      className={`pointer-events-auto cursor-crosshair ${
                        isHovered ? "opacity-100" : ""
                      }`}
                      onMouseMove={(e) => handleClusterHover(cluster, candleIndex, clusterIndex, e)}
                      onMouseLeave={handleClusterLeave}
                    />
                    
                    {/* Граница для кластера с самым высоким объёмом */}
                    {isHighestVolume && (
                      <rect
                        x={clusterX}
                        y={clusterY - 1}
                        width={candleWidth}
                        height={2}
                        fill="none"
                        stroke="rgba(156, 163, 175, 0.8)"
                        strokeWidth="0.5"
                        className={`pointer-events-auto cursor-crosshair ${
                          isHovered ? "opacity-100" : "opacity-70"
                        }`}
                        onMouseMove={(e) => handleClusterHover(cluster, candleIndex, clusterIndex, e)}
                        onMouseLeave={handleClusterLeave}
                      />
                    )}
                    
                    {/* Агрессивность индикатор */}
                    {cluster.aggression > 0.7 && (
                      <circle
                        cx={clusterX + candleWidth + 2}
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