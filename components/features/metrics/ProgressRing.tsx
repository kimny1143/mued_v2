/**
 * Progress Ring Component
 *
 * 学習進捗を視覚化する円形プログレスバー
 */

'use client';

import React from 'react';

export interface ProgressRingProps {
  value: number; // 0-100
  label: string;
  color: string;
  size?: number; // ピクセル単位の直径
  strokeWidth?: number;
  title?: string;
}

export function ProgressRing({
  value,
  label,
  color,
  size = 120,
  strokeWidth = 8,
  title,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      {title && <p className="text-sm font-medium text-gray-700">{title}</p>}

      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* 背景の円 */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
          />

          {/* 進捗の円 */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dashoffset 0.5s ease-in-out',
            }}
          />
        </svg>

        {/* 中央のラベル */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-gray-900">{label}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * 3つのリングを横並びで表示
 */
export interface ProgressRingsGroupProps {
  achievement: {
    value: number;
    label: string;
    color: string;
  };
  tempo: {
    value: number;
    label: string;
    color: string;
  };
  practice: {
    value: number;
    label: string;
    color: string;
  };
}

export function ProgressRingsGroup({ achievement, tempo, practice }: ProgressRingsGroupProps) {
  return (
    <div className="flex flex-wrap justify-center gap-8 md:gap-12">
      <ProgressRing
        value={achievement.value}
        label={achievement.label}
        color={achievement.color}
        title="Achievement Rate"
      />

      <ProgressRing
        value={tempo.value}
        label={tempo.label}
        color={tempo.color}
        title="Tempo Achievement"
      />

      <ProgressRing
        value={practice.value}
        label={practice.label}
        color={practice.color}
        title="Practice Time"
      />
    </div>
  );
}

/**
 * 弱点箇所の表示
 */
export interface WeakSpot {
  startBar: number;
  endBar: number;
  loopCount: number;
  lastPracticedAt: string;
}

export interface WeakSpotsListProps {
  weakSpots: WeakSpot[];
}

export function WeakSpotsList({ weakSpots }: WeakSpotsListProps) {
  if (weakSpots.length === 0) {
    return (
      <div className="text-center text-gray-500">
        <p>No weak spots identified yet. Keep practicing!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-gray-900">Weak Spots</h3>

      <ul className="space-y-2">
        {weakSpots.map((spot, index) => (
          <li
            key={`${spot.startBar}-${spot.endBar}-${index}`}
            className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 text-orange-700">
                <span className="text-sm font-bold">{index + 1}</span>
              </div>

              <div>
                <p className="font-medium text-gray-900">
                  Bars {spot.startBar}-{spot.endBar}
                </p>
                <p className="text-sm text-gray-500">
                  Practiced {spot.loopCount} times
                </p>
              </div>
            </div>

            <div className="text-right text-sm text-gray-500">
              {new Date(spot.lastPracticedAt).toLocaleDateString()}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
