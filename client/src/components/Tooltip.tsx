import { Cluster } from "@shared/schema";

interface TooltipProps {
  visible: boolean;
  x: number;
  y: number;
  data: any; // ИСПРАВЛЕНО: принимаем разные типы данных (Cluster, volume, etc.)
}

export default function Tooltip({ visible, x, y, data }: TooltipProps) {
  if (!visible || !data) return null;

  return (
    <div
      className="absolute bg-zinc-800 text-white p-3 text-xs border border-zinc-600 rounded shadow-lg z-20 pointer-events-none"
      style={{
        left: x + 10,
        top: y - 10,
        transform: 'translate(0, -100%)'
      }}
    >
      <div className="space-y-1">
        <div className="font-semibold text-zinc-300">{data.type || 'Данные'}</div>
        
        {/* Цена - если есть */}
        {data.price !== undefined && (
          <div className="flex justify-between space-x-4">
            <span className="text-zinc-400">Цена:</span>
            <span className="font-mono">${Number(data.price).toFixed(2)}</span>
          </div>
        )}
        
        {/* Объем - если есть */}
        {data.volume !== undefined && (
          <div className="flex justify-between space-x-4">
            <span className="text-zinc-400">Объем:</span>
            <span className="font-mono">{Number(data.volume || data.totalVolume).toLocaleString()}</span>
          </div>
        )}
        
        {/* Дельта - если есть */}
        {data.delta !== undefined && (
          <div className="flex justify-between space-x-4">
            <span className="text-zinc-400">Дельта:</span>
            <span className={`font-mono ${Number(data.delta) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {Number(data.delta) >= 0 ? '+' : ''}{Number(data.delta).toFixed(0)}
            </span>
          </div>
        )}
        
        {/* Время - если есть */}
        {data.time !== undefined && (
          <div className="flex justify-between space-x-4">
            <span className="text-zinc-400">Время:</span>
            <span className="font-mono">{data.time}</span>
          </div>
        )}
        
        {/* Агрессия - если есть */}
        {data.aggression !== undefined && (
          <div className="flex justify-between space-x-4">
            <span className="text-zinc-400">Агрессия:</span>
            <span className="font-mono">{(Number(data.aggression) * 100).toFixed(1)}%</span>
          </div>
        )}
        
        {/* Buy/Sell проценты - если есть */}
        {(data.buyPercent !== undefined || data.askPercent !== undefined) && (
          <div className="space-y-1">
            <div className="flex justify-between space-x-4">
              <span className="text-zinc-400">Покупки:</span>
              <span className="font-mono text-green-400">{data.askPercent || data.buyPercent}%</span>
            </div>
            <div className="flex justify-between space-x-4">
              <span className="text-zinc-400">Продажи:</span>
              <span className="font-mono text-red-400">{data.bidPercent || data.sellPercent}%</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}