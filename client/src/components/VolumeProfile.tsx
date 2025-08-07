import { CandleData } from "@shared/schema";
import { useState, useCallback } from "react";

interface VolumeProfileProps {
  candleData: CandleData[];
  priceRange: { min: number; max: number };
  height: number;
  onHover?: (data: any, x: number, y: number) => void;
}

export default function VolumeProfile({ candleData, priceRange, height, onHover }: VolumeProfileProps) {
  const [hoveredLevel, setHoveredLevel] = useState<number | null>(null);

  const handleMouseMove = useCallback((event: React.MouseEvent, level: any, index: number) => {
    setHoveredLevel(index);
    if (onHover) {
      onHover({
        type: 'volume_profile',
        price: level.price,
        totalVolume: level.totalVolume.toFixed(2),
        buyVolume: level.buyVolume.toFixed(2),
        sellVolume: level.sellVolume.toFixed(2),
        delta: level.delta.toFixed(2),
        buyPercent: level.buyPercent.toFixed(1),
        sellPercent: level.sellPercent.toFixed(1)
      }, event.clientX, event.clientY);
    }
  }, [onHover]);

  const handleMouseLeave = useCallback(() => {
    setHoveredLevel(null);
  }, []);

  if (candleData.length === 0) return null;

  // Минимальная ширина для Volume Profile - 24px
  const profileWidth = 24;
  
  const priceToY = (price: number) => {
    const range = priceRange.max - priceRange.min;
    return height - ((price - priceRange.min) / range) * height;
  };

  // Создаем детальные уровни цен
  const priceLevels = [];
  const levelCount = Math.floor(height / 3); // Каждые 3 пикселя один уровень
  
  for (let i = 0; i < levelCount; i++) {
    const price = priceRange.min + (priceRange.max - priceRange.min) * (i / (levelCount - 1));
    
    let totalVolume = 0;
    let buyVolume = 0;
    let sellVolume = 0;
    
    // Агрегируем объемы из кластеров
    candleData.forEach(candle => {
      candle.clusters?.forEach(cluster => {
        const priceDistance = Math.abs(cluster.price - price);
        const tolerance = (priceRange.max - priceRange.min) / (levelCount * 1.5);
        
        if (priceDistance < tolerance) {
          totalVolume += cluster.volume || 0;
          buyVolume += cluster.buyVolume || 0;
          sellVolume += cluster.sellVolume || 0;
        }
      });
    });
    
    if (totalVolume > 0) {
      const buyPercent = (buyVolume / totalVolume) * 100;
      const sellPercent = (sellVolume / totalVolume) * 100;
      const delta = buyVolume - sellVolume;
      
      priceLevels.push({
        price,
        totalVolume,
        buyVolume,
        sellVolume,
        delta,
        buyPercent,
        sellPercent,
        y: priceToY(price)
      });
    }
  }
  
  const maxVolume = Math.max(...priceLevels.map(level => level.totalVolume), 1);

  return (
    <div 
      className="relative bg-transparent border-r border-zinc-700/30" 
      style={{ width: profileWidth, height }}
      onMouseLeave={handleMouseLeave}
    >
      <svg width={profileWidth} height={height} className="absolute inset-0">
        {priceLevels.map((level, index) => {
          const barWidth = (level.totalVolume / maxVolume) * (profileWidth - 2);
          const buyWidth = (level.buyPercent / 100) * barWidth;
          const sellWidth = (level.sellPercent / 100) * barWidth;
          
          return (
            <g key={index}>
              {/* Фон полосы */}
              <rect
                x={profileWidth - barWidth}
                y={level.y - 1}
                width={barWidth}
                height={2}
                fill="rgba(63, 63, 70, 0.1)"
                className={hoveredLevel === index ? "opacity-100" : "opacity-60"}
                onMouseMove={(e) => handleMouseMove(e, level, index)}
              />
              
              {/* Покупки (зеленый) */}
              <rect
                x={profileWidth - barWidth}
                y={level.y - 1}
                width={buyWidth}
                height={2}
                fill={level.delta > 0 ? "rgba(34, 197, 94, 0.8)" : "rgba(34, 197, 94, 0.5)"}
                className={hoveredLevel === index ? "opacity-100" : "opacity-70"}
                onMouseMove={(e) => handleMouseMove(e, level, index)}
              />
              
              {/* Продажи (красный) */}
              <rect
                x={profileWidth - sellWidth}
                y={level.y - 1}
                width={sellWidth}
                height={2}
                fill={level.delta < 0 ? "rgba(239, 68, 68, 0.8)" : "rgba(239, 68, 68, 0.5)"}
                className={hoveredLevel === index ? "opacity-100" : "opacity-70"}
                onMouseMove={(e) => handleMouseMove(e, level, index)}
              />
              
              {/* Дельта индикатор */}
              {Math.abs(level.delta) > maxVolume * 0.1 && (
                <circle
                  cx={profileWidth - 2}
                  cy={level.y}
                  r={1}
                  fill={level.delta > 0 ? "#22c55e" : "#ef4444"}
                  className={hoveredLevel === index ? "opacity-100" : "opacity-80"}
                />
              )}
            </g>
          );
        })}
      </svg>
      
      {/* Градиент для плавного перехода */}
      <div className="absolute inset-y-0 right-0 w-1 bg-gradient-to-r from-transparent to-zinc-950/20" />
    </div>
  );
}