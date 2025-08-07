export interface ChartDimensions {
  width: number;
  height: number;
}

export interface ChartPosition {
  x: number;
  y: number;
}

export interface ChartScale {
  zoom: number;
  pan: number;
}

export interface HoverState {
  isHovered: boolean;
  element: string | null;
  position: ChartPosition;
  data: any;
}

export interface CrosshairState extends ChartPosition {
  visible: boolean;
  price: number;
  time: number;
}

export interface TooltipState extends ChartPosition {
  visible: boolean;
  data: any;
}

export interface ChartConfig {
  candleWidth: number;
  candleSpacing: number;
  clusterHeight: number;
  maxClusterWidth: number;
  priceLineCount: number;
  volumeProfileWidth: number;
  orderBookWidth: number;
  volumeHistogramHeight: number;
}

export const defaultChartConfig: ChartConfig = {
  candleWidth: 12,
  candleSpacing: 60,
  clusterHeight: 8,
  maxClusterWidth: 20,
  priceLineCount: 10,
  volumeProfileWidth: 80,
  orderBookWidth: 192, // 48 * 4 (w-48 in Tailwind)
  volumeHistogramHeight: 64, // 16 * 4 (h-16 in Tailwind)
};

export interface ChartEventHandlers {
  onMouseMove?: (event: React.MouseEvent) => void;
  onMouseLeave?: () => void;
  onWheel?: (event: React.WheelEvent) => void;
  onMouseDown?: (event: React.MouseEvent) => void;
  onMouseUp?: () => void;
  onClusterHover?: (data: any, x: number, y: number) => void;
}
