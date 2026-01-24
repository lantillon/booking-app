'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Booking } from '@/types';
import { formatTimeToAMPM } from '@/lib/utils';

interface CalendarProps {
  bookings: Booking[];
  onDateClick?: (date: string, bookings: Booking[]) => void;
}

type ViewMode = 'month' | 'week';

export default function Calendar({ bookings, onDateClick }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const bookingDetailsRef = useRef<HTMLDivElement>(null);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayNamesShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getBookingsForDate = (date: string): Booking[] => {
    return bookings.filter(booking => booking.date === date);
  };

  const getBookingsForTimeSlot = (date: string, hour: number): Booking[] => {
    return getBookingsForDate(date).filter(booking => {
      const [bookingHour] = booking.time.split(':').map(Number);
      return bookingHour === hour;
    });
  };

  // Clear selected date if it no longer has bookings
  useEffect(() => {
    if (selectedDate && getBookingsForDate(selectedDate).length === 0) {
      setSelectedDate(null);
    }
  }, [bookings, selectedDate]);

  // Compute sorted bookings for selected date
  const sortedSelectedDateBookings: Booking[] = useMemo<Booking[]>(() => {
    if (!selectedDate) return [];
    const dateBookings = getBookingsForDate(selectedDate);
    return dateBookings.slice().sort((a, b) => a.time.localeCompare(b.time));
  }, [selectedDate, bookings, getBookingsForDate]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
    setSelectedDate(null);
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setDate(prev.getDate() - 7);
      } else {
        newDate.setDate(prev.getDate() + 7);
      }
      return newDate;
    });
    setSelectedDate(null);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(null);
  };

  const handleDateClick = (date: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setSelectedDate(date);
    // Don't clear selected booking if clicking the same date
    if (selectedDate !== date) {
      setSelectedBooking(null);
    }
    const dateBookings = getBookingsForDate(date);
    if (onDateClick) {
      onDateClick(date, dateBookings);
    }
  };

  const handleBookingClick = (booking: Booking, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    console.log('Booking clicked:', booking);
    setSelectedBooking(booking);
    setSelectedDate(booking.date);
    
    // Scroll to booking details after state update
    setTimeout(() => {
      bookingDetailsRef.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }, 100);
  };

  const getDirections = (address: string) => {
    if (!address || address.trim() === '') {
      alert('No address provided for this booking');
      return;
    }
    // Open Google Maps with directions
    const encodedAddress = encodeURIComponent(address.trim());
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
    console.log('Opening directions to:', address);
    window.open(mapsUrl, '_blank');
  };

  const getWeekDates = (date: Date): Date[] => {
    const week: Date[] = [];
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day;
    startOfWeek.setDate(diff);

    for (let i = 0; i < 7; i++) {
      const currentDay = new Date(startOfWeek);
      currentDay.setDate(startOfWeek.getDate() + i);
      week.push(currentDay);
    }
    return week;
  };

  const getTimeSlots = (): number[] => {
    const slots: number[] = [];
    for (let hour = 0; hour < 24; hour++) {
      slots.push(hour);
    }
    return slots;
  };

  const formatTime = (hour: number): string => {
    if (hour === 0) return '12:00 AM';
    if (hour < 12) return `${hour}:00 AM`;
    if (hour === 12) return '12:00 PM';
    return `${hour - 12}:00 PM`;
  };

  const getBookingPosition = (booking: Booking): { top: number; height: number } => {
    const [hour, minute] = booking.time.split(':').map(Number);
    const top = (hour * 60 + minute) * (100 / (24 * 60)); // Percentage from top
    const height = (booking.duration / (24 * 60)) * 100; // Percentage height
    return { top, height };
  };

  const renderMonthlyView = () => {
    const getDaysInMonth = (date: Date) => {
      return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date: Date) => {
      return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };

    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days: (Date | null)[] = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
    }

    const today = new Date();
    const todayString = formatDate(today);

    const timeSlots = [9, 10, 11, 12, 13, 14, 15, 16, 17]; // 9 AM to 5 PM

    return (
      <div className="overflow-x-auto">
        <div className="min-w-[1000px]">
          {/* Day Names Header */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {dayNamesShort.map(day => (
              <div key={day} className="text-center font-bold text-black py-2 text-sm bg-gray-100 rounded">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid with Time Slots */}
          <div className="grid grid-cols-7 gap-2">
            {days.map((date, index) => {
              if (!date) {
                return (
                  <div key={index} className="min-h-[280px] bg-gray-50 rounded-lg border-2 border-gray-200" />
                );
              }

              const dateString = formatDate(date);
              const dateBookings = getBookingsForDate(dateString);
              const isToday = dateString === todayString;
              const isSelected = selectedDate === dateString;
              const isCurrentMonth = date.getMonth() === currentDate.getMonth();

              return (
                <div
                  key={index}
                  onClick={() => handleDateClick(dateString)}
                  className={`
                    min-h-[280px] rounded-lg border-2 text-sm transition-all relative cursor-pointer
                    ${!isCurrentMonth ? 'text-gray-400 bg-gray-50 border-gray-200' : 'text-black bg-white border-gray-300'}
                    ${isToday ? 'border-blue-500 bg-blue-50 shadow-md' : ''}
                    ${isSelected ? 'bg-blue-100 border-blue-500 shadow-lg' : ''}
                    hover:bg-gray-100 hover:shadow-md
                  `}
                >
                  {/* Day Number in Corner */}
                  <div className={`absolute top-1.5 left-2 font-bold text-base ${isToday ? 'text-blue-700' : 'text-black'}`}>
                    {date.getDate()}
                  </div>

                  {/* Time Slots Grid */}
                  <div className="mt-6 space-y-0.5 p-1">
                    {timeSlots.map(hour => {
                      const hourBookings = dateBookings.filter(booking => {
                        const [bookingHour] = booking.time.split(':').map(Number);
                        return bookingHour === hour;
                      });

                      return (
                        <div
                          key={hour}
                          className="relative h-7 border-b border-gray-200 text-xs"
                        >
                          <div className="absolute left-0 top-0 text-gray-500 text-[9px] px-0.5">
                            {formatTime(hour)}
                          </div>
                          {hourBookings.map(booking => {
                            const [bookingHour, bookingMinute] = booking.time.split(':').map(Number);
                            const slotStartMinutes = hour * 60;
                            const bookingStartMinutes = bookingHour * 60 + bookingMinute;
                            const slotTop = Math.max(0, bookingStartMinutes - slotStartMinutes) / 60 * 100;
                            const slotHeight = Math.min(booking.duration / 60, 1) * 100;

                            return (
                              <div
                                key={booking.id}
                                className="absolute left-7 right-1 rounded bg-indigo-500 text-white p-0.5 text-[9px] shadow-sm z-10 cursor-pointer hover:bg-sky-400 transition-colors"
                                style={{
                                  top: `${slotTop}%`,
                                  height: `${Math.max(slotHeight, 25)}%`,
                                  minHeight: '14px',
                                }}
                                title={`${formatTimeToAMPM(booking.time)} - ${booking.customerName} - ${booking.serviceName}`}
                                onClick={(e) => handleBookingClick(booking, e)}
                              >
                                <div className="font-semibold truncate leading-tight">{formatTimeToAMPM(booking.time)}</div>
                                <div className="truncate leading-tight">{booking.customerName.split(' ')[0]}</div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>

                  {/* Show count if there are bookings outside the visible hours */}
                  {dateBookings.length > 0 && (
                    <div className="absolute bottom-1.5 right-1.5 text-[10px] bg-indigo-500 text-white rounded-full px-1.5 py-0.5 font-semibold">
                      {dateBookings.length}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderWeeklyView = () => {
    const weekDates = getWeekDates(currentDate);
    const timeSlots = getTimeSlots();
    const today = new Date();
    const todayString = formatDate(today);

    return (
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Time column and day columns */}
          <div className="grid grid-cols-8 gap-1">
            {/* Time column header */}
            <div className="sticky left-0 z-10 bg-white border-r-2 border-gray-300"></div>
            
            {/* Day headers */}
            {weekDates.map((date, idx) => {
              const dateString = formatDate(date);
              const isToday = dateString === todayString;
              const dateBookings = getBookingsForDate(dateString);
              
              return (
                <div
                  key={idx}
                  className={`
                    text-center p-2 border-b-2 font-bold
                    ${isToday ? 'bg-blue-100 border-blue-500' : 'bg-gray-100 border-gray-300'}
                  `}
                >
                  <div className="text-xs text-black">{dayNamesShort[date.getDay()]}</div>
                  <div className={`text-lg ${isToday ? 'text-blue-700' : 'text-black'}`}>
                    {date.getDate()}
                  </div>
                  <div className="text-xs text-black">
                    {dateBookings.length} {dateBookings.length === 1 ? 'booking' : 'bookings'}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Time slots and appointments */}
          <div className="grid grid-cols-8 gap-1 border-t-2 border-gray-300">
            {/* Time labels column */}
            <div className="sticky left-0 z-10 bg-white border-r-2 border-gray-300">
              {timeSlots.map(hour => (
                <div
                  key={hour}
                  className="h-16 border-b border-gray-200 flex items-start justify-end pr-2 pt-1"
                >
                  <span className="text-xs text-gray-600">{formatTime(hour)}</span>
                </div>
              ))}
            </div>

            {/* Day columns with appointments */}
            {weekDates.map((date, dayIdx) => {
              const dateString = formatDate(date);
              const dateBookings = getBookingsForDate(dateString);
              const isToday = dateString === todayString;

              return (
                <div
                  key={dayIdx}
                  className={`
                    relative border-r border-gray-200
                    ${isToday ? 'bg-blue-50' : 'bg-white'}
                  `}
                >
                  {timeSlots.map(hour => (
                    <div
                      key={hour}
                      className="h-16 border-b border-gray-100 relative"
                    >
                      {dateBookings
                        .filter(booking => {
                          const [bookingHour] = booking.time.split(':').map(Number);
                          return bookingHour === hour;
                        })
                        .map(booking => {
                          const position = getBookingPosition(booking);
                          const [bookingHour, bookingMinute] = booking.time.split(':').map(Number);
                          const slotStartMinutes = hour * 60;
                          const slotEndMinutes = (hour + 1) * 60;
                          const bookingStartMinutes = bookingHour * 60 + bookingMinute;
                          const bookingEndMinutes = bookingStartMinutes + booking.duration;
                          
                          // Only show if booking overlaps with this hour slot
                          if (bookingEndMinutes <= slotStartMinutes || bookingStartMinutes >= slotEndMinutes) {
                            return null;
                          }

                          // Calculate position within this hour slot
                          const slotTop = Math.max(0, bookingStartMinutes - slotStartMinutes) / 60 * 100;
                          const slotHeight = Math.min(booking.duration / 60, (slotEndMinutes - bookingStartMinutes) / 60) * 100;

                          return (
                            <div
                              key={booking.id}
                              className="absolute left-1 right-1 rounded-md bg-indigo-500 text-white p-1.5 text-xs shadow-lg z-20 cursor-pointer hover:bg-sky-400 transition-all hover:shadow-xl border border-sky-400"
                              style={{
                                top: `${slotTop}%`,
                                height: `${Math.max(slotHeight, 8)}%`,
                                minHeight: '32px',
                              }}
                              title={`${formatTimeToAMPM(booking.time)} - ${booking.customerName} - ${booking.serviceName} - ${booking.duration} min`}
                              onClick={(e) => handleBookingClick(booking, e)}
                            >
                              <div className="font-bold truncate mb-0.5">{formatTimeToAMPM(booking.time)}</div>
                              <div className="truncate font-semibold">{booking.customerName}</div>
                              <div className="truncate text-xs opacity-90">{booking.serviceName}</div>
                            </div>
                          );
                        })}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => viewMode === 'month' ? navigateMonth('prev') : navigateWeek('prev')}
            className="px-4 py-2 rounded-lg hover:bg-gray-100 text-black font-bold text-lg transition-colors"
          >
            ←
          </button>
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-black">
              {viewMode === 'month' 
                ? `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`
                : (() => {
                    const weekDates = getWeekDates(currentDate);
                    return `Week of ${weekDates[0]?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekDates[6]?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
                  })()
              }
            </h2>
            <button
              onClick={goToToday}
              className="px-4 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 text-black font-medium transition-colors"
            >
              Today
            </button>
          </div>
          <button
            onClick={() => viewMode === 'month' ? navigateMonth('next') : navigateWeek('next')}
            className="px-4 py-2 rounded-lg hover:bg-gray-100 text-black font-bold text-lg transition-colors"
          >
            →
          </button>
        </div>

        {/* View Toggle */}
        <div className="flex gap-2 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('month')}
            className={`px-4 py-2 rounded-md font-medium transition-all ${
              viewMode === 'month'
                ? 'bg-white text-black shadow-md'
                : 'text-black hover:bg-gray-200'
            }`}
          >
            Month
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`px-4 py-2 rounded-md font-medium transition-all ${
              viewMode === 'week'
                ? 'bg-white text-black shadow-md'
                : 'text-black hover:bg-gray-200'
            }`}
          >
            Week
          </button>
        </div>
      </div>

      {/* Calendar Content */}
      {viewMode === 'month' ? renderMonthlyView() : renderWeeklyView()}

      {/* Selected Booking Details */}
      {selectedBooking && (
        <div ref={bookingDetailsRef} className="mt-6 border-t-2 border-gray-300 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-xl text-black">
              Booking Details - {selectedBooking.customerName}
            </h3>
            <button
              onClick={() => setSelectedBooking(null)}
              className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded-md text-black"
            >
              Close
            </button>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-lg border-2 border-sky-400">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-bold text-lg text-black mb-2">{selectedBooking.customerName}</h4>
                <p className="text-sm text-black mb-1">📧 {selectedBooking.customerEmail}</p>
                {selectedBooking.customerPhone && (
                  <p className="text-sm text-black mb-1">📞 {selectedBooking.customerPhone}</p>
                )}
                <p className="text-sm text-black mt-3">
                  <strong>Date:</strong> {new Date(selectedBooking.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
                <p className="text-sm text-black">
                  <strong>Time:</strong> {formatTimeToAMPM(selectedBooking.time)}
                </p>
              </div>
              <div>
                <p className="text-sm text-black mb-2">
                  <strong>Service:</strong> {selectedBooking.serviceName}
                </p>
                {selectedBooking.addOnNames.length > 0 && (
                  <p className="text-sm text-black mb-2">
                    <strong>Add-ons:</strong> {selectedBooking.addOnNames.join(', ')}
                  </p>
                )}
                <p className="text-sm text-black mb-2">
                  <strong>Duration:</strong> {selectedBooking.duration} minutes
                </p>
                <p className="text-sm text-black mb-2">
                  <strong>Total:</strong> ${selectedBooking.totalPrice.toFixed(2)}
                </p>
                <div className="mt-4">
                  <p className="text-sm text-black mb-2">
                    <strong>📍 Location:</strong>
                  </p>
                  <p className="text-sm text-black bg-gray-50 p-2 rounded mb-3">
                    {selectedBooking.location || 'Not provided'}
                  </p>
                  {selectedBooking.location && (
                    <button
                      onClick={() => getDirections(selectedBooking.location)}
                      className="w-full px-4 py-3 bg-sky-400 hover:bg-sky-500 text-black rounded-md font-medium transition-colors flex items-center justify-center gap-2 shadow-md"
                    >
                      Get Directions to Customer
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Selected Date Bookings Details */}
      {selectedDate && !selectedBooking && (
        <div className="mt-6 border-t-2 border-gray-300 pt-6">
          <h3 className="font-bold text-xl text-black mb-4">
            Bookings for {new Date(selectedDate).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </h3>
          {sortedSelectedDateBookings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedSelectedDateBookings.map((booking) => {
                // @ts-ignore - TypeScript inference issue, booking is correctly typed as Booking
                const b: Booking = booking;
                return (
                  <div
                    key={b.id}
                    className={`border-2 rounded-lg p-4 bg-gradient-to-br from-indigo-50 to-blue-50 shadow-md hover:shadow-lg transition-all cursor-pointer ${
                      // @ts-ignore - TypeScript inference issue
                      selectedBooking?.id === b.id 
                        ? 'border-sky-500 ring-2 ring-sky-300' 
                        : 'border-gray-200'
                    }`}
                    onClick={() => setSelectedBooking(b)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-bold text-lg text-black">{b.customerName}</div>
                      <div className="px-2 py-1 bg-indigo-500 text-white rounded text-sm font-semibold">
                        {formatTimeToAMPM(b.time)}
                      </div>
                    </div>
                    <div className="text-sm text-black mb-1">{b.customerEmail}</div>
                    {b.customerPhone && (
                      <div className="text-sm text-black mb-1">📞 {b.customerPhone}</div>
                    )}
                    <div className="text-sm text-black mt-2">
                      <strong>Location:</strong> {b.location || 'Not provided'}
                    </div>
                    <div className="text-sm text-black mt-2">
                      <strong>Service:</strong> {b.serviceName}
                    </div>
                    {b.addOnNames.length > 0 && (
                      <div className="text-sm text-black">
                        <strong>Add-ons:</strong> {b.addOnNames.join(', ')}
                      </div>
                    )}
                    <div className="text-sm text-black">
                      <strong>Duration:</strong> {b.duration} minutes
                    </div>
                    <div className="text-lg font-bold text-black mt-2">
                      Total: ${b.totalPrice.toFixed(2)}
                    </div>
                    {b.location && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          getDirections(b.location);
                        }}
                        className="mt-3 w-full px-4 py-2 bg-sky-400 hover:bg-sky-500 text-black rounded-md font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <span>🗺️</span>
                        Get Directions
                      </button>
                    )}
                  </div>
                );
              })}
              </div>
          ) : (
            <p className="text-black text-center py-4">No bookings for this date.</p>
          )}
        </div>
      )}
    </div>
  );
}
