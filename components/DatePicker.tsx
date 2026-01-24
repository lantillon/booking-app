'use client';

import { useState } from 'react';

interface DatePickerProps {
  selectedDate: string;
  onDateSelect: (date: string) => void;
  minDate?: string;
  maxDate?: string;
}

export default function DatePicker({ selectedDate, onDateSelect, minDate, maxDate }: DatePickerProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate ? new Date(selectedDate) : new Date()));

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const isDateDisabled = (date: Date): boolean => {
    const dateStr = formatDate(date);
    if (minDate && dateStr < minDate) return true;
    if (maxDate && dateStr > maxDate) return true;
    const today = new Date();
    today.setHours(12, 0, 0, 0); // Use noon to avoid timezone issues
    const todayStr = formatDate(today);
    return dateStr < todayStr;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const handleDateClick = (day: number) => {
    // Create date in local timezone to avoid timezone issues
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const date = new Date(year, month, day, 12, 0, 0, 0); // Use noon to avoid timezone shifts
    if (!isDateDisabled(date)) {
      const dateString = formatDate(date);
      onDateSelect(dateString);
    }
  };

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const days: (number | null)[] = [];

  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day);
  }

  // Get today's date string for comparison
  const today = new Date();
  today.setHours(12, 0, 0, 0); // Use noon to avoid timezone issues
  const todayString = formatDate(today);

  return (
    <div className="bg-white/20 backdrop-blur-md rounded-lg border border-white/30 p-2 shadow-md max-w-xs mx-auto">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => navigateMonth('prev')}
          className="px-2 py-0.5 rounded hover:bg-white/30 backdrop-blur-sm text-black font-bold text-sm"
        >
          ←
        </button>
        <h3 className="text-sm font-bold text-black">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h3>
        <button
          onClick={() => navigateMonth('next')}
          className="px-2 py-0.5 rounded hover:bg-white/30 backdrop-blur-sm text-black font-bold text-sm"
        >
          →
        </button>
      </div>

      {/* Day Names */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {dayNames.map(day => (
          <div key={day} className="text-center font-semibold text-black py-1 text-[10px]">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((day, index) => {
          if (day === null) {
            return <div key={index} className="aspect-square" />;
          }

          // Create date in local timezone using noon to avoid timezone shifts
          const year = currentMonth.getFullYear();
          const month = currentMonth.getMonth();
          const date = new Date(year, month, day, 12, 0, 0, 0);
          const dateString = formatDate(date);
          const isToday = dateString === todayString;
          // Compare date strings directly to avoid timezone issues
          const isSelected = selectedDate && selectedDate === dateString;
          const isDisabled = isDateDisabled(date);
          const isCurrentMonth = date.getMonth() === currentMonth.getMonth();

          return (
            <button
              key={index}
              type="button"
              onClick={() => handleDateClick(day)}
              disabled={isDisabled}
              className={`
                aspect-square rounded text-xs transition-colors
                ${!isCurrentMonth ? 'text-gray-300' : 'text-black'}
                ${isDisabled ? 'cursor-not-allowed opacity-30' : 'cursor-pointer hover:bg-gray-100'}
                ${isToday ? 'border border-blue-400 font-bold' : ''}
                ${isSelected ? 'bg-blue-400/70 text-white font-bold' : 'bg-white/30'}
                ${isSelected && isToday ? 'bg-blue-500' : ''}
              `}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Selected Date Display */}
      {selectedDate && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <p className="text-xs text-black">
            <strong>Selected:</strong> {new Date(selectedDate).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
          </p>
        </div>
      )}
    </div>
  );
}

