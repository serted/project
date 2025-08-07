import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled from 'styled-components';
import ClusterChart from './components/ClusterChart';
import ChartControls from './components/ChartControls';
import VolumeProfile from './components/VolumeProfile';
import { CandleData, ChartConfig, VolumeProfileData, ChartHoverEvent } from './types';

const AppContainer = styled.div<{ theme: string }>`
    background: ${props => props.theme === 'dark' ? '#1A1A1A' : '#FFFFFF'};
    color: ${props => props.theme === 'dark' ? '#FFFFFF' : '#000000'};
    min-height: 100vh;
    padding: 20px;
`;

const Header = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding: 0 20px;
`;

const StatusIndicator = styled.div<{ connected: boolean }>`
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: ${props => props.connected ? '#4CAF50' : '#f44336'};
    margin-right: 10px;
`;

const Controls = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
`;

const Button = styled.button<{ active?: boolean; theme: string }>`
    background: ${props => props.theme === 'dark' ? '#333' : '#fff'};
    color: ${props => props.theme === 'dark' ? '#fff' : '#000'};
    border: 1px solid ${props => props.theme === 'dark' ? '#555' : '#ddd'};
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.2s ease;
    &:hover {
        background: ${props => props.theme === 'dark' ? '#444' : '#f0f0f0'};
    }
    ${props => props.active && `
        background: ${props.theme === 'dark' ? '#444' : '#e6e6e6'};
    `}
`;

const Select = styled.select<{ theme: string }>`
    background: ${props => props.theme === 'dark' ? '#333' : '#fff'};
    color: ${props => props.theme === 'dark' ? '#fff' : '#000'};
    border: 1px solid ${props => props.theme === 'dark' ? '#555' : '#ddd'};
    padding: 8px;
    border-radius: 4px;
    cursor: pointer;
    transition: border-color 0.2s ease;
    &:hover {
        border-color: ${props => props.theme === 'dark' ? '#666' : '#bbb'};
    }
`;

const ChartContainer = styled.div<{ theme: string }>`
    position: relative;
    margin-top: 20px;
    padding: 20px;
    border-radius: 8px;
    background: ${props => props.theme === 'dark' ? '#222' : '#f5f5f5'};
    height: calc(100vh - 120px);
    display: flex;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
`;

const ConnectionStatus = styled.div`
    display: flex;
    align-items: center;
    font-size: 14px;
`;

const MainChartArea = styled.div`
    flex: 1;
    position: relative;
    margin: 0 80px;
`;

const Tooltip = styled.div<{ x: number; y: number }>`
    position: absolute;
    left: ${props => `${Math.min(props.x, window.innerWidth - 200)}px`};
    top: ${props => `${Math.min(props.y, window.innerHeight - 200)}px`};
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 8px;
    border-radius: 4px;
    font-size: 12px;
    pointer-events: none;
    z-index: 100;
    white-space: pre;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
`;

const ErrorMessage = styled.div<{ theme: string }>`
    color: ${props => props.theme === 'dark' ? '#ff6b6b' : '#dc3545'};
    padding: 10px;
    margin: 10px 0;
    border-radius: 4px;
    background: ${props => props.theme === 'dark' ? 'rgba(255,107,107,0.1)' : 'rgba(220,53,69,0.1)'};
`;

const DEFAULT_CONFIG: ChartConfig = {
    theme: 'dark',
    autoScroll: true,
    showClusters: true,
    showVolumes: true,
    gridVisible: true,
    clusterStep: 0.1
};

