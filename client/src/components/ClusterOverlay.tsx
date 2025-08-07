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

  const getClusterColor = (cluster: Cluster, isHovered: boolean) => {
    const isGreen = cluster.delta > 0;
    const intensity = Math.min(Math.abs(cluster.aggression), 1);
    const opacity = isHovered ? 0.9 : Math.max(0.4, intensity * 0.8);
    return isGreen 
      ? `rgba(74, 222, 128, ${opacity})` 
      : `rgba(248, 113, 113, ${opacity})`;
  };

  const getClusterWidth = (cluster: Cluster, maxVolume: number) => {
    return Math.max(3, (cluster.volume / maxVolume) * 20);
  };

  const handleClusterClick = (cluster: Cluster, x: number, y: number) => {
    onClusterHover?.(cluster, x, y);
  };

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || candleData.length === 0) return;

    const rect = svg.getBoundingClientRect();
    const candleSpacing = 60 * zoom;
    const startX = 35 - pan;
    const clusterHeight = 8;

    // Calculate max volume for scaling
    const allClusters = candleData.flatMap(candle => candle.clusters);
    const maxVolume = Math.max(...allClusters.map(c => c.volume));

    const clusters: JSX.Element[] = [];

    candleData.forEach((candle, candleIndex) => {
      const candleX = startX + candleIndex * candleSpacing;
      
      // Skip if candle is outside visible area
      if (candleX < -candleSpacing || candleX > rect.width + candleSpacing) return;

      candle.clusters.forEach((cluster, clusterIndex) => {
        const clusterY = priceToY(cluster.price, rect.height);
        const clusterWidth = getClusterWidth(cluster, maxVolume);
        const clusterId = `${candleIndex}-${clusterIndex}`;
        const isHovered = hoveredCluster === clusterId;
        const isLargest = cluster === candle.clusters[0]; // First cluster is largest by volume

        clusters.push(
          <rect
            key={clusterId}
            x={candleX}
            y={clusterY - clusterHeight / 2}
            width={clusterWidth}
            height={clusterHeight}
            fill={getClusterColor(cluster, isHovered)}
            stroke={isLargest ? "white" : "none"}
            strokeWidth={isLargest ? 1 : 0}
            className="transition-all duration-200 cursor-pointer"
            onMouseEnter={(e) => {
              setHoveredCluster(clusterId);
              const rect = e.currentTarget.getBoundingClientRect();
              handleClusterClick(cluster, rect.left + rect.width / 2, rect.top);
            }}
            onMouseLeave={() => {
              setHoveredCluster(null);
              onClusterHover?.(null, 0, 0);
            }}
          />
        );
      });
    });

    return () => {
      // Cleanup if needed
    };
  }, [candleData, priceRange, zoom, pan, hoveredCluster, onClusterHover]);

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 w-full h-full"
      style={{ zIndex: 4 }}
    >
      {candleData.length > 0 && (() => {
        const rect = svgRef.current?.getBoundingClientRect();
        if (!rect) return null;

        const candleSpacing = 60 * zoom;
        const startX = 35 - pan;
        const clusterHeight = 8;

        // Calculate max volume for scaling
        const allClusters = candleData.flatMap(candle => candle.clusters);
        const maxVolume = Math.max(...allClusters.map(c => c.volume));

        return candleData.map((candle, candleIndex) => {
          const candleX = startX + candleIndex * candleSpacing;
          
          // Skip if candle is outside visible area
          if (candleX < -candleSpacing || candleX > rect.width + candleSpacing) return null;

          return (
            <g key={candleIndex}>
              {candle.clusters.map((cluster, clusterIndex) => {
                const clusterY = priceToY(cluster.price, rect.height);
                const clusterWidth = getClusterWidth(cluster, maxVolume);
                const clusterId = `${candleIndex}-${clusterIndex}`;
                const isHovered = hoveredCluster === clusterId;
                const isLargest = cluster === candle.clusters[0]; // First cluster is largest by volume

                return (
                  <rect
                    key={clusterId}
                    x={candleX}
                    y={clusterY - clusterHeight / 2}
                    width={clusterWidth}
                    height={clusterHeight}
                    fill={getClusterColor(cluster, isHovered)}
                    stroke={isLargest ? "white" : "none"}
                    strokeWidth={isLargest ? 1 : 0}
                    className="transition-all duration-200 cursor-pointer"
                    onMouseEnter={(e) => {
                      setHoveredCluster(clusterId);
                      const svgRect = svgRef.current?.getBoundingClientRect();
                      if (svgRect) {
                        const x = svgRect.left + candleX + clusterWidth / 2;
                        const y = svgRect.top + clusterY;
                        handleClusterClick(cluster, x, y);
                      }
                    }}
                    onMouseLeave={() => {
                      setHoveredCluster(null);
                      onClusterHover?.(null, 0, 0);
                    }}
                  />
                );
              })}
            </g>
          );
        });
      })()}
    </svg>
  );
}
