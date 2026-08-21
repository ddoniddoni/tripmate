import { placeDetailsSchema, type PlaceDetails } from "@/entities/place/model/place-details";
import { z } from "@/shared/lib/zod";

export type PlaceDetailsAdapter = {
  getDetails: (
    providerPlaceId: string,
    options?: { signal?: AbortSignal },
  ) => Promise<PlaceDetails>;
};

export const placeDetailsResponseSchema = z.object({
  details: placeDetailsSchema,
});
