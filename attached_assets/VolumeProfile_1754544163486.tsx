import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import styled from 'styled-components';
import { VolumeProfileData } from '../types';

const ProfileContainer = styled.div<{ side: 'left' | 'right' }>`
    position: absolute;
    top: 0;
    ${props => props.side}: 0;
    width: 80px;
    height: 100%;
    background: rgba(0, 0, 0, 0.05);
`;

interface Props {
    data: VolumeProfileData[];
    side: 'left' | 'right';
    maxVolume: number;
    height: number;
    theme: string;
}

const VolumeProfile: React.FC<Props> = ({ data, side, maxVolume, height, theme }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current || !data || data.length === 0) return;

        const canvas = document.createElement('canvas');
        canvas.width = 80;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Очистка
        ctx.clearRect(0, 0, 80, height);

        // Масштабы
        const xScale = d3.scaleLinear()
            .domain([0, maxVolume])
            .range([0, 80]);

        const yScale = d3.scaleLinear()
            .domain([
                d3.min(data, d => d.price) || 0,
                d3.max(data, d => d.price) || 0
            ])
            .range([height, 0]);

        // Отрисовка объемов
        data.forEach(level => {
            const y = yScale(level.price);
            const buyWidth = xScale(level.buyVolume);
            const sellWidth = xScale(level.sellVolume);

            // Buy volume
            ctx.fillStyle = 'rgba(38, 166, 154, 0.6)';
            ctx.fillRect(
                side === 'right' ? 0 : 80 - buyWidth,
                y - 1,
                buyWidth,
                2
            );

            // Sell volume
            ctx.fillStyle = 'rgba(239, 83, 80, 0.6)';
            ctx.fillRect(
                side === 'right' ? buyWidth : 0,
                y - 1,
                sellWidth,
                2
            );
        });

        // Замена содержимого контейнера
        containerRef.current.innerHTML = '';
        containerRef.current.appendChild(canvas);

        return () => {
            if (containerRef.current) {
                containerRef.current.innerHTML = '';
            }
        };
    }, [data, side, maxVolume, height, theme]);

    return <ProfileContainer ref={containerRef} side={side} />;
};

export default VolumeProfile;