interface PriceScaleProps {
  priceRange: { min: number; max: number };
  height: number;
}

export default function PriceScale({ priceRange, height }: PriceScaleProps) {
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

  return (
    <div className="absolute right-0 top-0 w-16 h-full bg-transparent pointer-events-none">
      <svg width={64} height={height} className="absolute inset-0">
        {levels.map((level, index) => (
          <g key={index}>
            {/* Горизонтальная линия сетки */}
            <line
              x1={0}
              y1={level.y}
              x2={4}
              y2={level.y}
              stroke="rgba(156, 163, 175, 0.2)"
              strokeWidth="0.5"
            />
            
            {/* Цена */}
            <text
              x={6}
              y={level.y + 3}
              className="fill-zinc-400 text-xs font-mono"
              textAnchor="start"
            >
              {level.price.toFixed(0)}
            </text>
          </g>
        ))}
      </svg>
      
      {/* Градиент для плавного перехода */}
      <div className="absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-transparent to-zinc-950/10" />
    </div>
  );
}