import { z } from "@/shared/lib/zod";

export const placeDetailsSchema = z.object({
  rating: z.number().finite().min(0).max(5).optional(),
  regularOpeningHours: z.array(z.string().trim().min(1).max(200)).max(7).optional(),
  userRatingCount: z.number().int().nonnegative().optional(),
});

export type PlaceDetails = z.infer<typeof placeDetailsSchema>;
