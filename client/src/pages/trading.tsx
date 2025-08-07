import TradingChart from "@/components/TradingChart";
import { useTradingData } from "@/hooks/useTradingData";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Settings, Activity, TrendingUp, TrendingDown } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

interface SymbolData {
  symbols: string[];
  intervals: string[];
  orderBookDepths: number[];
}

export default function TradingPage() {
  const [selectedSymbol, setSelectedSymbol] = useState("BTCUSDT");
  const [selectedInterval, setSelectedInterval] = useState("1m");
  
  const { 
    tradingState, 
    candleData, 
    orderBookData, 
    isConnected
  } = useTradingData();

  // Fetch available symbols and intervals
  const { data: symbolData } = useQuery<SymbolData>({
    queryKey: ['/api/symbols'],
    enabled: true,
  });

  const handleSymbolChange = (symbol: string) => {
    setSelectedSymbol(symbol);
  };

  const handleIntervalChange = (interval: string) => {
    setSelectedInterval(interval);
  };

  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-white">
      {/* Header */}
      <div className="h-14 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-900/50">
        <div className="flex items-center space-x-6">
          {/* Symbol Selection */}
          <div className="flex items-center space-x-3">
            <Select value={selectedSymbol} onValueChange={handleSymbolChange}>
              <SelectTrigger className="w-32 h-9 text-sm bg-zinc-800 border-zinc-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                {symbolData?.symbols.map(symbol => (
                  <SelectItem key={symbol} value={symbol} className="text-white hover:bg-zinc-700">
                    {symbol}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Price Display */}
            <div className="flex items-center space-x-3">
              <span className={`font-mono text-lg font-semibold ${
                tradingState.priceChange >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                ${tradingState.currentPrice.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </span>
              
              <div className="flex items-center space-x-2">
                {tradingState.priceChange >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-400" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-400" />
                )}
                <span className={`text-sm font-medium ${
                  tradingState.priceChange >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {tradingState.priceChange >= 0 ? '+' : ''}{tradingState.priceChangePercent.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>

          {/* Connection Status */}
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <>
                <Activity className="h-4 w-4 text-green-400" />
                <Badge variant="secondary" className="bg-green-900/30 text-green-400 border-green-800">
                  В сети
                </Badge>
              </>
            ) : (
              <>
                <Activity className="h-4 w-4 text-red-400" />
                <Badge variant="secondary" className="bg-red-900/30 text-red-400 border-red-800">
                  Не подключен
                </Badge>
              </>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-3">
          {/* Interval Selection */}
          <Select value={selectedInterval} onValueChange={handleIntervalChange}>
            <SelectTrigger className="w-20 h-9 text-sm bg-zinc-800 border-zinc-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-zinc-700">
              {symbolData?.intervals.map(interval => (
                <SelectItem key={interval} value={interval} className="text-white hover:bg-zinc-700">
                  {interval}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm" className="h-9 w-9 p-0 bg-zinc-800 border-zinc-700 hover:bg-zinc-700">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Trading Chart */}
      <div className="flex-1 bg-zinc-950">
        <TradingChart 
          candleData={candleData}
          orderBookData={orderBookData}
          isConnected={isConnected}
        />
      </div>
    </div>
  );
}
