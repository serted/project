import { Cluster } from "@shared/schema";

interface TooltipProps {
  visible: boolean;
  x: number;
  y: number;
  data: Cluster | null;
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
        <div className="font-semibold text-zinc-300">Кластер</div>
        <div className="flex justify-between space-x-4">
          <span className="text-zinc-400">Цена:</span>
          <span className="font-mono">${data.price?.toFixed(2) || 'N/A'}</span>
        </div>
        <div className="flex justify-between space-x-4">
          <span className="text-zinc-400">Объем:</span>
          <span className="font-mono">{data.volume?.toLocaleString() || 'N/A'}</span>
        </div>
        <div className="flex justify-between space-x-4">
          <span className="text-zinc-400">Дельта:</span>
          <span className={`font-mono ${(data.delta || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {(data.delta || 0) >= 0 ? '+' : ''}{(data.delta || 0).toFixed(0)}
          </span>
        </div>
        <div className="flex justify-between space-x-4">
          <span className="text-zinc-400">Агрессия:</span>
          <span className="font-mono">{((data.aggression || 0) * 100).toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
}