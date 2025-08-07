import { OrderBookData, OrderBookLevel } from "@shared/schema";
import { useState, useMemo } from "react";
import OrderBookDepth from "./OrderBookDepth";

interface OrderBookProps {
  orderBookData: OrderBookData;
  priceRange: { min: number; max: number };
}

interface PriceLevel {
  price: number;
  volume: number;
  total: number;
  percentage: number;
}

export default function OrderBook({ orderBookData, priceRange }: OrderBookProps) {
  const [depth, setDepth] = useState(20);

  const processedData = useMemo(() => {
    // Берем нужное количество уровней
    const limitedAsks = (orderBookData.asks || []).slice(0, depth).reverse();
    const limitedBids = (orderBookData.bids || []).slice(0, depth);
    
    // Вычисляем максимальные объемы для процентов
    const maxAskVolume = Math.max(...limitedAsks.map((ask) => ask.volume), 0);
    const maxBidVolume = Math.max(...limitedBids.map((bid) => bid.volume), 0);
    const maxVolume = Math.max(maxAskVolume, maxBidVolume);
    
    // Обрабатываем asks
    let askTotal = 0;
    const asks: PriceLevel[] = limitedAsks.map((ask) => {
      askTotal += ask.volume;
      return {
        price: ask.price,
        volume: ask.volume,
        total: askTotal,
        percentage: maxVolume > 0 ? (ask.volume / maxVolume) * 100 : 0,
      };
    });
    
    // Обрабатываем bids
    let bidTotal = 0;
    const bids: PriceLevel[] = limitedBids.map((bid) => {
      bidTotal += bid.volume;
      return {
        price: bid.price,
        volume: bid.volume,
        total: bidTotal,
        percentage: maxVolume > 0 ? (bid.volume / maxVolume) * 100 : 0,
      };
    });
    
    // Спред
    const spread = asks[asks.length - 1]?.price - bids[0]?.price;
    const spreadPercent = spread && bids[0] ? (spread / bids[0].price) * 100 : 0;
    
    return { asks, bids, spread, spreadPercent };
  }, [orderBookData, depth]);

  const formatPrice = (price: number) => {
    return price.toLocaleString('ru-RU', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000) {
      return (volume / 1000).toFixed(1) + 'k';
    }
    return volume.toFixed(3);
  };

  return (
    <div className="w-48 h-full bg-transparent border-l border-zinc-700/30 flex flex-col">
      {/* Заголовок с выбором глубины */}
      <div className="flex justify-between items-center p-2 border-b border-zinc-700/30">
        <span className="text-xs text-zinc-400 font-medium">Стакан</span>
        <OrderBookDepth 
          currentDepth={depth}
          onDepthChange={setDepth}
        />
      </div>

      {/* Заголовки колонок */}
      <div className="flex justify-between items-center px-2 py-1 text-xs text-zinc-500 bg-zinc-900/20">
        <span>Цена</span>
        <span>Размер</span>
        <span>Сумма</span>
      </div>

      {/* Asks (продавцы) */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
          {processedData.asks.map((ask, index) => {
            const priceStr = ask.price.toFixed(2);
            const integerPart = priceStr.split('.')[0];
            const decimalPart = priceStr.split('.')[1];
            
            return (
              <div
                key={`ask-${ask.price}-${index}`}
                className="relative flex justify-between items-center px-2 py-0.5 text-xs hover:bg-zinc-800/30 transition-colors group"
              >
                {/* Фон объема */}
                <div 
                  className="absolute right-0 top-0 bottom-0 bg-red-500/10 transition-all duration-300"
                  style={{ width: `${ask.percentage}%` }}
                />
                
                <div className="relative flex items-center gap-1">
                  {/* Цена */}
                  <span className="font-mono">
                    <span className="text-white">{integerPart}.</span>
                    <span className="text-red-400">
                      {decimalPart}
                    </span>
                  </span>
                </div>
                
                <div className="relative text-zinc-300 font-mono text-right">
                  {formatVolume(ask.volume)}
                </div>
                
                <div className="relative text-zinc-500 font-mono text-right text-xs">
                  {formatVolume(ask.total)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Спред */}
      <div className="px-2 py-2 border-y border-zinc-700/30 bg-zinc-900/20">
        <div className="text-center">
          <div className="text-xs text-zinc-400">Спред</div>
          <div className="text-xs font-mono text-zinc-300">
            {processedData.spread?.toFixed(2) || '0.00'} 
            <span className="text-zinc-500 ml-1">
              ({processedData.spreadPercent.toFixed(3)}%)
            </span>
          </div>
        </div>
      </div>

      {/* Bids (покупатели) */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
          {processedData.bids.map((bid, index) => {
            const priceStr = bid.price.toFixed(2);
            const integerPart = priceStr.split('.')[0];
            const decimalPart = priceStr.split('.')[1];
            
            return (
              <div
                key={`bid-${bid.price}-${index}`}
                className="relative flex justify-between items-center px-2 py-0.5 text-xs hover:bg-zinc-800/30 transition-colors group"
              >
                {/* Фон объема */}
                <div 
                  className="absolute right-0 top-0 bottom-0 bg-green-500/10 transition-all duration-300"
                  style={{ width: `${bid.percentage}%` }}
                />
                
                <div className="relative flex items-center gap-1">
                  {/* Цена */}
                  <span className="font-mono">
                    <span className="text-white">{integerPart}.</span>
                    <span className="text-green-400">
                      {decimalPart}
                    </span>
                  </span>
                </div>
                
                <div className="relative text-zinc-300 font-mono text-right">
                  {formatVolume(bid.volume)}
                </div>
                
                <div className="relative text-zinc-500 font-mono text-right text-xs">
                  {formatVolume(bid.total)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}