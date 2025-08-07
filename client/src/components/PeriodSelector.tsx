import { useState } from "react";

interface PeriodSelectorProps {
  currentInterval: string;
  onIntervalChange: (interval: string) => void;
}

const INTERVALS = [
  { label: '1s', value: '1s' },
  { label: '1m', value: '1m' },
  { label: '3m', value: '3m' },
  { label: '5m', value: '5m' },
  { label: '15m', value: '15m' },
  { label: '30m', value: '30m' },
  { label: '1h', value: '1h' },
  { label: '2h', value: '2h' },
  { label: '4h', value: '4h' },
  { label: '6h', value: '6h' },
  { label: '12h', value: '12h' },
  { label: '1d', value: '1d' },
  { label: '3d', value: '3d' },
  { label: '1w', value: '1w' },
  { label: '1M', value: '1M' },
];

export default function PeriodSelector({ currentInterval, onIntervalChange }: PeriodSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      {/* Основная кнопка */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800/60 hover:bg-zinc-700/60 
                   border border-zinc-600/50 rounded-md text-sm font-medium text-zinc-200
                   transition-colors duration-150"
      >
        <span>{currentInterval}</span>
        <svg 
          className={`w-4 h-4 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Выпадающий список */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-zinc-800/95 backdrop-blur-sm 
                        border border-zinc-600/50 rounded-md shadow-xl min-w-[120px]">
          <div className="grid grid-cols-3 gap-0.5 p-2">
            {INTERVALS.map(interval => (
              <button
                key={interval.value}
                onClick={() => {
                  onIntervalChange(interval.value);
                  setIsOpen(false);
                }}
                className={`px-2 py-1.5 text-xs font-medium rounded transition-colors duration-150
                          ${currentInterval === interval.value 
                            ? 'bg-blue-600 text-white' 
                            : 'text-zinc-300 hover:bg-zinc-700/60 hover:text-zinc-100'
                          }`}
              >
                {interval.label}
              </button>
            ))}
          </div>
          
          {/* Закрыть при клике вне */}
          <div 
            className="fixed inset-0 z-[-1]" 
            onClick={() => setIsOpen(false)}
          />
        </div>
      )}
    </div>
  );
}