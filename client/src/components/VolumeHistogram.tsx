import { CandleData } from "@shared/schema";
import { useState, useCallback } from "react";

interface VolumeHistogramProps {
  candleData: CandleData[];
  zoom: number;
  pan: number;
  onHover?: (data: any, x: number, y: number) => void;
}

export default function VolumeHistogram({ candleData, zoom, pan, onHover }: VolumeHistogramProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const handleVolumeHover = useCallback((candle: CandleData, index: number, event: React.MouseEvent) => {
    setHoveredIndex(index);
    if (onHover) {
      const rect = event.currentTarget.getBoundingClientRect();
      onHover({
        type: 'volume',
        time: new Date(candle.time * 1000).toLocaleTimeString('ru-RU', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        totalVolume: candle.volume.toFixed(0),
        buyVolume: candle.buyVolume.toFixed(0),
        sellVolume: candle.sellVolume.toFixed(0),
        delta: candle.delta.toFixed(0),
        bidPercent: ((candle.sellVolume / candle.volume) * 100).toFixed(0),
        askPercent: ((candle.buyVolume / candle.volume) * 100).toFixed(0),
      }, rect.left + rect.width / 2, rect.top);
    }
  }, [onHover]);

  const handleVolumeLeave = useCallback(() => {
    setHoveredIndex(null);
  }, []);
  
  if (candleData.length === 0) return null;

  // ИСПРАВЛЕНО: Синхронизация с параметрами свечей
  const maxVolume = Math.max(...candleData.map(c => c.volume));
  const candleSpacing = Math.max(4, 60 * zoom); // Синхронизируем с CandlestickChart
  const candleWidth = Math.max(2, Math.min(candleSpacing * 0.7, 6)); // Точная ширина как у свечи
  const startX = 20 - pan; // Синхронизируем с CandlestickChart
  const maxHeight = 40; // Максимальная высота объемов

  return (
    <div 
      className="absolute bottom-0 left-0 right-0 bg-transparent border-t border-zinc-700/30" 
      style={{ height: maxHeight + 10 }}
      onMouseLeave={handleVolumeLeave}
    >
      <svg width="100%" height={maxHeight + 10} className="overflow-visible">
        {candleData.map((candle, index) => {
          const x = startX + index * candleSpacing;
          const volumeHeight = (candle.volume / maxVolume) * maxHeight;
          
          // Пропорции покупок и продаж
          const buyPercent = candle.buyVolume / candle.volume;
          const sellPercent = candle.sellVolume / candle.volume;
          const buyHeight = volumeHeight * buyPercent;
          const sellHeight = volumeHeight * sellPercent;
          
          // Показывать только если свеча видна на экране
          if (x < -candleWidth || x > window.innerWidth + candleWidth) {
            return null;
          }
          
          return (
            <g key={candle.time}>
              {/* Общий фон полосы - ИСПРАВЛЕНО: точное позиционирование как у свечи */}
              <rect
                x={x}
                y={maxHeight - volumeHeight + 5}
                width={candleWidth}
                height={volumeHeight}
                fill="rgba(63, 63, 70, 0.1)"
                className={hoveredIndex === index ? "opacity-100" : "opacity-50"}
              />
              
              {/* Покупки (зеленая часть снизу) */}
              <rect
                x={x}
                y={maxHeight - buyHeight + 5}
                width={candleWidth}
                height={buyHeight}
                fill={candle.delta > 0 ? "rgba(34, 197, 94, 0.7)" : "rgba(34, 197, 94, 0.5)"}
                className={`transition-opacity ${hoveredIndex === index ? "opacity-100" : "opacity-80"}`}
                onMouseMove={(e) => handleVolumeHover(candle, index, e)}
              />
              
              {/* Продажи (красная часть сверху) */}
              <rect
                x={x}
                y={maxHeight - volumeHeight + 5}
                width={candleWidth}
                height={sellHeight}
                fill={candle.delta < 0 ? "rgba(239, 68, 68, 0.7)" : "rgba(239, 68, 68, 0.5)"}
                className={`transition-opacity ${hoveredIndex === index ? "opacity-100" : "opacity-80"}`}
                onMouseMove={(e) => handleVolumeHover(candle, index, e)}
              />
              
              {/* Дельта индикатор */}
              {Math.abs(candle.delta) > maxVolume * 0.05 && (
                <circle
                  cx={x + candleWidth / 2}
                  cy={maxHeight - volumeHeight - 2}
                  r={1.5}
                  fill={candle.delta > 0 ? "#22c55e" : "#ef4444"}
                  className={hoveredIndex === index ? "opacity-100" : "opacity-90"}
                />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}