import { calendarDateToUtcDate, formatCalendarDate } from "@/shared/lib/calendar-date";

export function formatTripDateRange(startDate: string, endDate: string) {
  const start = calendarDateToUtcDate(startDate);
  const end = calendarDateToUtcDate(endDate);
  const startDay = start.getUTCDate();
  const endDay = end.getUTCDate();

  if (start.getUTCFullYear() === end.getUTCFullYear() && start.getUTCMonth() === end.getUTCMonth()) {
    return `${start.getUTCMonth() + 1}월 ${startDay}일–${endDay}일`;
  }

  return `${formatCalendarDate(startDate, { month: "long", day: "numeric" })}–${formatCalendarDate(endDate, { month: "long", day: "numeric" })}`;
}

export function formatTripLength(startDate: string, endDate: string) {
  const millisecondsPerDay = 24 * 60 * 60 * 1_000;
  const dayCount =
    Math.round(
      (calendarDateToUtcDate(endDate).getTime() - calendarDateToUtcDate(startDate).getTime()) /
        millisecondsPerDay,
    ) + 1;

  return `${dayCount - 1}박 ${dayCount}일`;
}
