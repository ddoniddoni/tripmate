const tokenClockRetryDelaysMs = [1_000, 2_000] as const;

type SupabaseErrorLike = {
  code?: unknown;
};

type SupabaseResultLike = {
  error: unknown;
};

type SupabaseWait = (delayMs: number) => Promise<void>;

/**
 * A freshly issued session can briefly reach PostgREST before a validating
 * node's clock catches up with Supabase Auth. PostgREST may omit the clock
 * detail and return only PGRST303, so use a bounded retry window rather than
 * treating it as a permanent profile or trip-data failure.
 */
export function isSupabaseJwtValidationError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const { code } = error as SupabaseErrorLike;

  return code === "PGRST303";
}

export function waitForSupabaseTokenClockSync(delayMs: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

export async function retrySupabaseJwtValidation<Result extends SupabaseResultLike>(
  request: () => PromiseLike<Result>,
  wait: SupabaseWait = waitForSupabaseTokenClockSync,
): Promise<Result> {
  let result = await request();

  for (const retryDelayMs of tokenClockRetryDelaysMs) {
    if (!isSupabaseJwtValidationError(result.error)) {
      return result;
    }

    await wait(retryDelayMs);
    result = await request();
  }

  return result;
}
