const defaultTripCoverImagePaths = [
  "/trip-covers/default/cover-1.jpg",
  "/trip-covers/default/cover-2.jpg",
  "/trip-covers/default/cover-3.jpg",
  "/trip-covers/default/cover-4.jpg",
  "/trip-covers/default/cover-5.jpg",
] as const;

function getStableCoverIndex(tripId: string) {
  let hash = 0;

  for (const character of tripId) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return hash % defaultTripCoverImagePaths.length;
}

/**
 * Maps the randomly generated trip ID to one bundled cover image. This keeps
 * the default cover stable across reloads without adding another persisted field.
 */
export function getDefaultTripCoverImageUrl(tripId: string) {
  return defaultTripCoverImagePaths[getStableCoverIndex(tripId)];
}

export { defaultTripCoverImagePaths };
