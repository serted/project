import { useState, useCallback, useRef, useEffect } from "react";
import { CandleData, OrderBookData, TradingState, WSMessage } from "@shared/schema";
import { useWebSocket } from "./useWebSocket";

export function useTradingData() {
  const [candleData, setCandleData] = useState<CandleData[]>([]);
  const [orderBookData, setOrderBookData] = useState<OrderBookData>({
    bids: [],
    asks: [],
    lastUpdate: Date.now(),
  });
  const [tradingState, setTradingState] = useState<TradingState>({
    symbol: "BTCUSDT",
    isConnected: false,
    lastUpdate: Date.now(),
    currentPrice: 0,
    priceChange: 0,
    priceChangePercent: 0,
  });

  const handleWebSocketMessage = useCallback((message: WSMessage) => {
    switch (message.type) {
      case "historical_data":
        setCandleData(message.data);
        if (message.data.length > 0) {
          const latestCandle = message.data[message.data.length - 1];
          setTradingState(prev => ({
            ...prev,
            currentPrice: latestCandle.close,
            lastUpdate: Date.now(),
          }));
        }
        break;

      case "candle_update":
        setCandleData(prev => {
          const newData = [...prev];
          const lastIndex = newData.length - 1;
          if (lastIndex >= 0) {
            newData[lastIndex] = message.data;
          } else {
            newData.push(message.data);
          }
          return newData;
        });

        setTradingState(prev => {
          const priceChange = message.data.close - prev.currentPrice;
          const priceChangePercent = prev.currentPrice > 0 
            ? (priceChange / prev.currentPrice) * 100 
            : 0;

          return {
            ...prev,
            currentPrice: message.data.close,
            priceChange,
            priceChangePercent,
            lastUpdate: Date.now(),
          };
        });
        break;

      case "orderbook_update":
        setOrderBookData(message.data);
        break;

      case "connection_status":
        setTradingState(prev => ({
          ...prev,
          isConnected: message.data.connected,
          symbol: message.data.symbol,
        }));
        break;

      case "trade_update":
        // Handle individual trade updates if needed
        break;
    }
  }, []);

  const handleConnect = useCallback(() => {
    setTradingState(prev => ({ ...prev, isConnected: true }));
  }, []);

  const handleDisconnect = useCallback(() => {
    setTradingState(prev => ({ ...prev, isConnected: false }));
  }, []);

  const { isConnected, sendMessage } = useWebSocket({
    onMessage: handleWebSocketMessage,
    onConnect: handleConnect,
    onDisconnect: handleDisconnect,
  });

  // Auto-subscribe to BTCUSDT when connected
  const subscribedRef = useRef(false);
  
  useEffect(() => {
    if (isConnected && !subscribedRef.current) {
      sendMessage({
        type: 'subscribe',
        symbol: 'BTCUSDT',
        interval: '1m',
      });
      subscribedRef.current = true;
    }
    
    // Reset flag when disconnected
    if (!isConnected) {
      subscribedRef.current = false;
    }
  }, [isConnected, sendMessage]);

  const subscribeToSymbol = useCallback((symbol: string, interval: string = '1m') => {
    if (isConnected) {
      sendMessage({
        type: 'subscribe',
        symbol: symbol.toUpperCase(),
        interval,
      });
    }
  }, [isConnected, sendMessage]);

  const unsubscribeFromSymbol = useCallback((symbol: string, interval: string = '1m') => {
    if (isConnected) {
      sendMessage({
        type: 'unsubscribe',
        symbol: symbol.toUpperCase(),
        interval,
      });
    }
  }, [isConnected, sendMessage]);

  return {
    candleData,
    orderBookData,
    tradingState: { ...tradingState, isConnected },
    isConnected,
    subscribeToSymbol,
    unsubscribeFromSymbol,
  };
}
