import { z } from "zod";

import { calendarDateSchema } from "@/shared/lib/calendar-date";

function isIanaTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

export const tripSchema = z
  .object({
    id: z.string().trim().min(1).max(100),
    title: z.string().trim().min(1).max(120),
    destination: z.string().trim().min(1).max(160),
    startDate: calendarDateSchema,
    endDate: calendarDateSchema,
    timeZone: z.string().trim().refine(isIanaTimeZone, "유효한 IANA 시간대여야 합니다."),
  })
  .superRefine((trip, context) => {
    if (trip.startDate > trip.endDate) {
      context.addIssue({
        code: "custom",
        message: "종료일은 시작일보다 빠를 수 없습니다.",
        path: ["endDate"],
      });
    }
  });

export type Trip = z.infer<typeof tripSchema>;
