"use client";

import { useCallback, useEffect, useEffectEvent, useState } from "react";

import {
  getTripWorkspaceNavigation,
  getTripWorkspacePath,
  type TripWorkspaceNavigation,
  type TripWorkspaceView,
} from "@/features/collaboration/model/trip-workspace-navigation";

type UseTripWorkspaceNavigationOptions = {
  dayIds: readonly string[];
  initialNavigation: TripWorkspaceNavigation;
  pathname: string;
};

function areNavigationsEqual(
  first: TripWorkspaceNavigation,
  second: TripWorkspaceNavigation,
) {
  return first.selectedDayId === second.selectedDayId && first.view === second.view;
}

export function useTripWorkspaceNavigation({
  dayIds,
  initialNavigation,
  pathname,
}: UseTripWorkspaceNavigationOptions) {
  const [navigation, setNavigation] = useState(initialNavigation);

  const navigate = useCallback(
    (changes: Partial<TripWorkspaceNavigation>) => {
      const nextNavigation = { ...navigation, ...changes };

      if (areNavigationsEqual(navigation, nextNavigation)) {
        return;
      }

      const nextPath = getTripWorkspacePath({
        dayIds,
        navigation: nextNavigation,
        pathname,
        search: window.location.search,
      });

      window.history.pushState(null, "", nextPath);
      setNavigation(nextNavigation);
    },
    [dayIds, navigation, pathname],
  );

  const restoreNavigationFromLocation = useEffectEvent(() => {
    setNavigation(
      getTripWorkspaceNavigation(
        Object.fromEntries(new URLSearchParams(window.location.search)),
        dayIds,
      ),
    );
  });

  useEffect(() => {
    function handlePopState() {
      restoreNavigationFromLocation();
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return {
    navigation,
    selectDay: (selectedDayId: string) => navigate({ selectedDayId }),
    selectItineraryDay: (selectedDayId: string) =>
      navigate({ selectedDayId, view: "itinerary" }),
    selectView: (view: TripWorkspaceView) => navigate({ view }),
  };
}
