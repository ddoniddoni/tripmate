import { describe, expect, it } from "vitest";

import { mockPlaceSearchAdapter } from "@/features/place-search/api/mock-place-search-adapter";

describe("mockPlaceSearchAdapter", () => {
  it("finds places by normalized name, address, and category", async () => {
    await expect(mockPlaceSearchAdapter.search(" 함덕 ")).resolves.toMatchObject([
      { name: "함덕해수욕장" },
    ]);
    await expect(mockPlaceSearchAdapter.search("비자숲길")).resolves.toMatchObject([
      { name: "비자림" },
    ]);
    await expect(mockPlaceSearchAdapter.search("카페")).resolves.toMatchObject([
      { name: "오설록 티 뮤지엄" },
    ]);
  });

  it("returns no results for blank or unmatched queries", async () => {
    await expect(mockPlaceSearchAdapter.search(" ")).resolves.toEqual([]);
    await expect(mockPlaceSearchAdapter.search("없는 장소")).resolves.toEqual([]);
  });

  it("honors an aborted search request", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      mockPlaceSearchAdapter.search("함덕", { signal: controller.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});
