'use client';

import React from 'react';

import { Card } from '@/app/components/ui/card';

export const ReservationSkeleton: React.FC = () => (
  <div className="space-y-8">
    {/* 予約済みレッスンのスケルトン */}
    <div className="space-y-4">
      <div className="h-8 bg-gray-200 rounded animate-pulse w-48" />
      <div className="grid gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded animate-pulse w-32" />
                <div className="h-3 bg-gray-200 rounded animate-pulse w-24" />
                <div className="h-3 bg-gray-200 rounded animate-pulse w-20" />
              </div>
              <div className="h-6 bg-gray-200 rounded animate-pulse w-16" />
            </div>
          </Card>
        ))}
      </div>
    </div>

    {/* 予約可能なレッスンのスケルトン */}
    <div className="space-y-4">
      <div className="h-8 bg-gray-200 rounded animate-pulse w-48" />
      <div className="grid gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded animate-pulse w-32" />
                <div className="h-3 bg-gray-200 rounded animate-pulse w-24" />
                <div className="h-3 bg-gray-200 rounded animate-pulse w-20" />
                <div className="h-3 bg-gray-200 rounded animate-pulse w-16" />
              </div>
              <div className="space-y-2">
                <div className="h-6 bg-gray-200 rounded animate-pulse w-16" />
                <div className="h-8 bg-gray-200 rounded animate-pulse w-20" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  </div>
); 