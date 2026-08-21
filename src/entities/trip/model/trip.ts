import { z } from "@/shared/lib/zod";

import { calendarDateSchema } from "@/shared/lib/calendar-date";
import { tripCoverImagePathSchema } from "@/entities/trip/model/trip-cover-image";

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
    id: z
      .string("여행 정보를 확인해 주세요.")
      .trim()
      .min(1, "여행 정보를 확인해 주세요.")
      .max(100),
    title: z
      .string("여행 이름을 입력해 주세요.")
      .trim()
      .min(1, "여행 이름을 입력해 주세요.")
      .max(120, "여행 이름은 120자 이내로 입력해 주세요."),
    destination: z
      .string("여행지를 입력해 주세요.")
      .trim()
      .min(1, "여행지를 입력해 주세요.")
      .max(160, "여행지는 160자 이내로 입력해 주세요."),
    startDate: calendarDateSchema,
    endDate: calendarDateSchema,
    timeZone: z
      .string("여행 시간대를 선택해 주세요.")
      .trim()
      .min(1, "여행 시간대를 선택해 주세요.")
      .refine(isIanaTimeZone, "유효한 IANA 시간대여야 합니다."),
    coverImagePath: tripCoverImagePathSchema.optional(),
  })
  .superRefine((trip, context) => {
    const startDateResult = calendarDateSchema.safeParse(trip.startDate);
    const endDateResult = calendarDateSchema.safeParse(trip.endDate);

    if (startDateResult.success && endDateResult.success && trip.startDate > trip.endDate) {
      context.addIssue({
        code: "custom",
        message: "종료일은 시작일보다 빠를 수 없습니다.",
        path: ["endDate"],
      });
    }
  });

export type Trip = z.infer<typeof tripSchema>;
