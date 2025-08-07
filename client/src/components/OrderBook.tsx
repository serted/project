import { OrderBookData } from "@shared/schema";
import { useState } from "react";

interface OrderBookProps {
  orderBookData: OrderBookData;
  priceRange: { min: number; max: number };
}

export default function OrderBook({ orderBookData, priceRange }: OrderBookProps) {
  const sortedAsks = [...orderBookData.asks].sort((a, b) => a.price - b.price).slice(0, 10);
  const sortedBids = [...orderBookData.bids].sort((a, b) => b.price - a.price).slice(0, 10);
  
  const maxQuantity = Math.max(
    ...sortedAsks.map(ask => ask.volume),
    ...sortedBids.map(bid => bid.volume)
  );

  return (
    <div className="w-56 h-full bg-zinc-900/30 border-l border-zinc-800 flex flex-col">
      {/* Header */}
      <div className="h-8 bg-zinc-900/50 border-b border-zinc-800 flex items-center justify-center">
        <span className="text-xs text-zinc-400 font-medium">Стакан заявок</span>
      </div>

      <div className="flex-1 flex flex-col text-xs font-mono">
        {/* Asks (Sell Orders) */}
        <div className="flex-1 flex flex-col-reverse p-2 space-y-0.5 space-y-reverse">
          {sortedAsks.map((ask, index) => {
            const quantity = ask.volume;
            const price = ask.price;
            const widthPercent = (quantity / maxQuantity) * 100;
            
            return (
              <div
                key={`ask-${index}`}
                className="flex justify-between items-center h-4 relative"
              >
                <div
                  className="absolute right-0 top-0 h-full bg-red-900/20"
                  style={{ width: `${widthPercent}%` }}
                />
                <span className="text-zinc-400 z-10">{quantity.toFixed(3)}</span>
                <span className="text-red-400 z-10">{price.toFixed(2)}</span>
              </div>
            );
          })}
        </div>

        {/* Spread */}
        <div className="h-8 border-y border-zinc-800 flex items-center justify-center bg-zinc-900/20">
          {sortedBids.length > 0 && sortedAsks.length > 0 && (
            <span className="text-zinc-500 text-xs">
              Спред: {(sortedAsks[0].price - sortedBids[0].price).toFixed(2)}
            </span>
          )}
        </div>

        {/* Bids (Buy Orders) */}
        <div className="flex-1 flex flex-col p-2 space-y-0.5">
          {sortedBids.map((bid, index) => {
            const quantity = bid.volume;
            const price = bid.price;
            const widthPercent = (quantity / maxQuantity) * 100;
            
            return (
              <div
                key={`bid-${index}`}
                className="flex justify-between items-center h-4 relative"
              >
                <div
                  className="absolute right-0 top-0 h-full bg-green-900/20"
                  style={{ width: `${widthPercent}%` }}
                />
                <span className="text-zinc-400 z-10">{quantity.toFixed(3)}</span>
                <span className="text-green-400 z-10">{price.toFixed(2)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}