const tokenClockRetryDelayMs = 2_000;

type SupabaseErrorLike = {
  code?: unknown;
  message?: unknown;
};

/**
 * A freshly refreshed session can very briefly reach PostgREST before its
 * clock catches up with Supabase Auth. Retrying only this documented,
 * transient response avoids masking genuine permission or query failures.
 */
export function isSupabaseJwtIssuedInFutureError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const { code, message } = error as SupabaseErrorLike;

  return code === "PGRST303" && message === "JWT issued at future";
}

export function waitForSupabaseTokenClockSync() {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, tokenClockRetryDelayMs);
  });
}
