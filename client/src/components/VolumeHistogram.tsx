import { CandleData } from "@shared/schema";

interface VolumeHistogramProps {
  candleData: CandleData[];
  zoom: number;
  pan: number;
}

export default function VolumeHistogram({ candleData, zoom, pan }: VolumeHistogramProps) {
  if (candleData.length === 0) return null;

  const maxVolume = Math.max(...candleData.map(c => c.volume));
  const candleSpacing = 60 * zoom;
  const startX = 20 - pan;
  const maxHeight = 60;

  return (
    <div className="absolute bottom-0 left-0 w-full h-16 pointer-events-none">
      <svg className="w-full h-full">
        {candleData.map((candle, index) => {
          const x = startX + index * candleSpacing;
          const height = (candle.volume / maxVolume) * maxHeight;
          const isGreen = candle.close >= candle.open;
          
          return (
            <rect
              key={index}
              x={x + 5}
              y={64 - height}
              width={12}
              height={height}
              fill={isGreen ? 'rgba(74, 222, 128, 0.6)' : 'rgba(248, 113, 113, 0.6)'}
              stroke={isGreen ? 'rgba(74, 222, 128, 0.8)' : 'rgba(248, 113, 113, 0.8)'}
              strokeWidth="0.5"
            />
          );
        })}
      </svg>
    </div>
  );
}