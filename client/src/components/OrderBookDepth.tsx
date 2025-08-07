import { useState, useCallback } from "react";

interface OrderBookDepthProps {
  currentDepth: number;
  onDepthChange: (depth: number) => void;
}

const DEPTH_OPTIONS = [5, 10, 20, 50, 100];

export default function OrderBookDepth({ currentDepth, onDepthChange }: OrderBookDepthProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = useCallback((depth: number) => {
    onDepthChange(depth);
    setIsOpen(false);
  }, [onDepthChange]);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-2 py-1 text-xs bg-zinc-800/50 border border-zinc-700/50 rounded hover:bg-zinc-700/50 transition-colors"
      >
        <span className="text-zinc-300">{currentDepth}</span>
        <svg 
          className={`w-3 h-3 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute top-full right-0 mt-1 z-20 bg-zinc-800 border border-zinc-700 rounded shadow-lg min-w-[60px]">
            {DEPTH_OPTIONS.map((depth) => (
              <button
                key={depth}
                onClick={() => handleSelect(depth)}
                className={`block w-full px-3 py-2 text-left text-xs hover:bg-zinc-700 transition-colors ${
                  depth === currentDepth 
                    ? 'text-blue-400 bg-zinc-700/50' 
                    : 'text-zinc-300'
                }`}
              >
                {depth}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}