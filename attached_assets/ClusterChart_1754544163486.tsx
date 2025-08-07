import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, IChartApi, MouseEventParams } from 'lightweight-charts';
import styled from 'styled-components';
import { CandleData, ChartConfig } from '../types';

const ChartContainer = styled.div`
    position: relative;
    width: 100%;
    height: 100%;
`;

interface Props {
    data: CandleData[];
    config: ChartConfig;
    onConfigChange: (config: Partial<ChartConfig>) => void;
    onHover?: (event: { time: number; price: number; x: number; y: number }) => void;
    width: number;
    height: number;
}

export const ClusterChart: React.FC<Props> = ({
    data,
    config,
    onConfigChange,
    onHover,
    width,
    height
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const candlestickSeriesRef = useRef<any>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [lastMousePosition, setLastMousePosition] = useState({ x: 0, y: 0 });

    const handleCrosshairMove = useCallback(
        (param: MouseEventParams) => {
            if (!param.point || !param.time || !onHover || !candlestickSeriesRef.current) return;

            const price = candlestickSeriesRef.current.coordinateToPrice(param.point.y);
            const currentCandle = data.find(candle => candle.time === (param.time as number));
            const closePrice = currentCandle?.close || price;

            onHover({
                time: param.time as number,
                price: closePrice,
                x: param.point.x,
                y: param.point.y,
            });
        },
        [onHover, data]
    );

    const initializeChart = useCallback(() => {
        if (!containerRef.current) return;

        const chart = createChart(containerRef.current, {
            width,
            height,
            layout: {
                background: { color: config.theme === 'dark' ? '#1A1A1A' : '#FFFFFF' },
                textColor: config.theme === 'dark' ? '#D9D9D9' : '#191919',
            },
            grid: {
                vertLines: { visible: config.gridVisible },
                horzLines: { visible: config.gridVisible }
            },
            rightPriceScale: {
                borderVisible: true,
                scaleMargins: {
                    top: 0.1,
                    bottom: 0.2,
                },
            },
            timeScale: {
                borderVisible: true,
                timeVisible: true,
                secondsVisible: false,
                tickMarkFormatter: (time: number) => {
                    const date = new Date(time * 1000);
                    return date.toLocaleTimeString();
                },
            },
            crosshair: {
                mode: 1,
                vertLine: {
                    width: 1,
                    color: config.theme === 'dark' ? '#555' : '#ddd',
                    style: 0,
                },
                horzLine: {
                    width: 1,
                    color: config.theme === 'dark' ? '#555' : '#ddd',
                    style: 0,
                },
            },
        });

        // Создаем свечную серию
        const candlestickSeries = chart.addCandlestickSeries({
            upColor: '#26a69a',
            downColor: '#ef5350',
            borderVisible: false,
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350',
        });

        candlestickSeriesRef.current = candlestickSeries;

        // Добавляем объемы если они включены
        if (config.showVolumes) {
            const volumeSeries = chart.addHistogramSeries({
                color: '#26a69a',
                priceFormat: {
                    type: 'volume',
                },
                priceLineVisible: false,
                lastValueVisible: false,
                overlay: true,
                priceScaleId: 'volume',
            });

            // Настраиваем ценовую шкалу для объемов
            chart.priceScale('volume').applyOptions({
                scaleMargins: {
                    top: 0.8,
                    bottom: 0,
                },
                visible: false,
            });

            // Устанавливаем данные объемов
            volumeSeries.setData(data.map(candle => ({
                time: candle.time,
                value: candle.volume,
                color: candle.close >= candle.open ? '#26a69a' : '#ef5350',
            })));
        }

        // Устанавливаем данные свечей
        candlestickSeries.setData(data.map(candle => ({
            time: candle.time,
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
        })));

        // Подписываемся на событие перемещения кросcхейра
        chart.subscribeCrosshairMove(handleCrosshairMove);

        chartRef.current = chart;

        // Обработчики событий
        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            if (!chartRef.current) return;

            const chart = chartRef.current;
            if (e.ctrlKey) {
                // Зум
                const scale = chart.timeScale().getBarSpacing();
                chart.timeScale().setBarSpacing(e.deltaY < 0 ? scale * 1.1 : scale / 1.1);
            } else {
                // Скролл
                const logicalRange = chart.timeScale().getVisibleLogicalRange();
                if (logicalRange !== null) {
                    const delta = e.deltaY > 0 ? 1 : -1;
                    chart.timeScale().scrollToOffset(
                        chart.timeScale().scrollPosition() + delta
                    );
                }
            }
        };

        const handleMouseDown = (e: MouseEvent) => {
            setIsDragging(true);
            setLastMousePosition({ x: e.clientX, y: e.clientY });
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging || !chartRef.current) return;

            const chart = chartRef.current;
            const deltaX = e.clientX - lastMousePosition.x;
            
            // Перемещение графика
            const logicalRange = chart.timeScale().getVisibleLogicalRange();
            if (logicalRange !== null) {
                chart.timeScale().scrollToOffset(
                    chart.timeScale().scrollPosition() - deltaX
                );
            }

            setLastMousePosition({ x: e.clientX, y: e.clientY });
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        containerRef.current.addEventListener('wheel', handleWheel, { passive: false });
        containerRef.current.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            if (containerRef.current) {
                containerRef.current.removeEventListener('wheel', handleWheel);
                containerRef.current.removeEventListener('mousedown', handleMouseDown);
            }
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            chart.unsubscribeCrosshairMove(handleCrosshairMove);
            chart.remove();
        };
    }, [config.theme, config.gridVisible, config.showVolumes, data, handleCrosshairMove, width, height]);

    useEffect(() => {
        return initializeChart();
    }, [initializeChart]);

    // Автоскролл при обновлении данных
    useEffect(() => {
        if (config.autoScroll && chartRef.current) {
            chartRef.current.timeScale().scrollToRealTime();
        }
    }, [data, config.autoScroll]);

    return <ChartContainer ref={containerRef} />;
};

export default ClusterChart;