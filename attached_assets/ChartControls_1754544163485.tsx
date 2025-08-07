import React from 'react';
import styled from 'styled-components';
import { ChartConfig } from '../types';

const ControlsContainer = styled.div<{ theme: string }>`
    display: flex;
    align-items: center;
    padding: 10px;
    background: ${props => props.theme === 'dark' ? '#1A1A1A' : '#FFFFFF'};
    border-bottom: 1px solid ${props => props.theme === 'dark' ? '#333' : '#E6E6E6'};
`;

const Button = styled.button<{ active?: boolean; theme: string }>`
    padding: 8px 16px;
    margin: 0 4px;
    border: 1px solid ${props => props.theme === 'dark' ? '#555' : '#ddd'};
    background: ${props => props.active ? (props.theme === 'dark' ? '#444' : '#e6e6e6') : 'transparent'};
    color: ${props => props.theme === 'dark' ? '#fff' : '#000'};
    border-radius: 4px;
    cursor: pointer;
    &:hover {
        background: ${props => props.theme === 'dark' ? '#444' : '#e6e6e6'};
    }
`;

interface Props {
    config: ChartConfig;
    onConfigChange: (config: Partial<ChartConfig>) => void;
    theme: string;
}

const ChartControls: React.FC<Props> = ({ config, onConfigChange, theme }) => {
    return (
        <ControlsContainer theme={theme}>
            <Button
                theme={theme}
                active={config.autoScroll}
                onClick={() => onConfigChange({ autoScroll: !config.autoScroll })}
            >
                {config.autoScroll ? '🔒 Auto' : '🔓 Manual'}
            </Button>
            <Button
                theme={theme}
                active={config.showClusters}
                onClick={() => onConfigChange({ showClusters: !config.showClusters })}
            >
                📊 Clusters
            </Button>
            <Button
                theme={theme}
                active={config.showVolumes}
                onClick={() => onConfigChange({ showVolumes: !config.showVolumes })}
            >
                📈 Volumes
            </Button>
            <Button
                theme={theme}
                onClick={() => onConfigChange({ theme: theme === 'light' ? 'dark' : 'light' })}
            >
                {theme === 'light' ? '🌙' : '☀️'}
            </Button>
        </ControlsContainer>
    );
};

export default ChartControls;