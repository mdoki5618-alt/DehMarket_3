import React from 'react';

interface BarcodeProps {
  value: string;
  width?: number;
  height?: number;
  showText?: boolean;
  className?: string;
}

export default function Barcode({ 
  value, 
  width = 160, 
  height = 45, 
  showText = true, 
  className = '' 
}: BarcodeProps) {
  if (!value) return null;

  // Simple deterministic pattern generator for 1D barcode SVG
  const generateBarPattern = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    
    const bars: { width: number; space: number }[] = [];
    // Start guard
    bars.push({ width: 2, space: 1 });
    bars.push({ width: 1, space: 1 });
    
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      const w1 = (code % 3) + 1;
      const s1 = ((code * 2) % 3) + 1;
      const w2 = ((code * 5) % 3) + 1;
      const s2 = (code % 2) + 1;
      bars.push({ width: w1, space: s1 });
      bars.push({ width: w2, space: s2 });
    }
    
    // Stop guard
    bars.push({ width: 2, space: 1 });
    bars.push({ width: 2, space: 0 });
    return bars;
  };

  const pattern = generateBarPattern(value);
  let currentX = 8;
  const barElements: React.ReactNode[] = [];

  pattern.forEach((bar, idx) => {
    barElements.push(
      <rect
        key={idx}
        x={currentX}
        y={0}
        width={bar.width}
        height={height - (showText ? 14 : 0)}
        fill="black"
      />
    );
    currentX += bar.width + bar.space;
  });

  const totalWidth = currentX + 8;

  return (
    <div className={`inline-flex flex-col items-center ${className}`}>
      <svg
        viewBox={`0 0 ${totalWidth} ${height}`}
        width={width}
        height={height}
        className="overflow-visible"
      >
        {barElements}
      </svg>
      {showText && (
        <span className="text-[10px] font-mono tracking-widest text-slate-700 mt-0.5 font-bold dir-ltr">
          *{value}*
        </span>
      )}
    </div>
  );
}
