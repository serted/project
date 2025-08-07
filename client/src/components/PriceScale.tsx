interface PriceScaleProps {
  priceRange: { min: number; max: number };
  height: number;
}

export default function PriceScale({ priceRange, height }: PriceScaleProps) {
  const priceToY = (price: number, height: number) => {
    const range = priceRange.max - priceRange.min;
    return height - ((price - priceRange.min) / range) * height;
  };

  return (
    <div className="w-16 h-full border-l border-zinc-700/50 relative">
      <svg className="w-full h-full">
        {[...Array(10)].map((_, i) => {
          const price = priceRange.min + (priceRange.max - priceRange.min) * (i / 9);
          const y = priceToY(price, height);
          
          return (
            <g key={i}>
              {/* Горизонтальная линия */}
              <line
                x1={0}
                y1={y}
                x2={4}
                y2={y}
                stroke="rgba(156, 163, 175, 0.4)"
                strokeWidth="1"
              />
              
              {/* Цена */}
              <text
                x={8}
                y={y + 3}
                className="fill-zinc-400 text-xs font-mono"
                textAnchor="start"
              >
                {price.toFixed(0)}
              </text>
            </g>
          );
        })}
      </svg>
      
      {/* Курсор изменения диапазона */}
      <div 
        className="absolute inset-0 cursor-ns-resize opacity-0 hover:opacity-100 bg-zinc-600/10 transition-opacity"
        title="Перетащите для изменения ценового диапазона"
      />
    </div>
  );
}