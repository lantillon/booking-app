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


