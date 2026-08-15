import {
  DirectionsRequestError,
  directionsRouteSchema,
  type DirectionsAdapter,
} from "@/features/map-sync/model/directions-adapter";
import { z } from "@/shared/lib/zod";

const directionsApiPath = "/api/directions";

const directionsApiResponseSchema = z.object({
  route: directionsRouteSchema.nullable(),
});

async function getErrorMessage(response: Response) {
  const payload: unknown = await response.json().catch(() => null);

  if (
    typeof payload === "object" &&
    payload !== null &&
    "message" in payload &&
    typeof payload.message === "string" &&
    payload.message.trim()
  ) {
    return payload.message;
  }

  return "이동 경로를 불러오지 못했습니다. 다시 시도해 주세요.";
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

export const directionsApiAdapter: DirectionsAdapter = {
  async getRoute(query, options) {
    let response: Response;

    try {
      response = await fetch(directionsApiPath, {
        body: JSON.stringify(query),
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        method: "POST",
        signal: options?.signal,
      });
    } catch (error) {
      if (isAbortError(error)) {
        throw error;
      }

      throw new DirectionsRequestError("이동 경로 서비스에 연결하지 못했습니다. 다시 시도해 주세요.");
    }

    if (!response.ok) {
      throw new DirectionsRequestError(await getErrorMessage(response));
    }

    const payload: unknown = await response.json().catch(() => null);
    const parsedResponse = directionsApiResponseSchema.safeParse(payload);

    if (!parsedResponse.success) {
      throw new DirectionsRequestError("이동 경로 결과를 처리하지 못했습니다. 다시 시도해 주세요.");
    }

    return parsedResponse.data.route;
  },
};
