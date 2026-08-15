import { afterEach, describe, expect, it, vi } from "vitest";

import { placeSearchApiAdapter } from "@/features/place-search/api/place-search-api-adapter";

const googlePlace = {
  address: "서울특별시 성동구 성수이로 7길 1",
  category: "카페",
  latitude: 37.5445,
  longitude: 127.0557,
  name: "테스트 카페",
  provider: "google",
  providerPlaceId: "google.test-cafe",
} as const;

describe("placeSearchApiAdapter", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requests normalized place snapshots from the server route", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ places: [googlePlace] }), {
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(placeSearchApiAdapter.search("성수 카페")).resolves.toEqual([googlePlace]);
    expect(fetchMock).toHaveBeenCalledWith("/api/place-search?query=%EC%84%B1%EC%88%98+%EC%B9%B4%ED%8E%98", {
      headers: { Accept: "application/json" },
      signal: undefined,
    });
  });

  it("surfaces the Korean message returned by the server", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "장소 검색 설정이 아직 완료되지 않았습니다." }), {
          status: 503,
        }),
      ),
    );

    await expect(placeSearchApiAdapter.search("성수 카페")).rejects.toThrow(
      "장소 검색 설정이 아직 완료되지 않았습니다.",
    );
  });

  it("rejects malformed responses instead of accepting untrusted place data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ places: [{ name: "좌표 없는 장소" }] }), {
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(placeSearchApiAdapter.search("성수 카페")).rejects.toThrow(
      "장소 검색 결과를 처리하지 못했습니다. 다시 시도해 주세요.",
    );
  });
});
