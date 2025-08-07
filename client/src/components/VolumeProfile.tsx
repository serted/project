import { CandleData } from "@shared/schema";

interface VolumeProfileProps {
  candleData: CandleData[];
  priceRange: { min: number; max: number };
  height: number;
}

export default function VolumeProfile({ candleData, priceRange, height }: VolumeProfileProps) {
  const priceToY = (price: number, height: number) => {
    const range = priceRange.max - priceRange.min;
    return height - ((price - priceRange.min) / range) * height;
  };

  // Calculate volume profile data
  const volumeProfile = candleData.reduce((acc, candle) => {
    const priceLevels = [candle.open, candle.high, candle.low, candle.close];
    priceLevels.forEach(price => {
      const rounded = Math.round(price / 10) * 10;
      acc[rounded] = (acc[rounded] || 0) + candle.volume / 4;
    });
    return acc;
  }, {} as Record<number, number>);

  const maxVolume = Math.max(...Object.values(volumeProfile));
  const maxWidth = 80;

  return (
    <div className="w-20 h-full bg-zinc-900/30 border-r border-zinc-800 relative">
      <svg className="absolute inset-0 w-full h-full">
        {Object.entries(volumeProfile).map(([priceStr, volume]) => {
          const price = parseFloat(priceStr);
          const y = priceToY(price, height);
          const width = (volume / maxVolume) * maxWidth;
          
          return (
            <rect
              key={price}
              x={20 - width}
              y={y - 2}
              width={width}
              height={4}
              fill="rgba(74, 222, 128, 0.3)"
              stroke="rgba(74, 222, 128, 0.5)"
              strokeWidth="0.5"
            />
          );
        })}
      </svg>
    </div>
  );
}