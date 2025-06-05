'use client';

import { format, addMonths, subMonths, isSameMonth } from 'date-fns';
import { ja } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import React from 'react';

import { Button } from '@/app/components/ui/button';

interface CalendarNavigationProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onViewChange?: (view: 'month' | 'week' | 'day') => void;
  view?: 'month' | 'week' | 'day';
}

export const CalendarNavigation: React.FC<CalendarNavigationProps> = ({
  currentDate,
  onDateChange,
  onViewChange,
  view = 'month'
}) => {
  const today = new Date();
  const isCurrentMonth = isSameMonth(today, currentDate);

  const goToPreviousMonth = () => {
    onDateChange(subMonths(currentDate, 1));
  };

  const goToNextMonth = () => {
    onDateChange(addMonths(currentDate, 1));
  };

  const goToToday = () => {
    onDateChange(today);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
      <div className="flex items-center space-x-2">
        <CalendarIcon className="h-5 w-5 text-gray-500" aria-hidden="true" />
        <h3 className="text-lg font-medium">
          {format(currentDate, 'yyyy年 MMMM', { locale: ja })}
        </h3>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {!isCurrentMonth && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={goToToday}
            className="text-xs"
            aria-label="今日の日付に移動"
          >
            今日
          </Button>
        )}
        
        {onViewChange && (
          <div className="flex border rounded-md overflow-hidden" role="radiogroup" aria-label="カレンダー表示モード">
            <Button 
              variant={view === 'month' ? 'default' : 'ghost'} 
              size="sm"
              className="rounded-none border-0"
              onClick={() => onViewChange('month')}
              aria-pressed={view === 'month'}
              aria-label="月表示"
            >
              月表示
            </Button>
            <Button 
              variant={view === 'week' ? 'default' : 'ghost'} 
              size="sm"
              className="rounded-none border-0"
              onClick={() => onViewChange('week')}
              aria-pressed={view === 'week'}
              aria-label="週表示"
            >
              週表示
            </Button>
            <Button 
              variant={view === 'day' ? 'default' : 'ghost'} 
              size="sm"
              className="rounded-none border-0"
              onClick={() => onViewChange('day')}
              aria-pressed={view === 'day'}
              aria-label="日表示"
            >
              日表示
            </Button>
          </div>
        )}
        
        <div className="flex border rounded-md overflow-hidden" role="group" aria-label="月の移動">
          <Button 
            variant="ghost" 
            size="sm"
            className="rounded-none border-0 flex items-center justify-center p-1 w-8 h-8"
            onClick={goToPreviousMonth}
            aria-label="前月へ"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            className="rounded-none border-0 flex items-center justify-center p-1 w-8 h-8"
            onClick={goToNextMonth}
            aria-label="翌月へ"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CalendarNavigation; 