const defaultPath = "/trips" as const;
const invitationPathPattern = /^\/invites\/[A-Za-z0-9_-]{43}$/;

export type PostAuthenticationPath = typeof defaultPath | `/invites/${string}`;

function isPostAuthenticationPath(path: string): path is PostAuthenticationPath {
  return path === defaultPath || invitationPathPattern.test(path);
}

export function getSafeInternalPath(
  value: unknown,
  fallback: PostAuthenticationPath = defaultPath,
): PostAuthenticationPath {
  if (typeof value !== "string") {
    return fallback;
  }

  const path = value.trim();

  return isPostAuthenticationPath(path) ? path : fallback;
}
