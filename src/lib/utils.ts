import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function getTodayDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function calculatePercentage(present: number, od: number, total: number): number {
  if (total <= 0) return 100;
  return Number((((present + od) / total) * 100).toFixed(1));
}

/**
 * Converts 24-hour time string (e.g. "08:30", "13:15:00") into 12-hour AM/PM format (e.g. "8:30 AM", "1:15 PM")
 */
export function formatTime12h(timeStr: string): string {
  if (!timeStr) return '';
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return timeStr;

  let hours = parseInt(parts[0], 10);
  const minutes = parts[1].padStart(2, '0');
  if (isNaN(hours)) return timeStr;

  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 should be 12 (for 12 AM / 00:xx)

  return `${hours}:${minutes} ${ampm}`;
}

/**
 * Formats a start and end time into a friendly 12-hour range, e.g. "8:30 AM – 9:30 AM"
 */
export function formatTimeRange12h(startTime: string, endTime: string): string {
  if (!startTime || !endTime) return '';
  return `${formatTime12h(startTime)} – ${formatTime12h(endTime)}`;
}
