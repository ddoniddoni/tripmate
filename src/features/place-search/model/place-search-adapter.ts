import type { PlaceSnapshot } from "@/entities/place/model/place-snapshot";
import { placeSnapshotSchema } from "@/entities/place/model/place-snapshot";
import { z } from "@/shared/lib/zod";

export type PlaceSearchAdapter = {
  search: (query: string, options?: { signal?: AbortSignal }) => Promise<PlaceSnapshot[]>;
};

export const placeSearchResponseSchema = z.object({
  places: z.array(placeSnapshotSchema),
});
