import { useState, useCallback, useRef, useEffect } from "react";
import { CandleData, OrderBookData } from "@shared/schema";
import CandlestickChart from "./CandlestickChart";
import ClusterOverlay from "./ClusterOverlay";
import VolumeProfile from "./VolumeProfile";
import VolumeHistogram from "./VolumeHistogram";
import OrderBook from "./OrderBook";
import Crosshair from "./Crosshair";
import Tooltip from "./Tooltip";
import PeriodSelector from "./PeriodSelector";

interface TradingChartProps {
  candleData: CandleData[];
  orderBookData: OrderBookData;
  isConnected: boolean;
  currentInterval: string;
  onIntervalChange: (interval: string) => void;
}

interface CrosshairState {
  x: number;
  y: number;
  visible: boolean;
  price: number;
  time: number;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  data: any;
}

export default function TradingChart({ 
  candleData, 
  orderBookData, 
  isConnected, 
  currentInterval, 
  onIntervalChange 
}: TradingChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [crosshair, setCrosshair] = useState<CrosshairState>({
    x: 0,
    y: 0,
    visible: false,
    price: 0,
    time: 0,
  });
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    data: null,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState(0);

  // Calculate price range for the chart
  const priceRange = candleData.length > 0 ? {
    min: Math.min(...candleData.map(d => d.low)),
    max: Math.max(...candleData.map(d => d.high)),
  } : { min: 0, max: 100000 };

  const priceToY = useCallback((price: number, height: number) => {
    const range = priceRange.max - priceRange.min;
    return height - ((price - priceRange.min) / range) * height;
  }, [priceRange]);

  const yToPrice = useCallback((y: number, height: number) => {
    const range = priceRange.max - priceRange.min;
    return priceRange.min + ((height - y) / height) * range;
  }, [priceRange]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!chartRef.current) return;

    const rect = chartRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const price = yToPrice(y, rect.height);
    
    // Calculate time based on x position
    const candleWidth = 60; // Base candle width
    const candleIndex = Math.floor((x - 80) / candleWidth); // Account for volume profile width
    const time = candleData[candleIndex]?.time || 0;

    setCrosshair({
      x,
      y,
      visible: true,
      price,
      time,
    });
  }, [yToPrice, candleData]);

  const handleMouseLeave = useCallback(() => {
    setCrosshair(prev => ({ ...prev, visible: false }));
    setTooltip(prev => ({ ...prev, visible: false }));
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    if (e.ctrlKey) {
      // Zoom
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(prev => Math.max(0.5, Math.min(3, prev * zoomFactor)));
    } else {
      // Pan horizontally
      const panDelta = e.deltaY * 2;
      setPan(prev => prev + panDelta);
    }
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDragging(false);
    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  return (
    <div className="flex h-full bg-zinc-950">
      {/* Top Controls Bar */}
      <div className="absolute top-2 left-2 z-50 flex gap-4 items-center">
        <PeriodSelector 
          currentInterval={currentInterval}
          onIntervalChange={onIntervalChange}
        />
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-xs text-zinc-400">
            {isConnected ? 'Подключено' : 'Отключено'}
          </span>
        </div>
      </div>

      {/* Left Volume Profile */}
      <VolumeProfile 
        candleData={candleData}
        priceRange={priceRange}
        height={400}
        onHover={(data, x, y) => setTooltip({ visible: true, x, y, data })}
      />

      {/* Main Chart Area */}
      <div 
        ref={chartRef}
        className="flex-1 relative bg-zinc-950 cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      >
        {/* Grid */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
          <defs>
            <pattern id="grid" width="40" height="20" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 20" fill="none" stroke="hsl(240, 5%, 15%)" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Price Lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 2 }}>
          {[...Array(10)].map((_, i) => {
            const price = priceRange.min + (priceRange.max - priceRange.min) * (i / 9);
            const y = priceToY(price, chartRef.current?.offsetHeight || 400);
            return (
              <line
                key={i}
                x1="0"
                y1={y}
                x2="100%"
                y2={y}
                stroke="hsl(240, 5%, 20%)"
                strokeWidth="0.5"
              />
            );
          })}
        </svg>

        {/* Candlestick Chart */}
        <CandlestickChart 
          candleData={candleData}
          priceRange={priceRange}
          zoom={zoom}
          pan={pan}
          onClusterHover={(data, x, y) => setTooltip({ visible: true, x, y, data })}
        />

        {/* Cluster Overlay */}
        <ClusterOverlay 
          candleData={candleData}
          priceRange={priceRange}
          zoom={zoom}
          pan={pan}
          onClusterHover={(data, x, y) => setTooltip({ visible: true, x, y, data })}
        />

        {/* Crosshair */}
        <Crosshair 
          x={crosshair.x}
          y={crosshair.y}
          visible={crosshair.visible}
          price={crosshair.price}
          time={crosshair.time}
        />

        {/* Volume Histogram */}
        <VolumeHistogram 
          candleData={candleData}
          zoom={zoom}
          pan={pan}
          onHover={(data, x, y) => setTooltip({ visible: true, x, y, data })}
        />

        {/* Tooltip */}
        <Tooltip 
          visible={tooltip.visible}
          x={tooltip.x}
          y={tooltip.y}
          data={tooltip.data}
        />

        {/* Price Scale */}
        <div className="absolute right-0 top-0 w-20 h-full bg-zinc-900/50 border-l border-zinc-800">
          <div className="relative h-full">
            {[...Array(10)].map((_, i) => {
              const price = priceRange.min + (priceRange.max - priceRange.min) * ((9 - i) / 9);
              const y = (i / 9) * 100;
              return (
                <div
                  key={i}
                  className="absolute right-2 text-xs text-zinc-400 font-mono"
                  style={{ top: `${y}%`, transform: 'translateY(-50%)' }}
                >
                  {price.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right OrderBook */}
      <div className="w-48 relative">
        <OrderBook 
          orderBookData={orderBookData}
          priceRange={priceRange}
        />
        
        {/* Масштабная линейка снизу */}
        <div className="absolute bottom-2 left-2 right-2 h-2 bg-zinc-800/30 rounded">
          <div className="w-4/5 h-full bg-zinc-600/50 rounded"></div>
        </div>
      </div>
    </div>
  );
}
