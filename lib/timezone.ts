import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';

const IST_TIMEZONE = 'Asia/Kolkata';

export function getISTDate(date?: Date | string): Date {
  const d = date ? new Date(date) : new Date();
  return toZonedTime(d, IST_TIMEZONE);
}

export function formatISTDate(date: Date | string, format: string = 'yyyy-MM-dd'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatInTimeZone(d, IST_TIMEZONE, format);
}

export function getISTDateString(date?: Date | string): string {
  const d = date ? new Date(date) : new Date();
  return formatInTimeZone(d, IST_TIMEZONE, 'yyyy-MM-dd');
}

export function getISTDateTimeString(date?: Date | string): string {
  const d = date ? new Date(date) : new Date();
  return formatInTimeZone(d, IST_TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
}

export function createISTDate(year: number, month: number, day: number): Date {
  // month is 0-indexed in JavaScript Date
  return fromZonedTime(new Date(year, month, day), IST_TIMEZONE);
}
