import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { CandleData, OrderBookData } from '@shared/schema';
import VolumeProfile from './VolumeProfile';
import CandlestickChart from './CandlestickChart';
import ClusterOverlay from './ClusterOverlay';
import VolumeHistogram from './VolumeHistogram';
import OrderBook from './OrderBook';
import PriceScale from './PriceScale';
import PeriodSelector from './PeriodSelector';
import VolumeProfileControls from './VolumeProfileControls';
import Tooltip from './Tooltip';
import Crosshair from './Crosshair';

interface TradingChartProps {
  candleData: CandleData[];
  orderBookData: OrderBookData;
  isConnected: boolean;
  currentInterval: string;
  onIntervalChange: (interval: string) => void;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  data: any;
}

interface CrosshairState {
  visible: boolean;
  x: number;
  y: number;
  price: number;
  time: number; // ИСПРАВЛЕНО: время как число (Unix timestamp)
}

export default function TradingChart({ 
  candleData, 
  orderBookData, 
  isConnected,
  currentInterval,
  onIntervalChange
}: TradingChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, data: null });
  const [volumeProfileTimeRange, setVolumeProfileTimeRange] = useState('1d'); // ДОБАВЛЕНО: диапазон времени для Volume Profile
  const [crosshair, setCrosshair] = useState<CrosshairState>({ 
    visible: false, 
    x: 0, 
    y: 0, 
    price: 0, 
    time: 0 // ИСПРАВЛЕНО: время как число
  });

  // Вычисляем ценовой диапазон с защитой от пустых данных
  const priceRange = useMemo(() => {
    if (candleData.length === 0) {
      return { min: 0, max: 100 }; // Значения по умолчанию
    }
    const lows = candleData.map(c => c.low).filter(val => !isNaN(val) && isFinite(val));
    const highs = candleData.map(c => c.high).filter(val => !isNaN(val) && isFinite(val));
    
    const min = Math.min(...lows) * 0.999;
    const max = Math.max(...highs) * 1.001;
    
    return {
      min: isNaN(min) || !isFinite(min) ? 0 : min,
      max: isNaN(max) || !isFinite(max) ? 100 : max
    };
  }, [candleData]);

  const priceToY = (price: number, height: number) => {
    const range = priceRange.max - priceRange.min;
    return height - ((price - priceRange.min) / range) * height;
  };

  const yToPrice = (y: number, height: number) => {
    const range = priceRange.max - priceRange.min;
    return priceRange.min + ((height - y) / height) * range;
  };

  // Обработка мыши для масштабирования и панорамирования
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    if (e.ctrlKey || e.metaKey) {
      // Масштабирование
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(prev => Math.max(0.1, Math.min(prev * zoomFactor, 5)));
    } else {
      // Панорамирование
      const panSpeed = 20;
      setPan(prev => prev + (e.deltaY > 0 ? panSpeed : -panSpeed));
    }
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) { // Левая кнопка мыши
      setIsDragging(true);
      setDragStart(e.clientX + pan);
    }
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = chartRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const price = yToPrice(y, rect.height);
    
    // ИСПРАВЛЕНО: Вычисляем время на основе позиции мыши и данных свечей
    const candleSpacing = Math.max(4, 60 * zoom);
    const startX = 20 - pan;
    const candleIndex = Math.floor((x - startX) / candleSpacing);
    const currentTime = candleData[candleIndex]?.time || Date.now() / 1000;

    // Обновляем crosshair
    setCrosshair({
      visible: true,
      x,
      y,
      price,
      time: currentTime
    });

    // Панорамирование при перетаскивании
    if (isDragging) {
      const newPan = dragStart - e.clientX;
      setPan(newPan);
      
      // ДОБАВЛЕНО: Загрузка исторических данных при движении к истории
      if (newPan > pan + 100) { // Если скроллим в сторону истории
        // Здесь можно добавить логику загрузки исторических данных
        // через REST API или WebSocket
        console.log('Loading historical data...');
      }
    }
  }, [isDragging, dragStart, yToPrice, pan]);

  const handleMouseLeave = useCallback(() => {
    setCrosshair(prev => ({ ...prev, visible: false }));
    setTooltip(prev => ({ ...prev, visible: false }));
    setIsDragging(false);
  }, []);

  const handleGlobalMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [handleGlobalMouseUp]);

  return (
    <div className="flex h-full bg-zinc-950 relative">
      {/* Панель управления сверху */}
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

      {/* Volume Profile слева (минимальная ширина) */}
      <VolumeProfile 
        candleData={candleData}
        priceRange={priceRange}
        height={chartRef.current?.offsetHeight || 400}
        timeRange={volumeProfileTimeRange}
        onHover={(data, x, y) => setTooltip({ visible: true, x, y, data })}
      />

      {/* Контролы для Volume Profile */}
      <VolumeProfileControls
        currentTimeRange={volumeProfileTimeRange}
        onTimeRangeChange={setVolumeProfileTimeRange}
      />

      {/* Основная область графика */}
      <div 
        ref={chartRef}
        className="flex-1 relative overflow-hidden cursor-crosshair"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Сетка */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
          {[...Array(10)].map((_, i) => {
            const y = (i / 9) * 100;
            return (
              <line
                key={i}
                x1="0"
                y1={`${y}%`}
                x2="100%"
                y2={`${y}%`}
                stroke="rgba(113, 113, 122, 0.1)"
                strokeWidth="0.5"
              />
            );
          })}
        </svg>

        {/* Свечи */}
        <CandlestickChart 
          candleData={candleData}
          priceRange={priceRange}
          zoom={zoom}
          pan={pan}
        />

        {/* Кластеры */}
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

        {/* Volume Histogram внизу */}
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

        {/* Price Scale справа */}
        <PriceScale 
          priceRange={priceRange}
          height={chartRef.current?.offsetHeight || 400}
          currentPrice={candleData[candleData.length - 1]?.close}
          onPriceScroll={(delta) => {
            // ДОБАВЛЕНО: обработчик изменения диапазона цен при скроллинге
            const range = priceRange.max - priceRange.min;
            const center = (priceRange.max + priceRange.min) / 2;
            const zoomFactor = delta > 0 ? 1.1 : 0.9;
            const newRange = range * zoomFactor;
            // Можно добавить логику изменения диапазона, если требуется
          }}
        />
      </div>

      {/* OrderBook справа */}
      <OrderBook 
        orderBookData={orderBookData}
        priceRange={priceRange}
      />
    </div>
  );
}