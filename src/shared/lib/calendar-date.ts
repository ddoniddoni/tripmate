import { z } from "zod";

const calendarDatePattern = /^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/;

function isRealCalendarDate(value: string) {
  if (!calendarDatePattern.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export const calendarDateSchema = z
  .string()
  .refine(isRealCalendarDate, "YYYY-MM-DD 형식의 유효한 날짜여야 합니다.");

export function calendarDateToUtcDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

export function formatCalendarDate(date: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("ko-KR", { ...options, timeZone: "UTC" }).format(
    calendarDateToUtcDate(date),
  );
}
