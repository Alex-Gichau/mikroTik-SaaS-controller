'use client';

import { motion } from 'framer-motion';

interface VUMeterProps {
  value: number; // 0 to 100
  label: string;
  unit?: string;
  color?: string;
}

export const VUMeter = ({ value, label, unit = '%', color = '#3b82f6' }: VUMeterProps) => {
  // Normalize value for visualization
  const clampedValue = Math.min(Math.max(value, 0), 100);

  return (
    <div className="flex flex-col gap-2 p-4 bg-black/20 rounded-xl backdrop-blur-sm border border-white/10">
      <div className="flex justify-between items-end">
        <span className="text-xs font-medium text-white/60 uppercase tracking-wider">{label}</span>
        <span className="text-lg font-bold text-white tabular-nums">
          {clampedValue}
          <span className="text-xs ml-1 opacity-50">{unit}</span>
        </span>
      </div>
      
      <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden flex items-center px-0.5">
        <motion.div
          className="h-2 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${clampedValue}%` }}
          transition={{ type: 'spring', stiffness: 50, damping: 15 }}
          style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}80` }}
        />
      </div>
      
      <div className="flex justify-between mt-1">
        {[0, 20, 40, 60, 80, 100].map((tick) => (
          <div key={tick} className="h-1 w-px bg-white/10" />
        ))}
      </div>
    </div>
  );
};
