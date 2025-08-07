import { CandleData, Cluster } from "@shared/schema";
import { useRef, useEffect, useState } from "react";

interface ClusterOverlayProps {
  candleData: CandleData[];
  priceRange: { min: number; max: number };
  zoom: number;
  pan: number;
  onClusterHover?: (data: any, x: number, y: number) => void;
}

export default function ClusterOverlay({ 
  candleData, 
  priceRange, 
  zoom, 
  pan,
  onClusterHover 
}: ClusterOverlayProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredCluster, setHoveredCluster] = useState<string | null>(null);

  const priceToY = (price: number, height: number) => {
    const range = priceRange.max - priceRange.min;
    return height - ((price - priceRange.min) / range) * height;
  };

  const getClusterWidth = (cluster: Cluster, maxVolume: number) => {
    return Math.max(4, (cluster.volume / maxVolume) * 35);
  };

  const getClusterHeight = (cluster: Cluster, maxVolume: number) => {
    return Math.max(3, Math.min(12, (cluster.volume / maxVolume) * 10));
  };

  const handleClusterClick = (cluster: Cluster, x: number, y: number) => {
    onClusterHover?.(cluster, x, y);
  };

  if (candleData.length === 0) return null;

  const candleSpacing = 60 * zoom;
  const startX = 35 - pan;

  // Calculate max volume for scaling
  const allClusters = candleData.flatMap(candle => candle.clusters);
  const maxVolume = Math.max(...allClusters.map(c => c.volume), 1);

  return (
    <div className="absolute inset-0 pointer-events-none">
      <svg ref={svgRef} className="w-full h-full" style={{ zIndex: 4 }}>
        {candleData.map((candle, candleIndex) => {
          const candleX = startX + candleIndex * candleSpacing;
          
          return (
            <g key={candleIndex}>
              {candle.clusters.map((cluster, clusterIndex) => {
                const clusterY = priceToY(cluster.price, window.innerHeight - 200);
                const clusterWidth = getClusterWidth(cluster, maxVolume);
                const clusterHeight = getClusterHeight(cluster, maxVolume);
                const clusterId = `${candleIndex}-${clusterIndex}`;
                const isHovered = hoveredCluster === clusterId;

                // Создаем композитную полосу с градиентом buy/sell
                const buyPercent = cluster.buyVolume / cluster.volume;
                const buyWidth = clusterWidth * buyPercent;
                const sellWidth = clusterWidth * (1 - buyPercent);

                return (
                  <g key={clusterId}>
                    {/* Фоновая полоса для контраста */}
                    <rect
                      x={candleX + 45}
                      y={clusterY - clusterHeight / 2}
                      width={clusterWidth + 2}
                      height={clusterHeight + 1}
                      fill="rgba(0, 0, 0, 0.3)"
                      rx={1}
                    />
                    
                    {/* Buy объем (зеленый) */}
                    <rect
                      x={candleX + 45}
                      y={clusterY - clusterHeight / 2}
                      width={buyWidth}
                      height={clusterHeight}
                      fill={isHovered ? "rgba(34, 197, 94, 0.9)" : "rgba(34, 197, 94, 0.7)"}
                      rx={1}
                      className="cursor-pointer transition-all duration-150 pointer-events-auto"
                      onMouseEnter={() => {
                        setHoveredCluster(clusterId);
                        handleClusterClick(cluster, candleX + 45 + clusterWidth / 2, clusterY);
                      }}
                      onMouseLeave={() => setHoveredCluster(null)}
                    />
                    
                    {/* Sell объем (красный) */}
                    <rect
                      x={candleX + 45 + buyWidth}
                      y={clusterY - clusterHeight / 2}
                      width={sellWidth}
                      height={clusterHeight}
                      fill={isHovered ? "rgba(239, 68, 68, 0.9)" : "rgba(239, 68, 68, 0.7)"}
                      rx={1}
                      className="cursor-pointer transition-all duration-150 pointer-events-auto"
                      onMouseEnter={() => {
                        setHoveredCluster(clusterId);
                        handleClusterClick(cluster, candleX + 45 + clusterWidth / 2, clusterY);
                      }}
                      onMouseLeave={() => setHoveredCluster(null)}
                    />
                    
                    {/* Подсветка для крупных кластеров */}
                    {cluster.volume > maxVolume * 0.6 && (
                      <circle
                        cx={candleX + 45 + clusterWidth + 8}
                        cy={clusterY}
                        r={2}
                        fill="rgba(251, 191, 36, 0.8)"
                        className="animate-pulse"
                      />
                    )}
                    
                    {/* Линия дельты для значимых дисбалансов */}
                    {Math.abs(cluster.delta / cluster.volume) > 0.3 && (
                      <line
                        x1={candleX + 45 + clusterWidth + 3}
                        y1={clusterY}
                        x2={candleX + 45 + clusterWidth + 15}
                        y2={clusterY}
                        stroke={cluster.delta > 0 ? "rgba(34, 197, 94, 0.8)" : "rgba(239, 68, 68, 0.8)"}
                        strokeWidth="2"
                        strokeDasharray={cluster.delta > 0 ? "none" : "2,2"}
                      />
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
}