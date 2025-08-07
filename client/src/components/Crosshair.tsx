interface CrosshairProps {
  x: number;
  y: number;
  visible: boolean;
  price: number;
  time: number;
}

export default function Crosshair({ x, y, visible, price, time }: CrosshairProps) {
  if (!visible) return null;

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
      {/* Vertical line */}
      <div
        className="absolute top-0 h-full w-px bg-zinc-500/70"
        style={{ left: x }}
      />
      
      {/* Horizontal line */}
      <div
        className="absolute left-0 w-full h-px bg-zinc-500/70"
        style={{ top: y }}
      />
      
      {/* Price label */}
      <div
        className="absolute bg-zinc-800 text-white px-2 py-1 text-xs font-mono border border-zinc-600 rounded"
        style={{
          right: 8,
          top: y - 12,
          transform: 'translateY(-50%)'
        }}
      >
        ${price.toFixed(2)}
      </div>
      
      {/* Time label */}
      <div
        className="absolute bg-zinc-800 text-white px-2 py-1 text-xs font-mono border border-zinc-600 rounded"
        style={{
          left: x - 40,
          bottom: 8,
          transform: 'translateX(-50%)'
        }}
      >
        {new Date(time).toLocaleTimeString('ru-RU', { 
          hour: '2-digit', 
          minute: '2-digit',
          second: '2-digit'
        })}
      </div>
    </div>
  );
}