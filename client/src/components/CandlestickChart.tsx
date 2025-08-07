import { CandleData } from "@shared/schema";
import { useRef, useEffect } from "react";

interface CandlestickChartProps {
  candleData: CandleData[];
  priceRange: { min: number; max: number };
  zoom: number;
  pan: number;
  onClusterHover?: (data: any, x: number, y: number) => void;
}

export default function CandlestickChart({ 
  candleData, 
  priceRange, 
  zoom, 
  pan,
  onClusterHover 
}: CandlestickChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const priceToY = (price: number, height: number) => {
    const range = priceRange.max - priceRange.min;
    return height - ((price - priceRange.min) / range) * height;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || candleData.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * devicePixelRatio;
    canvas.height = rect.height * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);

    // ИСПРАВЛЕНО: Тонкие и лаконичные свечи, минимальное расстояние
    const candleSpacing = Math.max(4, 60 * zoom); // Минимум 4px между свечами
    const candleWidth = Math.max(2, Math.min(candleSpacing * 0.7, 6)); // Тоньше свечи, максимум 6px
    const startX = 20 - pan;

    candleData.forEach((candle, index) => {
      const x = startX + index * candleSpacing;
      
      // Skip if candle is outside visible area
      if (x < -candleSpacing || x > rect.width + candleSpacing) return;

      const openY = priceToY(candle.open, rect.height);
      const highY = priceToY(candle.high, rect.height);
      const lowY = priceToY(candle.low, rect.height);
      const closeY = priceToY(candle.close, rect.height);

      const isGreen = candle.close >= candle.open;
      const bodyHeight = Math.abs(closeY - openY);
      const bodyTop = Math.min(openY, closeY);

      // Draw wick (тень)
      ctx.strokeStyle = isGreen ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)';
      ctx.lineWidth = Math.max(0.5, candleWidth / 8);
      ctx.beginPath();
      ctx.moveTo(x + candleWidth / 2, highY);
      ctx.lineTo(x + candleWidth / 2, lowY);
      ctx.stroke();

      // Draw body (тело)
      if (bodyHeight > 0.5) {
        ctx.fillStyle = isGreen ? 'rgba(34, 197, 94, 0.9)' : 'rgba(239, 68, 68, 0.9)';
        ctx.fillRect(x, bodyTop, candleWidth, Math.max(bodyHeight, 1));
        
        // Граница тела для четкости
        ctx.strokeStyle = isGreen ? 'rgba(34, 197, 94, 1)' : 'rgba(239, 68, 68, 1)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x, bodyTop, candleWidth, bodyHeight);
      } else {
        // Doji или малое тело - рисуем линию
        ctx.strokeStyle = isGreen ? 'rgba(34, 197, 94, 1)' : 'rgba(239, 68, 68, 1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, openY);
        ctx.lineTo(x + candleWidth, closeY);
        ctx.stroke();
      }
    });
  }, [candleData, priceRange, zoom, pan]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 3 }}
    />
  );
}