const App: React.FC = () => {
    const [config, setConfig] = useState<ChartConfig>(DEFAULT_CONFIG);
    const [data, setData] = useState<CandleData[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [symbol, setSymbol] = useState('BTCUSDT');
    const [timeframe, setTimeframe] = useState('1m');
    const [tooltip, setTooltip] = useState<{ content: string; x: number; y: number } | null>(null);
    
    const ws = useRef<WebSocket | null>(null);
    const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
    const lastMessageTime = useRef<number>(Date.now());

    const connect = useCallback(() => {
        if (ws.current?.readyState === WebSocket.OPEN) return;

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/${symbol}`;
        
        ws.current = new WebSocket(wsUrl);
        
        ws.current.onopen = () => {
            console.log('WebSocket Connected');
            setIsConnected(true);
            setError(null);
            if (reconnectTimeout.current) {
                clearTimeout(reconnectTimeout.current);
                reconnectTimeout.current = null;
            }
        };

        ws.current.onclose = () => {
            console.log('WebSocket Disconnected');
            setIsConnected(false);
            reconnectTimeout.current = setTimeout(connect, 5000);
        };

        ws.current.onerror = (error) => {
            console.error('WebSocket Error:', error);
            setIsConnected(false);
            setError('Connection error occurred. Attempting to reconnect...');
        };

        ws.current.onmessage = (event) => {
            try {
                lastMessageTime.current = Date.now();
                const message = JSON.parse(event.data);
                
                if (message.type === 'historical') {
                    if (!Array.isArray(message.data)) {
                        throw new Error('Invalid historical data format');
                    }
                    setData(normalizeData(message.data));
                } else if (message.type === 'update') {
                    setData(prevData => {
                        if (!config.autoScroll) return prevData;
                        const newData = [...prevData];
                        const lastIndex = newData.length - 1;
                        if (lastIndex >= 0) {
                            const normalizedCandle = normalizeCandle(message.data);
                            newData[lastIndex] = normalizedCandle;
                        }
                        return newData;
                    });
                }
            } catch (error) {
                console.error('Error processing message:', error);
                setError(`Failed to process data: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        };
    }, [symbol, config.autoScroll]);

    const normalizeData = useCallback((rawData: any[]): CandleData[] => {
        return rawData.map(normalizeCandle);
    }, []);

    const calculateDelta = useCallback((buyVolume: number, sellVolume: number): number => {
        return buyVolume - sellVolume;
    }, []);

    const normalizeCandle = useCallback((candle: any): CandleData => {
        const buyVolume = Number(candle.buyVolume) || 0;
        const sellVolume = Number(candle.sellVolume) || 0;
        
        return {
            time: Number(candle.time),
            open: Number(candle.open),
            high: Number(candle.high),
            low: Number(candle.low),
            close: Number(candle.close),
            volume: Number(candle.volume),
            buyVolume: buyVolume,
            sellVolume: sellVolume,
            delta: calculateDelta(buyVolume, sellVolume),
            clusters: Array.isArray(candle.clusters) ? candle.clusters.map((cluster: any) => ({
                price: Number(cluster.price),
                volume: Number(cluster.volume),
                buyVolume: Number(cluster.buyVolume),
                sellVolume: Number(cluster.sellVolume),
                delta: Number(cluster.delta),
                aggression: Number(cluster.aggression)
            })) : []
        };
    }, [calculateDelta]);

    useEffect(() => {
        connect();

        // Проверка состояния соединения
        const healthCheck = setInterval(() => {
            if (Date.now() - lastMessageTime.current > 10000) {
                if (ws.current) {
                    ws.current.close();
                }
            }
        }, 5000);

        return () => {
            clearInterval(healthCheck);
            if (reconnectTimeout.current) {
                clearTimeout(reconnectTimeout.current);
            }
            if (ws.current) {
                ws.current.close();
            }
        };
    }, [connect]);

    const aggregateVolumeProfile = useCallback((candleData: CandleData[]): VolumeProfileData[] => {
        if (!candleData || candleData.length === 0) return [];
        
        const volumeMap = new Map<number, VolumeProfileData>();
        
        candleData.forEach(candle => {
            if (candle.clusters && Array.isArray(candle.clusters)) {
                candle.clusters.forEach(cluster => {
                    const existing = volumeMap.get(cluster.price) || {
                        price: cluster.price,
                        totalVolume: 0,
                        buyVolume: 0,
                        sellVolume: 0
                    };

                    existing.totalVolume += cluster.volume;
                    existing.buyVolume += cluster.buyVolume;
                    existing.sellVolume += cluster.sellVolume;

                    volumeMap.set(cluster.price, existing);
                });
            }
        });

        return Array.from(volumeMap.values())
            .sort((a, b) => a.price - b.price);
    }, []);

    const handleConfigChange = useCallback((newConfig: Partial<ChartConfig>) => {
        setConfig(prev => ({ ...prev, ...newConfig }));
    }, []);

    const handleSymbolChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
        setSymbol(event.target.value);
    }, []);

    const handleTimeframeChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
        setTimeframe(event.target.value);
    }, []);

    const handleChartHover = useCallback((event: ChartHoverEvent) => {
        const candle = data.find(d => d.time === event.time);
        if (!candle) {
            setTooltip(null);
            return;
        }

        const content = `Time: ${new Date(event.time * 1000).toLocaleString()}\n` +
            `Price: ${event.price.toFixed(2)}\n` +
            `Open: ${candle.open.toFixed(2)}\n` +
            `High: ${candle.high.toFixed(2)}\n` +
            `Low: ${candle.low.toFixed(2)}\n` +
            `Close: ${candle.close.toFixed(2)}\n` +
            `Volume: ${candle.volume.toFixed(2)}\n` +
            `Buy Volume: ${candle.buyVolume.toFixed(2)}\n` +
            `Sell Volume: ${candle.sellVolume.toFixed(2)}\n` +
            `Delta: ${(candle.buyVolume - candle.sellVolume).toFixed(2)}`;

        setTooltip({
            content,
            x: event.x,
            y: event.y
        });
    }, [data]);

    const volumeProfile = aggregateVolumeProfile(data);
    const maxVolume = Math.max(...data.map(d => d.volume));

    return (
        <AppContainer theme={config.theme}>
            <Header>
                <ConnectionStatus>
                    <StatusIndicator connected={isConnected} />
                    {isConnected ? 'Connected' : 'Disconnected'}
                </ConnectionStatus>
                <Controls>
                    <Select theme={config.theme} value={symbol} onChange={handleSymbolChange}>
                        <option value="BTCUSDT">BTC/USDT</option>
                        <option value="ETHUSDT">ETH/USDT</option>
                        <option value="BNBUSDT">BNB/USDT</option>
                    </Select>
                    <Select theme={config.theme} value={timeframe} onChange={handleTimeframeChange}>
                        <option value="1m">1m</option>
                        <option value="5m">5m</option>
                        <option value="15m">15m</option>
                        <option value="1h">1h</option>
                        <option value="4h">4h</option>
                        <option value="1d">1d</option>
                    </Select>
                    <Button
                        theme={config.theme}
                        active={config.autoScroll}
                        onClick={() => handleConfigChange({ autoScroll: !config.autoScroll })}
                    >
                        {config.autoScroll ? '🔒 Auto' : '🔓 Manual'}
                    </Button>
                    <Button
                        theme={config.theme}
                        active={config.showClusters}
                        onClick={() => handleConfigChange({ showClusters: !config.showClusters })}
                    >
                        📊 Clusters
                    </Button>
                    <Button
                        theme={config.theme}
                        active={config.showVolumes}
                        onClick={() => handleConfigChange({ showVolumes: !config.showVolumes })}
                    >
                        📈 Volumes
                    </Button>
                    <Button
                        theme={config.theme}
                        onClick={() => handleConfigChange({ theme: config.theme === 'light' ? 'dark' : 'light' })}
                    >
                        {config.theme === 'light' ? '🌙' : '☀️'}
                    </Button>
                </Controls>
            </Header>
            
            {error && (
                <ErrorMessage theme={config.theme}>
                    {error}
                </ErrorMessage>
            )}
            
            <ChartContainer theme={config.theme}>
                {config.showVolumes && volumeProfile.length > 0 && (
                    <VolumeProfile
                        data={volumeProfile}
                        side="left"
                        maxVolume={maxVolume}
                        height={window.innerHeight - 160}
                        theme={config.theme}
                    />
                )}
                
                <MainChartArea>
                    <ClusterChart
                        data={data}
                        config={config}
                        onConfigChange={handleConfigChange}
                        onHover={handleChartHover}
                        width={window.innerWidth - (config.showVolumes ? 360 : 200)}
                        height={window.innerHeight - 160}
                    />
                    {tooltip && (
                        <Tooltip x={tooltip.x} y={tooltip.y}>
                            <pre>{tooltip.content}</pre>
                        </Tooltip>
                    )}
                </MainChartArea>
                
                {config.showVolumes && volumeProfile.length > 0 && (
                    <VolumeProfile
                        data={volumeProfile}
                        side="right"
                        maxVolume={maxVolume}
                        height={window.innerHeight - 160}
                        theme={config.theme}
                    />
                )}
            </ChartContainer>
        </AppContainer>
    );
};

export default App;