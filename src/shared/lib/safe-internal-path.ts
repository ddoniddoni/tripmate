const defaultPath = "/trips" as const;
const invitationPathPattern = /^\/invites\/[A-Za-z0-9_-]{43}$/;
const tripIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const tripPathPattern = new RegExp(`^/trips/${tripIdPattern.source.slice(1, -1)}$`, "i");
const workspaceViews = new Set(["overview", "itinerary", "preparation", "expenses", "settings"]);
const internalUrlOrigin = "https://tripmate.local";

export type PostAuthenticationPath =
  | typeof defaultPath
  | `/invites/${string}`
  | `/trips/${string}`;

type TripWorkspaceSearchParams = {
  day?: string | string[] | undefined;
  view?: string | string[] | undefined;
};

function getFirstValue(value: string | string[] | undefined) {
  return typeof value === "string" ? value : value?.[0];
}

function isInvitationPath(path: string): path is `/invites/${string}` {
  return invitationPathPattern.test(path);
}

function isTripEditorPath(path: string): path is `/trips/${string}` {
  return path.startsWith("/trips/");
}

function getNormalizedTripPath(path: string) {
  try {
    const parsed = new URL(path, internalUrlOrigin);

    if (parsed.origin !== internalUrlOrigin || !tripPathPattern.test(parsed.pathname)) {
      return null;
    }

    const view = parsed.searchParams.get("view");
    const day = parsed.searchParams.get("day");
    const searchParams = new URLSearchParams();

    if (view && workspaceViews.has(view)) {
      searchParams.set("view", view);
    }

    if (day && tripIdPattern.test(day)) {
      searchParams.set("day", day);
    }

    const query = searchParams.toString();

    const normalizedPath = `${parsed.pathname}${query ? `?${query}` : ""}`;

    return isTripEditorPath(normalizedPath) ? normalizedPath : null;
  } catch {
    return null;
  }
}

export function getSafeTripEditorPath(
  tripId: string,
  searchParams: TripWorkspaceSearchParams,
) {
  const params = new URLSearchParams();
  const view = getFirstValue(searchParams.view);
  const day = getFirstValue(searchParams.day);

  if (view) {
    params.set("view", view);
  }

  if (day) {
    params.set("day", day);
  }

  const query = params.toString();

  return getSafeInternalPath(`/trips/${tripId}${query ? `?${query}` : ""}`);
}

export function getSafeInternalPath(
  value: unknown,
  fallback: PostAuthenticationPath = defaultPath,
): PostAuthenticationPath {
  if (typeof value !== "string") {
    return fallback;
  }

  const path = value.trim();

  if (path === defaultPath || isInvitationPath(path)) {
    return path;
  }

  return getNormalizedTripPath(path) ?? fallback;
}
