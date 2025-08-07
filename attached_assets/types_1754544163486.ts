export interface PriceLevel {
    price: number;
    volume: number;
    buyVolume: number;
    sellVolume: number;
    delta: number;
    aggression: number;
}

export interface Cluster {
    price: number;
    volume: number;
    buyVolume: number;
    sellVolume: number;
    delta: number;
    aggression: number;
}

export interface CandleData {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    buyVolume: number;
    sellVolume: number;
    delta: number;  // Обязательное поле
    clusters: Cluster[];
}

export interface ChartConfig {
    theme: 'light' | 'dark';
    autoScroll: boolean;
    showClusters: boolean;
    showVolumes: boolean;
    gridVisible: boolean;
    clusterStep: number;
}

export interface VolumeProfileData {
    price: number;
    totalVolume: number;
    buyVolume: number;
    sellVolume: number;
}

export interface ChartHoverEvent {
    time: number;
    price: number;
    x: number;
    y: number;
}