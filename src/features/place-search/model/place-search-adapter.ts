import type { PlaceSnapshot } from "@/entities/place/model/place-snapshot";

export type PlaceSearchAdapter = {
  search: (query: string, options?: { signal?: AbortSignal }) => Promise<PlaceSnapshot[]>;
};
