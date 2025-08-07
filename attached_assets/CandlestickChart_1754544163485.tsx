import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { CandleData } from '../types';

interface Props {
  data: CandleData[];
  width?: number;
  height?: number;
  theme: 'light' | 'dark';
}

const CandlestickChart: React.FC<Props> = ({ 
  data, 
  width = 800, 
  height = 400,
  theme 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data.length || !svgRef.current) return;

    const margin = { top: 20, right: 30, bottom: 30, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Scales
    const x = d3.scaleBand()
      .domain(data.map(d => d.time.toString()))
      .range([0, innerWidth])
      .padding(0.2);

    const y = d3.scaleLinear()
      .domain([
        d3.min(data, d => d.low) || 0,
        d3.max(data, d => d.high) || 0
      ])
      .range([innerHeight, 0])
      .nice();

    // Draw candlesticks
    svg.selectAll("line.wick")
      .data(data)
      .enter()
      .append("line")
      .attr("class", "wick")
      .attr("x1", d => (x(d.time.toString()) || 0) + x.bandwidth() / 2)
      .attr("x2", d => (x(d.time.toString()) || 0) + x.bandwidth() / 2)
      .attr("y1", d => y(d.high))
      .attr("y2", d => y(d.low))
      .attr("stroke", theme === 'light' ? "#000" : "#fff");

    svg.selectAll("rect.candle")
      .data(data)
      .enter()
      .append("rect")
      .attr("class", "candle")
      .attr("x", d => x(d.time.toString()) || 0)
      .attr("y", d => y(Math.max(d.open, d.close)))
      .attr("width", x.bandwidth())
      .attr("height", d => Math.abs(y(d.open) - y(d.close)))
      .attr("fill", d => d.open > d.close ? "#ff4444" : "#4CAF50");

    // Axes
    const xAxis = d3.axisBottom(x)
      .tickFormat((d) => {
        const date = new Date(parseInt(d) * 1000);
        return date.toLocaleTimeString();
      });

    const yAxis = d3.axisLeft(y);

    svg.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(xAxis)
      .attr("color", theme === 'light' ? "#000" : "#fff");

    svg.append("g")
      .call(yAxis)
      .attr("color", theme === 'light' ? "#000" : "#fff");

    // Volume bars at the bottom
    const volumeHeight = height * 0.2;
    const volumeY = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.volume) || 0])
      .range([volumeHeight, 0]);

    const volumeArea = svg.append("g")
      .attr("transform", `translate(0,${innerHeight + margin.bottom})`);

    volumeArea.selectAll("rect.volume")
      .data(data)
      .enter()
      .append("rect")
      .attr("class", "volume")
      .attr("x", d => x(d.time.toString()) || 0)
      .attr("y", d => volumeY(d.volume))
      .attr("width", x.bandwidth())
      .attr("height", d => volumeHeight - volumeY(d.volume))
      .attr("fill", d => d.open > d.close ? "#ff444480" : "#4CAF5080");

  }, [data, width, height, theme]);

  return (
    <svg ref={svgRef} style={{ background: theme === 'light' ? '#fff' : '#1a1a1a' }}></svg>
  );
};

export default CandlestickChart;