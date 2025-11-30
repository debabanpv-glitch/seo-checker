'use client';

import { useEffect, useState } from 'react';

interface ScoreCircleProps {
  score: number;
  maxScore: number;
  size?: 'sm' | 'md' | 'lg';
}

export default function ScoreCircle({ score, maxScore, size = 'lg' }: ScoreCircleProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const percentage = Math.round((score / maxScore) * 100);

  const sizes = {
    sm: { width: 80, radius: 32, stroke: 6, fontSize: 'text-xl' },
    md: { width: 120, radius: 50, stroke: 8, fontSize: 'text-3xl' },
    lg: { width: 180, radius: 75, stroke: 10, fontSize: 'text-5xl' },
  };

  const { width, radius, stroke, fontSize } = sizes[size];
  const center = width / 2;

  useEffect(() => {
    const duration = 1500;
    const steps = 60;
    const increment = percentage / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= percentage) {
        setAnimatedScore(percentage);
        clearInterval(timer);
      } else {
        setAnimatedScore(Math.round(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [percentage]);

  const getColor = () => {
    if (percentage >= 80) return { main: '#22C55E', glow: 'rgba(34, 197, 94, 0.3)' };
    if (percentage >= 60) return { main: '#F7C600', glow: 'rgba(247, 198, 0, 0.3)' };
    return { main: '#EF4444', glow: 'rgba(239, 68, 68, 0.3)' };
  };

  const { main, glow } = getColor();
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      {/* Glow effect */}
      <div
        className="absolute rounded-full blur-2xl opacity-50 transition-all duration-500"
        style={{
          width: width * 0.8,
          height: width * 0.8,
          backgroundColor: glow,
        }}
      />

      <svg width={width} height={width} className="transform -rotate-90 relative z-10">
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={stroke}
        />
        {/* Track circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={stroke}
          strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
          strokeLinecap="round"
        />
        {/* Progress circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={main}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{
            transition: 'stroke-dashoffset 0.1s ease-out',
            filter: `drop-shadow(0 0 8px ${glow})`,
          }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
        <span className={`${fontSize} font-black`} style={{ color: main }}>
          {animatedScore}
        </span>
        <span className="text-sm text-gray-500 font-medium">/100</span>
      </div>
    </div>
  );
}
