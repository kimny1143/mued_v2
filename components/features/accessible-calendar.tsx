"use client";

import { useEffect, useRef, useState } from "react";

interface Slot {
  id: string;
  startTime: string;
}

interface AccessibleCalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  slots: Slot[];
}

export function AccessibleCalendar({
  selectedDate,
  onDateSelect,
  slots,
}: AccessibleCalendarProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(0);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const monthDays = getDaysInMonth(selectedDate);
  const today = new Date();

  const navigateMonth = (direction: number) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + direction);
    onDateSelect(newDate);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gridRef.current || !(e.target instanceof HTMLButtonElement)) return;

      const buttons = Array.from(
        gridRef.current.querySelectorAll('button[role="gridcell"]:not([disabled])')
      ) as HTMLButtonElement[];

      const currentIndex = buttons.findIndex((btn) => btn === e.target);
      if (currentIndex === -1) return;

      let newIndex = currentIndex;

      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          newIndex = Math.max(0, currentIndex - 7);
          break;
        case "ArrowDown":
          e.preventDefault();
          newIndex = Math.min(buttons.length - 1, currentIndex + 7);
          break;
        case "ArrowLeft":
          e.preventDefault();
          newIndex = Math.max(0, currentIndex - 1);
          break;
        case "ArrowRight":
          e.preventDefault();
          newIndex = Math.min(buttons.length - 1, currentIndex + 1);
          break;
        case "Home":
          e.preventDefault();
          newIndex = 0;
          break;
        case "End":
          e.preventDefault();
          newIndex = buttons.length - 1;
          break;
        case "PageUp":
          e.preventDefault();
          navigateMonth(-1);
          return;
        case "PageDown":
          e.preventDefault();
          navigateMonth(1);
          return;
      }

      if (newIndex !== currentIndex && buttons[newIndex]) {
        buttons[newIndex].focus();
        setFocusedIndex(newIndex);
      }
    };

    const grid = gridRef.current;
    if (grid) {
      grid.addEventListener("keydown", handleKeyDown);
      return () => grid.removeEventListener("keydown", handleKeyDown);
    }
  }, [selectedDate, monthDays]);

  const weekdayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-6 h-fit shadow-sm">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigateMonth(-1)}
          aria-label="Previous month"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
          {selectedDate.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
          })}
        </h3>
        <button
          onClick={() => navigateMonth(1)}
          aria-label="Next month"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>

      {/* Weekday Headers */}
      <div
        role="row"
        className="grid grid-cols-7 gap-2 mb-3"
        aria-label="Days of the week"
      >
        {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
          <div
            key={i}
            role="columnheader"
            aria-label={weekdayNames[i]}
            className="text-center text-xs font-semibold text-gray-500 uppercase"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div
        ref={gridRef}
        role="grid"
        aria-label={`Calendar for ${selectedDate.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        })}`}
        className="grid grid-cols-7 gap-2"
      >
        {monthDays.map((day, i) => {
          const isToday = day.toDateString() === today.toDateString();
          const isSelected = day.toDateString() === selectedDate.toDateString();
          const isPast = day < today && !isToday;

          const hasSlots = slots.some((slot) => {
            const slotDate = new Date(slot.startTime);
            return slotDate.toDateString() === day.toDateString();
          });

          return (
            <button
              key={i}
              role="gridcell"
              aria-selected={isSelected}
              aria-disabled={isPast}
              aria-label={day.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
              aria-current={isToday ? "date" : undefined}
              tabIndex={i === focusedIndex ? 0 : -1}
              onClick={() => !isPast && onDateSelect(day)}
              disabled={isPast}
              className={`
                aspect-square flex items-center justify-center text-sm font-medium rounded-lg transition-all
                ${isSelected ? "bg-[var(--color-brand-green)] text-white shadow-md scale-105" : ""}
                ${isToday && !isSelected ? "ring-2 ring-[var(--color-brand-green)] ring-offset-1" : ""}
                ${hasSlots && !isSelected ? "bg-blue-50 text-blue-700 font-semibold" : ""}
                ${isPast ? "text-gray-300 cursor-not-allowed" : "hover:bg-gray-100 hover:scale-105"}
                ${!isPast && !isSelected && !hasSlots ? "text-gray-700" : ""}
                focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-green)] focus:ring-offset-2
              `}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
        <p className="text-center">
          <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">←↑↓→</kbd> Navigate |{" "}
          <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">Page Up/Down</kbd> Month
        </p>
      </div>
    </div>
  );
}
