import type { PlaceSnapshot } from "@/entities/place/model/place-snapshot";
import type { PlaceSearchAdapter } from "@/features/place-search/model/place-search-adapter";

const mockPlaces: readonly PlaceSnapshot[] = [
  {
    provider: "mapbox",
    providerPlaceId: "mock.mapbox.woojin",
    name: "우진해장국",
    address: "서사로 11, 제주시",
    longitude: 126.5201,
    latitude: 33.5115,
    category: "아침 식사",
  },
  {
    provider: "mapbox",
    providerPlaceId: "mock.mapbox.hamdeok",
    name: "함덕해수욕장",
    address: "조천읍 조함해안로 525",
    longitude: 126.6692,
    latitude: 33.5431,
    category: "해변",
  },
  {
    provider: "mapbox",
    providerPlaceId: "mock.mapbox.bijarim",
    name: "비자림",
    address: "구좌읍 비자숲길 55",
    longitude: 126.8114,
    latitude: 33.4913,
    category: "자연",
  },
  {
    provider: "mapbox",
    providerPlaceId: "mock.mapbox.seongsan",
    name: "성산일출봉",
    address: "성산읍 일출로 284-12",
    longitude: 126.9425,
    latitude: 33.4581,
    category: "자연",
  },
  {
    provider: "mapbox",
    providerPlaceId: "mock.mapbox.osulloc",
    name: "오설록 티 뮤지엄",
    address: "안덕면 신화역사로 15",
    longitude: 126.2898,
    latitude: 33.3059,
    category: "카페",
  },
  {
    provider: "mapbox",
    providerPlaceId: "mock.mapbox.snoopy-garden",
    name: "스누피가든",
    address: "구좌읍 금백조로 930",
    longitude: 126.8325,
    latitude: 33.4448,
    category: "전시",
  },
] as const;

function abortSearch() {
  return new DOMException("검색 요청이 취소되었습니다.", "AbortError");
}

function normalizeQuery(query: string) {
  return query.trim().toLocaleLowerCase("ko-KR");
}

function matchesQuery(place: PlaceSnapshot, normalizedQuery: string) {
  return [place.name, place.address, place.category]
    .filter((value): value is string => Boolean(value))
    .some((value) => value.toLocaleLowerCase("ko-KR").includes(normalizedQuery));
}

export const mockPlaceSearchAdapter: PlaceSearchAdapter = {
  async search(query, options) {
    if (options?.signal?.aborted) {
      throw abortSearch();
    }

    const normalizedQuery = normalizeQuery(query);

    if (!normalizedQuery) {
      return [];
    }

    return mockPlaces.filter((place) => matchesQuery(place, normalizedQuery)).slice(0, 6);
  },
};
