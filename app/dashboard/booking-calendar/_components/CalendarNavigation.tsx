'use client';

import React from 'react';
import { Button } from '@/app/components/ui/button';
import { format, addMonths, subMonths, isSameMonth } from 'date-fns';
import { ja } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface CalendarNavigationProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onViewChange?: (view: 'month' | 'week') => void;
  view?: 'month' | 'week';
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
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center space-x-2">
        <CalendarIcon className="h-5 w-5 text-gray-500" />
        <h3 className="text-lg font-medium">
          {format(currentDate, 'yyyy年 MMMM', { locale: ja })}
        </h3>
      </div>

      <div className="flex items-center space-x-2">
        {!isCurrentMonth && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={goToToday}
            className="text-xs"
          >
            今日
          </Button>
        )}
        
        {onViewChange && (
          <div className="flex border rounded-md overflow-hidden">
            <Button 
              variant={view === 'month' ? 'default' : 'ghost'} 
              size="sm"
              className="rounded-none border-0"
              onClick={() => onViewChange('month')}
            >
              月表示
            </Button>
            <Button 
              variant={view === 'week' ? 'default' : 'ghost'} 
              size="sm"
              className="rounded-none border-0"
              onClick={() => onViewChange('week')}
            >
              週表示
            </Button>
          </div>
        )}
        
        <div className="flex border rounded-md overflow-hidden">
          <Button 
            variant="ghost" 
            size="sm"
            className="rounded-none border-0 flex items-center justify-center p-1 w-8 h-8"
            onClick={goToPreviousMonth}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            className="rounded-none border-0 flex items-center justify-center p-1 w-8 h-8"
            onClick={goToNextMonth}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CalendarNavigation; 