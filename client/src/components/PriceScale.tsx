interface PriceScaleProps {
  priceRange: { min: number; max: number };
  height: number;
  currentPrice?: number; // ДОБАВЛЕНО: текущая цена
  onPriceScroll?: (delta: number) => void; // ДОБАВЛЕНО: обработчик скроллинга
}

export default function PriceScale({ priceRange, height, currentPrice, onPriceScroll }: PriceScaleProps) {
  const priceToY = (price: number) => {
    const range = priceRange.max - priceRange.min;
    if (range === 0 || isNaN(range) || !isFinite(range)) return height / 2;
    const y = height - ((price - priceRange.min) / range) * height;
    return isNaN(y) || !isFinite(y) ? height / 2 : y;
  };

  // Создаем оптимальное количество ценовых уровней с защитой от NaN
  const levels = [];
  const safeHeight = isNaN(height) || !isFinite(height) || height <= 0 ? 400 : height;
  const levelCount = Math.min(12, Math.floor(safeHeight / 35)); // Каждые 35px один уровень
  
  const range = priceRange.max - priceRange.min;
  if (range > 0 && isFinite(range) && isFinite(priceRange.min)) {
    for (let i = 0; i <= levelCount; i++) {
      const price = priceRange.min + range * (i / (levelCount || 1));
      const y = priceToY(price);
      
      if (isFinite(price) && isFinite(y)) {
        levels.push({ price, y });
      }
    }
  }

  // ДОБАВЛЕНО: обработчик скроллинга для изменения диапазона цен
  const handleWheel = (e: React.WheelEvent) => {
    if (onPriceScroll) {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY > 0 ? 1 : -1;
      onPriceScroll(delta);
    }
  };

  return (
    <div 
      className="absolute right-0 top-0 w-16 h-full bg-transparent pointer-events-auto cursor-ns-resize"
      onWheel={handleWheel}
    >
      <svg width={64} height={height} className="absolute inset-0">
        {levels.map((level, index) => {
          // ДОБАВЛЕНО: проверка на текущую цену
          const isCurrentPrice = currentPrice && Math.abs(level.price - currentPrice) < (priceRange.max - priceRange.min) * 0.01;
          
          return (
            <g key={index}>
              {/* Горизонтальная линия сетки */}
              <line
                x1={0}
                y1={level.y}
                x2={isCurrentPrice ? 8 : 4}
                y2={level.y}
                stroke={isCurrentPrice ? "rgba(59, 130, 246, 0.6)" : "rgba(156, 163, 175, 0.2)"}
                strokeWidth={isCurrentPrice ? "1" : "0.5"}
              />
              
              {/* Цена */}
              <text
                x={6}
                y={level.y + 3}
                className={isCurrentPrice ? "fill-blue-400 text-sm font-bold font-mono" : "fill-zinc-400 text-xs font-mono"}
                textAnchor="start"
              >
                {level.price.toFixed(0)}
              </text>
            </g>
          );
        })}
        
        {/* ДОБАВЛЕНО: Отдельный элемент для текущей цены */}
        {currentPrice && (
          <g>
            <rect
              x={0}
              y={priceToY(currentPrice) - 10}
              width={64}
              height={20}
              fill="rgba(59, 130, 246, 0.1)"
              stroke="rgba(59, 130, 246, 0.3)"
              strokeWidth="0.5"
              rx="2"
            />
            <text
              x={6}
              y={priceToY(currentPrice) + 4}
              className="fill-blue-300 text-sm font-bold font-mono"
              textAnchor="start"
            >
              ${currentPrice.toFixed(2)}
            </text>
          </g>
        )}
      </svg>
      
      {/* Градиент для плавного перехода */}
      <div className="absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-transparent to-zinc-950/10" />
    </div>
  );
}