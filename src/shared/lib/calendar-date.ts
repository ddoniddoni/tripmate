import { z } from "@/shared/lib/zod";

const calendarDatePattern = /^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/;
const calendarDatePartsPattern = /^\d{4}-\d{2}-\d{2}$/;
const calendarDateWithYearPattern = /^\d+-/;

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
  .string("날짜를 입력해 주세요.")
  .trim()
  .superRefine((value, context) => {
    if (!value) {
      context.addIssue({ code: "custom", message: "날짜를 입력해 주세요." });
      return;
    }

    if (calendarDateWithYearPattern.test(value) && !/^\d{4}-/.test(value)) {
      context.addIssue({ code: "custom", message: "연도는 네 자리로 입력해 주세요." });
      return;
    }

    if (!calendarDatePartsPattern.test(value)) {
      context.addIssue({ code: "custom", message: "날짜는 YYYY-MM-DD 형식으로 입력해 주세요." });
      return;
    }

    if (!calendarDatePattern.test(value) || !isRealCalendarDate(value)) {
      context.addIssue({ code: "custom", message: "실제 달력에 있는 날짜를 입력해 주세요." });
    }
  });

export function calendarDateToUtcDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

export function formatCalendarDate(date: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("ko-KR", { ...options, timeZone: "UTC" }).format(
    calendarDateToUtcDate(date),
  );
}
