import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface VolumeProfileControlsProps {
  onTimeRangeChange: (range: string) => void;
  currentTimeRange: string;
}

export default function VolumeProfileControls({ onTimeRangeChange, currentTimeRange }: VolumeProfileControlsProps) {
  const timeRanges = [
    { value: '1h', label: '1 час' },
    { value: '4h', label: '4 часа' },
    { value: '12h', label: '12 часов' },
    { value: '1d', label: '1 день' },
    { value: '3d', label: '3 дня' },
    { value: '1w', label: '1 неделя' },
    { value: 'all', label: 'Все данные' }
  ];

  return (
    <div className="absolute top-2 right-2 z-40 bg-zinc-900/80 border border-zinc-700/50 rounded-md p-2">
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-400">Объёмы:</span>
        <Select value={currentTimeRange} onValueChange={onTimeRangeChange}>
          <SelectTrigger className="w-24 h-6 text-xs bg-transparent border-zinc-600">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {timeRanges.map((range) => (
              <SelectItem key={range.value} value={range.value}>
                {range.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}