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
          
          // Кластерная область - покрывает всю высоту свечи включая тени
          const highY = priceToY(candle.high, window.innerHeight - 100);
          const lowY = priceToY(candle.low, window.innerHeight - 100);
          const clusterAreaHeight = lowY - highY;
          const clusterX = x + candleWidth; // Справа от свечи
          const clusterWidth = candleWidth * 0.8; // Чуть уже свечи
          
          return (
            <g key={candle.time}>
                  {/* Фон кластерной области - полная высота свечи */}
                  <rect
                    x={clusterX}
                    y={highY}
                    width={clusterWidth}
                    height={clusterAreaHeight}
                    fill="rgba(63, 63, 70, 0.05)"
                    stroke="rgba(113, 113, 122, 0.2)"
                    strokeWidth="0.5"
                    className="pointer-events-none"
                  />
                  
                  {/* Отдельные кластеры по ценовым уровням */}
                  {candle.clusters?.map((cluster, clusterIndex) => {
                    const clusterY = priceToY(cluster.price, window.innerHeight - 100);
                    const volumeOpacity = Math.max(0.3, cluster.volume / maxVolumeInCandle);
                    
                    // Пропорции покупок и продаж
                    const buyPercent = cluster.buyVolume / cluster.volume;
                    const sellPercent = cluster.sellVolume / cluster.volume;
                    const buyWidth = clusterWidth * buyPercent;
                    const sellWidth = clusterWidth * sellPercent;
                    
                    const isHovered = hoveredCluster?.candleIndex === candleIndex && 
                                    hoveredCluster?.clusterIndex === clusterIndex;
                    
                    // Проверяем, является ли этот кластер самым объёмным в свече
                    const isHighestVolume = cluster.volume === maxVolumeInCandle;
                    
                    // Высота кластера пропорциональна объему
                    const clusterHeight = Math.max(1, Math.min(8, (cluster.volume / maxVolumeInCandle) * 6));
                    
                    return (
                      <g key={`${candle.time}-${cluster.price}`}>
                        {/* Фон уровня кластера */}
                        <rect
                          x={clusterX}
                          y={clusterY - clusterHeight/2}
                          width={clusterWidth}
                          height={clusterHeight}
                          fill="rgba(63, 63, 70, 0.1)"
                          opacity={volumeOpacity * 0.3}
                          className={`pointer-events-auto cursor-crosshair ${
                            isHovered ? "opacity-100" : ""
                          }`}
                          onMouseMove={(e) => handleClusterHover(cluster, candleIndex, clusterIndex, e)}
                          onMouseLeave={handleClusterLeave}
                        />
                        
                        {/* Покупки (зеленый слой) */}
                        {buyWidth > 0 && (
                          <rect
                            x={clusterX}
                            y={clusterY - clusterHeight/2}
                            width={buyWidth}
                            height={clusterHeight}
                            fill={cluster.delta > 0 ? "rgba(34, 197, 94, 0.9)" : "rgba(34, 197, 94, 0.7)"}
                            opacity={volumeOpacity}
                            className={`pointer-events-auto cursor-crosshair ${
                              isHovered ? "opacity-100 brightness-110" : ""
                            }`}
                            onMouseMove={(e) => handleClusterHover(cluster, candleIndex, clusterIndex, e)}
                            onMouseLeave={handleClusterLeave}
                          />
                        )}
                        
                        {/* Продажи (красный слой) */}
                        {sellWidth > 0 && (
                          <rect
                            x={clusterX + buyWidth}
                            y={clusterY - clusterHeight/2}
                            width={sellWidth}
                            height={clusterHeight}
                            fill={cluster.delta < 0 ? "rgba(239, 68, 68, 0.9)" : "rgba(239, 68, 68, 0.7)"}
                            opacity={volumeOpacity}
                            className={`pointer-events-auto cursor-crosshair ${
                              isHovered ? "opacity-100 brightness-110" : ""
                            }`}
                            onMouseMove={(e) => handleClusterHover(cluster, candleIndex, clusterIndex, e)}
                            onMouseLeave={handleClusterLeave}
                          />
                        )}
                        
                        {/* Граница для кластера с самым высоким объёмом */}
                        {isHighestVolume && (
                          <rect
                            x={clusterX - 0.5}
                            y={clusterY - clusterHeight/2 - 0.5}
                            width={clusterWidth + 1}
                            height={clusterHeight + 1}
                            fill="none"
                            stroke="rgba(156, 163, 175, 0.9)"
                            strokeWidth="1"
                            className={`pointer-events-auto cursor-crosshair ${
                              isHovered ? "opacity-100" : "opacity-80"
                            }`}
                            onMouseMove={(e) => handleClusterHover(cluster, candleIndex, clusterIndex, e)}
                            onMouseLeave={handleClusterLeave}
                          />
                        )}
                        
                        {/* Агрессивность индикатор */}
                        {cluster.aggression > 0.7 && (
                          <circle
                            cx={clusterX + clusterWidth + 3}
                            cy={clusterY}
                            r={2}
                            fill="#facc15"
                            stroke="rgba(0,0,0,0.3)"
                            strokeWidth="0.5"
                            className={`pointer-events-none ${
                              isHovered ? "opacity-100" : "opacity-90"
                            }`}
                          />
                        )}
                        
                        {/* Индикатор дельты для значительных дисбалансов */}
                        {Math.abs(cluster.delta) > maxVolumeInCandle * 0.3 && (
                          <rect
                            x={clusterX + clusterWidth + 1}
                            y={clusterY - 0.5}
                            width={2}
                            height={1}
                            fill={cluster.delta > 0 ? "#22c55e" : "#ef4444"}
                            opacity="0.8"
                            className="pointer-events-none"
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