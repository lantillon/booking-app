/**
 * Converts 24-hour time format (HH:MM) to 12-hour format with AM/PM
 * @param timeString - Time in 24-hour format (e.g., "14:30")
 * @returns Time in 12-hour format with AM/PM (e.g., "2:30 PM")
 */
export function formatTimeToAMPM(timeString: string): string {
  const [hours, minutes] = timeString.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  const displayMinutes = minutes.toString().padStart(2, '0');
  return `${displayHours}:${displayMinutes} ${period}`;
}

/**
 * Converts minutes to hours and minutes format
 * @param totalMinutes - Total minutes (e.g., 90)
 * @returns Object with hours and minutes (e.g., { hours: 1, minutes: 30 })
 */
export function minutesToHoursMinutes(totalMinutes: number): { hours: number; minutes: number } {
  return {
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60,
  };
}

/**
 * Formats duration in minutes to a readable string (e.g., "1h 30m" or "45m")
 * @param totalMinutes - Total minutes
 * @returns Formatted string
 */
export function formatDuration(totalMinutes: number): string {
  const { hours, minutes } = minutesToHoursMinutes(totalMinutes);
  if (hours === 0) {
    return `${minutes}m`;
  } else if (minutes === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h ${minutes}m`;
  }
}

/**
 * Converts hours and minutes to total minutes
 * @param hours - Hours
 * @param minutes - Minutes
 * @returns Total minutes
 */
export function hoursMinutesToMinutes(hours: number, minutes: number): number {
  return hours * 60 + minutes;
}

/**
 * Safely parses a date string into a local Date object, avoiding UTC shifts.
 *
 * - Accepts both plain dates (`YYYY-MM-DD`) and full ISO strings.
 * - Always interprets the year/month/day in the **local timezone**.
 * - Uses noon to stay away from DST / timezone edges.
 */
export function parseLocalDateFromISO(dateString: string): Date {
  if (!dateString) {
    return new Date();
  }

  // If it's a full ISO string, just take the date part
  const datePart = dateString.length > 10 ? dateString.slice(0, 10) : dateString;

  const [yearStr, monthStr, dayStr] = datePart.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  if (!year || !month || !day) {
    // Fallback – let the built-in parser handle unexpected formats
    return new Date(dateString);
  }

  // Use noon to stay far from DST / timezone edges
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

