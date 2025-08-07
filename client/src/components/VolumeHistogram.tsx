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
        time: new Date(candle.time * 1000).toLocaleTimeString(),
        totalVolume: candle.volume.toFixed(2),
        buyVolume: candle.buyVolume.toFixed(2),
        sellVolume: candle.sellVolume.toFixed(2),
        delta: candle.delta.toFixed(2),
        bidPercent: ((candle.sellVolume / candle.volume) * 100).toFixed(1),
        askPercent: ((candle.buyVolume / candle.volume) * 100).toFixed(1),
      }, rect.left + rect.width / 2, rect.top);
    }
  }, [onHover]);

  const handleVolumeLeave = useCallback(() => {
    setHoveredIndex(null);
  }, []);
  
  if (candleData.length === 0) return null;

  const maxVolume = Math.max(...candleData.map(c => c.volume));
  const candleSpacing = 60 * zoom;
  const startX = 20 - pan;
  const maxHeight = 60;

  return (
    <div className="absolute bottom-0 left-32 right-20 h-16 border-t border-zinc-700/50">
      {/* Заголовок */}
      <div className="absolute top-0 left-2 text-xs font-medium text-zinc-400">
        Volume
      </div>
      
      <svg className="w-full h-full mt-4">
        {candleData.map((candle, index) => {
          const x = startX + index * candleSpacing;
          const totalHeight = (candle.volume / maxVolume) * (maxHeight - 8);
          const isHovered = hoveredIndex === index;
          
          // Вычисляем пропорции buy/sell для цветовой визуализации
          const bidPercent = candle.sellVolume / candle.volume; // bid = продажи (красный)
          const askPercent = candle.buyVolume / candle.volume;  // ask = покупки (зеленый)
          
          const bidHeight = totalHeight * bidPercent;
          const askHeight = totalHeight * askPercent;
          
          return (
            <g key={index}>
              {/* Фоновая полоса */}
              <rect
                x={x + 3}
                y={60 - totalHeight}
                width={16}
                height={totalHeight}
                fill="rgba(63, 63, 70, 0.3)"
                stroke={isHovered ? "rgba(156, 163, 175, 0.6)" : "transparent"}
                strokeWidth="1"
                className="cursor-pointer transition-all duration-150"
                onMouseEnter={(e) => handleVolumeHover(candle, index, e)}
                onMouseLeave={handleVolumeLeave}
              />
              
              {/* Красная часть (bid/продажи) - снизу */}
              <rect
                x={x + 3}
                y={60 - bidHeight}
                width={16}
                height={bidHeight}
                fill={isHovered ? "rgba(239, 68, 68, 0.8)" : "rgba(239, 68, 68, 0.6)"}
                className="cursor-pointer transition-all duration-150"
                onMouseEnter={(e) => handleVolumeHover(candle, index, e)}
                onMouseLeave={handleVolumeLeave}
              />
              
              {/* Зеленая часть (ask/покупки) - сверху */}
              <rect
                x={x + 3}
                y={60 - totalHeight}
                width={16}
                height={askHeight}
                fill={isHovered ? "rgba(34, 197, 94, 0.8)" : "rgba(34, 197, 94, 0.6)"}
                className="cursor-pointer transition-all duration-150"
                onMouseEnter={(e) => handleVolumeHover(candle, index, e)}
                onMouseLeave={handleVolumeLeave}
              />
              
              {/* Индикатор значительного дисбаланса */}
              {Math.abs(candle.delta / candle.volume) > 0.4 && (
                <circle
                  cx={x + 11}
                  cy={60 - totalHeight - 3}
                  r={1.5}
                  fill={candle.delta > 0 ? "rgba(34, 197, 94, 0.9)" : "rgba(239, 68, 68, 0.9)"}
                  className="animate-pulse"
                />
              )}
            </g>
          );
        })}
        
        {/* Масштабная сетка */}
        <g className="opacity-30">
          <line x1={0} y1={45} x2="100%" y2={45} stroke="rgba(156, 163, 175, 0.2)" strokeWidth="1" strokeDasharray="2,2" />
          <line x1={0} y1={30} x2="100%" y2={30} stroke="rgba(156, 163, 175, 0.2)" strokeWidth="1" strokeDasharray="2,2" />
        </g>
      </svg>
    </div>
  );
}