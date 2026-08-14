import { z } from "zod";

export const placeSnapshotSchema = z.object({
  provider: z.literal("mapbox"),
  providerPlaceId: z.string().trim().min(1).max(240),
  name: z.string().trim().min(1).max(160),
  address: z.string().trim().min(1).max(300),
  longitude: z
    .number()
    .finite("경도는 유한한 숫자여야 합니다.")
    .min(-180, "경도는 -180 이상이어야 합니다.")
    .max(180, "경도는 180 이하여야 합니다."),
  latitude: z
    .number()
    .finite("위도는 유한한 숫자여야 합니다.")
    .min(-90, "위도는 -90 이상이어야 합니다.")
    .max(90, "위도는 90 이하여야 합니다."),
  category: z.string().trim().min(1).max(80).optional(),
});

export type PlaceSnapshot = z.infer<typeof placeSnapshotSchema>;
