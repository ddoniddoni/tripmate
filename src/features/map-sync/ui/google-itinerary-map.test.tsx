// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const marker = {
  addListener: vi.fn(() => ({})),
  setMap: vi.fn(),
};
const map = {
  fitBounds: vi.fn(),
  panTo: vi.fn(),
  setCenter: vi.fn(),
  setZoom: vi.fn(),
};
const mapsConstructor = vi.fn(function createMapInstance() {
  return map;
});
const markersConstructor = vi.fn(function createMarkerInstance() {
  return marker;
});
const polylineConstructor = vi.fn(function createPolylineInstance() {
  return { setMap: vi.fn() };
});

function installGoogleMapsMock() {
  window.google = {
    maps: {
      LatLngBounds: vi.fn(() => ({ extend: vi.fn() })),
      Map: mapsConstructor,
      Marker: markersConstructor,
      Polyline: polylineConstructor,
      SymbolPath: { CIRCLE: 0 },
      event: { removeListener: vi.fn() },
    },
  } as never;
}

async function loadGoogleItineraryMap() {
  vi.resetModules();
  return import("@/features/map-sync/ui/google-itinerary-map");
}

const markers = [
  {
    coordinate: { latitude: 37.5445, longitude: 127.0557 },
    id: "place-1",
    isSelected: false,
    name: "테스트 카페",
  },
];

describe("GoogleItineraryMap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_MAP_KEY", "test-browser-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 200 })));
    document.getElementById("tripmate-google-maps-javascript")?.remove();
    delete window.google;
    delete window.__tripmateGoogleMapsReady;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    document.getElementById("tripmate-google-maps-javascript")?.remove();
    delete window.google;
    delete window.__tripmateGoogleMapsReady;
  });

  it("does not reserve or load Google Maps for an empty itinerary", async () => {
    const { GoogleItineraryMap } = await loadGoogleItineraryMap();

    render(
      <GoogleItineraryMap
        destination="서울"
        markers={[]}
        onSelect={vi.fn()}
        routeCoordinates={[]}
      />,
    );

    expect(screen.getByText("아직 지도에 표시할 장소가 없어요")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
    expect(document.getElementById("tripmate-google-maps-javascript")).not.toBeInTheDocument();
  });

  it("reserves a server-side slot before creating the Google map", async () => {
    const { GoogleItineraryMap } = await loadGoogleItineraryMap();

    const { rerender } = render(
      <GoogleItineraryMap destination="서울" markers={markers} onSelect={vi.fn()} />,
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/google-maps-access", {
        cache: "no-store",
        method: "POST",
      });
    });

    const script = document.getElementById("tripmate-google-maps-javascript");
    expect(script).toHaveAttribute("src", expect.stringContaining("language=ko"));
    expect(script).toHaveAttribute("src", expect.stringContaining("auth_referrer_policy=origin"));

    installGoogleMapsMock();
    window.__tripmateGoogleMapsReady?.();

    await waitFor(() => {
      expect(mapsConstructor).toHaveBeenCalledOnce();
      expect(markersConstructor).toHaveBeenCalledOnce();
    });
    expect(screen.getByRole("button", { name: "일정 전체 보기" })).toBeInTheDocument();

    rerender(
      <GoogleItineraryMap
        destination="서울"
        markers={[{ ...markers[0], isSelected: true }]}
        onSelect={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(map.panTo).toHaveBeenCalledWith({ lat: 37.5445, lng: 127.0557 });
    });
  });

  it("does not inject the provider script after a daily limit response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "오늘 지도 표시 한도에 도달했어요. 내일 다시 시도해 주세요." }), {
          headers: { "Content-Type": "application/json" },
          status: 429,
        }),
      ),
    );
    const { GoogleItineraryMap } = await loadGoogleItineraryMap();

    render(<GoogleItineraryMap destination="서울" markers={markers} onSelect={vi.fn()} />);

    expect(
      await screen.findByText("오늘 지도 표시 한도에 도달했어요. 내일 다시 시도해 주세요."),
    ).toBeInTheDocument();
    expect(document.getElementById("tripmate-google-maps-javascript")).not.toBeInTheDocument();
  });
});
