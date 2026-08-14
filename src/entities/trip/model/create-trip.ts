import { z } from "zod";

import { tripSchema } from "@/entities/trip/model/trip";

export const createTripSchema = z
  .object({
    destination: tripSchema.shape.destination,
    endDate: tripSchema.shape.endDate,
    startDate: tripSchema.shape.startDate,
    timeZone: tripSchema.shape.timeZone,
    title: tripSchema.shape.title,
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

export type CreateTripInput = z.infer<typeof createTripSchema>;

export function parseCreateTripFormData(formData: FormData) {
  return createTripSchema.safeParse({
    destination: formData.get("destination"),
    endDate: formData.get("endDate"),
    startDate: formData.get("startDate"),
    timeZone: formData.get("timeZone"),
    title: formData.get("title"),
  });
}
