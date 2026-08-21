import { afterEach, describe, expect, it, vi } from "vitest";

import { placeDetailsApiAdapter } from "@/features/place-search/api/place-details-api-adapter";

describe("placeDetailsApiAdapter", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("gets normalized details from the server route", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          details: { rating: 4.6, userRatingCount: 321 },
        }),
        { headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(placeDetailsApiAdapter.getDetails("ChIJ-test-place")).resolves.toEqual({
      rating: 4.6,
      userRatingCount: 321,
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/place-details?placeId=ChIJ-test-place", {
      headers: { Accept: "application/json" },
      signal: undefined,
    });
  });

  it("surfaces the Korean message returned by the server", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "오늘 장소 상세 정보 조회 한도에 도달했어요." }), {
          status: 429,
        }),
      ),
    );

    await expect(placeDetailsApiAdapter.getDetails("ChIJ-test-place")).rejects.toThrow(
      "오늘 장소 상세 정보 조회 한도에 도달했어요.",
    );
  });
});
