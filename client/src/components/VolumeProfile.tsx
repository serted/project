import { CandleData } from "@shared/schema";
import { useState, useCallback } from "react";

interface VolumeProfileProps {
  candleData: CandleData[];
  priceRange: { min: number; max: number };
  height: number;
  onHover?: (data: any, x: number, y: number) => void;
}

interface VolumeProfileLevel {
  price: number;
  totalVolume: number;
  buyVolume: number;
  sellVolume: number;
  buyPercent: number;
  sellPercent: number;
}

export default function VolumeProfile({ candleData, priceRange, height, onHover }: VolumeProfileProps) {
  const [hoveredLevel, setHoveredLevel] = useState<number | null>(null);

  const priceToY = (price: number, height: number) => {
    const range = priceRange.max - priceRange.min;
    return height - ((price - priceRange.min) / range) * height;
  };

  // Calculate detailed volume profile data with buy/sell distribution
  const volumeProfile = candleData.reduce((acc, candle) => {
    // Use clusters for more accurate volume distribution
    candle.clusters.forEach(cluster => {
      const priceKey = Math.round(cluster.price / 5) * 5; // 5-unit price grouping for better resolution
      
      if (!acc[priceKey]) {
        acc[priceKey] = {
          price: priceKey,
          totalVolume: 0,
          buyVolume: 0,
          sellVolume: 0,
          buyPercent: 0,
          sellPercent: 0,
        };
      }
      
      acc[priceKey].totalVolume += cluster.volume;
      acc[priceKey].buyVolume += cluster.buyVolume;
      acc[priceKey].sellVolume += cluster.sellVolume;
    });
    return acc;
  }, {} as Record<number, VolumeProfileLevel>);

  // Calculate percentages
  Object.values(volumeProfile).forEach(level => {
    if (level.totalVolume > 0) {
      level.buyPercent = (level.buyVolume / level.totalVolume) * 100;
      level.sellPercent = (level.sellVolume / level.totalVolume) * 100;
    }
  });

  const sortedLevels = Object.values(volumeProfile).sort((a, b) => b.totalVolume - a.totalVolume);
  const maxVolume = sortedLevels[0]?.totalVolume || 1;
  const maxWidth = 120; // Увеличена ширина для лучшей видимости

  const handleLevelHover = useCallback((level: VolumeProfileLevel, event: React.MouseEvent) => {
    setHoveredLevel(level.price);
    if (onHover) {
      const rect = event.currentTarget.getBoundingClientRect();
      onHover({
        type: 'volume_profile',
        price: level.price,
        totalVolume: level.totalVolume,
        buyVolume: level.buyVolume,
        sellVolume: level.sellVolume,
        buyPercent: level.buyPercent.toFixed(1),
        sellPercent: level.sellPercent.toFixed(1),
      }, rect.right, rect.top + rect.height / 2);
    }
  }, [onHover]);

  const handleLevelLeave = useCallback(() => {
    setHoveredLevel(null);
  }, []);

  return (
    <div className="w-32 h-full bg-zinc-900/20 border-r border-zinc-700/50 relative">
      {/* Заголовок */}
      <div className="absolute top-2 left-2 text-xs font-medium text-zinc-400 z-10">
        Volume Profile
      </div>
      
      <svg className="absolute inset-0 w-full h-full mt-6">
        {sortedLevels.map(level => {
          const y = priceToY(level.price, height - 24); // Учитываем заголовок
          const totalWidth = (level.totalVolume / maxVolume) * maxWidth;
          const buyWidth = (level.buyPercent / 100) * totalWidth;
          const sellWidth = (level.sellPercent / 100) * totalWidth;
          const isHovered = hoveredLevel === level.price;
          const barHeight = Math.max(2, Math.min(8, totalWidth / 15)); // Высота зависит от объема
          
          return (
            <g key={level.price}>
              {/* Фоновая полоса */}
              <rect
                x={128 - totalWidth}
                y={y - barHeight / 2}
                width={totalWidth}
                height={barHeight}
                fill="rgba(63, 63, 70, 0.3)"
                stroke={isHovered ? "rgba(156, 163, 175, 0.5)" : "transparent"}
                strokeWidth="1"
                className="cursor-pointer transition-all duration-150"
                onMouseEnter={(e) => handleLevelHover(level, e)}
                onMouseLeave={handleLevelLeave}
              />
              
              {/* Зеленая часть (покупки) */}
              <rect
                x={128 - totalWidth}
                y={y - barHeight / 2}
                width={buyWidth}
                height={barHeight}
                fill={isHovered ? "rgba(34, 197, 94, 0.8)" : "rgba(34, 197, 94, 0.6)"}
                className="cursor-pointer transition-all duration-150"
                onMouseEnter={(e) => handleLevelHover(level, e)}
                onMouseLeave={handleLevelLeave}
              />
              
              {/* Красная часть (продажи) */}
              <rect
                x={128 - totalWidth + buyWidth}
                y={y - barHeight / 2}
                width={sellWidth}
                height={barHeight}
                fill={isHovered ? "rgba(239, 68, 68, 0.8)" : "rgba(239, 68, 68, 0.6)"}
                className="cursor-pointer transition-all duration-150"
                onMouseEnter={(e) => handleLevelHover(level, e)}
                onMouseLeave={handleLevelLeave}
              />
              
              {/* Подсветка для крупных уровней */}
              {level.totalVolume > maxVolume * 0.7 && (
                <line
                  x1={128 - totalWidth - 2}
                  y1={y}
                  x2={130}
                  y2={y}
                  stroke="rgba(251, 191, 36, 0.6)"
                  strokeWidth="1"
                  strokeDasharray="2,2"
                />
              )}
            </g>
          );
        })}
        
        {/* Масштабная линейка снизу */}
        <g className="opacity-60">
          <line x1={10} y1={height - 10} x2={118} y2={height - 10} stroke="rgba(156, 163, 175, 0.3)" strokeWidth="1" />
          <text x={64} y={height - 2} textAnchor="middle" className="fill-zinc-400 text-xs">Volume</text>
        </g>
      </svg>
    </div>
  );
}