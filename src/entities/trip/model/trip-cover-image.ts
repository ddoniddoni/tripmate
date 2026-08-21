import { z } from "@/shared/lib/zod";

const tripCoverImagePathPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:jpg|jpeg|png|webp)$/i;

export const tripCoverImagePathSchema = z
  .string("커버 사진 정보를 확인해 주세요.")
  .trim()
  .min(1, "커버 사진 정보를 확인해 주세요.")
  .max(160, "커버 사진 정보를 확인해 주세요.")
  .regex(tripCoverImagePathPattern, "커버 사진 정보를 확인해 주세요.");

export const tripCoverImageUploadSchema = z.object({
  coverImagePath: tripCoverImagePathSchema,
  tripId: z.uuid("여행 정보를 확인해 주세요."),
});

export type TripCoverImageUpload = z.infer<typeof tripCoverImageUploadSchema>;
