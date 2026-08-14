import { z } from "@/shared/lib/zod";

import { tripSchema } from "@/entities/trip/model/trip";

function validateDateRange(
  trip: { endDate: string; startDate: string },
  context: z.RefinementCtx,
) {
  if (trip.startDate > trip.endDate) {
    context.addIssue({
      code: "custom",
      message: "종료일은 시작일보다 빠를 수 없습니다.",
      path: ["endDate"],
    });
  }
}

const updateTripDetailsFieldsSchema = z.object({
  destination: tripSchema.shape.destination,
  endDate: tripSchema.shape.endDate,
  startDate: tripSchema.shape.startDate,
  title: tripSchema.shape.title,
});

export const updateTripDetailsFormSchema = updateTripDetailsFieldsSchema.superRefine(
  validateDateRange,
);

export const updateTripDetailsSchema = updateTripDetailsFieldsSchema.extend({
  tripId: z.uuid(),
}).superRefine(validateDateRange);

export type UpdateTripDetailsInput = z.infer<typeof updateTripDetailsSchema>;

export function parseUpdateTripDetailsFormData(formData: FormData) {
  return updateTripDetailsSchema.safeParse({
    destination: formData.get("destination"),
    endDate: formData.get("endDate"),
    startDate: formData.get("startDate"),
    title: formData.get("title"),
    tripId: formData.get("tripId"),
  });
}
