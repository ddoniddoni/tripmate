// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { jejuTrip } from "@/entities/itinerary/mock/jeju-trip";
import type { ItineraryItem } from "@/entities/itinerary/model/trip-itinerary";
import type {
  DirectionsAdapter,
  DirectionsRoute,
} from "@/features/map-sync/model/directions-adapter";
import { DirectionsRequestError } from "@/features/map-sync/model/directions-adapter";
import {
  clearRoutePreviewCache,
  useRoutePreview,
} from "@/features/map-sync/model/use-route-preview";

const routeItems = ["woojin-breakfast", "hamdeok-beach"].flatMap((itemId) => {
  const item = jejuTrip.itinerary.items[itemId];

  return item ? [item] : [];
});

const firstRouteItem = routeItems[0];

if (!firstRouteItem) {
  throw new Error("Expected the route fixture to include one itinerary item.");
}

const route: DirectionsRoute = {
  coordinates: routeItems.map((item) => ({
    longitude: item.place.longitude,
    latitude: item.place.latitude,
  })),
  distanceMeters: 15_000,
  durationSeconds: 1_800,
  legs: [
    {
      distanceMeters: 15_000,
      durationSeconds: 1_800,
    },
  ],
};

type RoutePreviewProbeProps = {
  adapter: DirectionsAdapter;
  items: ItineraryItem[];
};

function RoutePreviewProbe({ adapter, items }: RoutePreviewProbeProps) {
  const preview = useRoutePreview(items, { adapter });

  return (
    <div>
      <span data-testid="route-status">{preview.status}</span>
      <span data-testid="route-distance">
        {preview.status === "ready" ? preview.route.distanceMeters : "none"}
      </span>
      <span data-testid="route-error">
        {preview.status === "error" ? preview.errorMessage : "none"}
      </span>
      <button type="button" onClick={preview.retry}>
        다시 시도
      </button>
    </div>
  );
}

describe("useRoutePreview", () => {
  beforeEach(() => {
    clearRoutePreviewCache();
  });

  it("skips zero and one point states, then reuses an identical route from cache", async () => {
    const adapter: DirectionsAdapter = {
      getRoute: vi.fn(async () => route),
    };
    const { rerender, unmount } = render(<RoutePreviewProbe adapter={adapter} items={[]} />);

    expect(screen.getByTestId("route-status")).toHaveTextContent("empty");
    expect(adapter.getRoute).not.toHaveBeenCalled();

    rerender(<RoutePreviewProbe adapter={adapter} items={[firstRouteItem]} />);
    expect(screen.getByTestId("route-status")).toHaveTextContent("one-point");
    expect(adapter.getRoute).not.toHaveBeenCalled();

    rerender(<RoutePreviewProbe adapter={adapter} items={routeItems} />);
    await waitFor(() => expect(screen.getByTestId("route-status")).toHaveTextContent("ready"));
    expect(adapter.getRoute).toHaveBeenCalledTimes(1);
    unmount();

    render(<RoutePreviewProbe adapter={adapter} items={routeItems} />);
    expect(screen.getByTestId("route-status")).toHaveTextContent("ready");
    expect(adapter.getRoute).toHaveBeenCalledTimes(1);
  });

  it("exposes a provider error and retries without blocking route state recovery", async () => {
    const user = userEvent.setup();
    const adapter: DirectionsAdapter = {
      getRoute: vi
        .fn<DirectionsAdapter["getRoute"]>()
        .mockRejectedValueOnce(new Error("provider unavailable"))
        .mockResolvedValueOnce(route),
    };

    render(<RoutePreviewProbe adapter={adapter} items={routeItems} />);

    await waitFor(() => expect(screen.getByTestId("route-status")).toHaveTextContent("error"));
    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    await waitFor(() => expect(screen.getByTestId("route-status")).toHaveTextContent("ready"));

    expect(adapter.getRoute).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("route-distance")).toHaveTextContent("15000");
  });

  it("keeps a recoverable Korean message returned by the directions API", async () => {
    const adapter: DirectionsAdapter = {
      getRoute: vi.fn(async () => {
        throw new DirectionsRequestError("오늘 실제 이동 경로 계산 한도에 도달했어요.");
      }),
    };

    render(<RoutePreviewProbe adapter={adapter} items={routeItems} />);

    await waitFor(() => expect(screen.getByTestId("route-status")).toHaveTextContent("error"));
    expect(screen.getByTestId("route-error")).toHaveTextContent(
      "오늘 실제 이동 경로 계산 한도에 도달했어요.",
    );
  });
});
