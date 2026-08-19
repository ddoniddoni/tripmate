export const tripWorkspaceViews = [
  "overview",
  "itinerary",
  "preparation",
  "expenses",
  "settings",
] as const;

export type TripWorkspaceView = (typeof tripWorkspaceViews)[number];

export type TripWorkspaceNavigation = {
  selectedDayId: string;
  view: TripWorkspaceView;
};

type TripWorkspaceSearchParams = {
  day?: string | string[] | undefined;
  view?: string | string[] | undefined;
};

function getFirstSearchParamValue(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

function isTripWorkspaceView(value: string | undefined): value is TripWorkspaceView {
  return value !== undefined && tripWorkspaceViews.includes(value as TripWorkspaceView);
}

export function getTripWorkspaceNavigation(
  searchParams: TripWorkspaceSearchParams,
  dayIds: readonly string[],
): TripWorkspaceNavigation {
  const selectedDayFromSearch = getFirstSearchParamValue(searchParams.day);
  const viewFromSearch = getFirstSearchParamValue(searchParams.view);
  const defaultSelectedDayId = dayIds[0] ?? "";

  return {
    selectedDayId: dayIds.includes(selectedDayFromSearch ?? "")
      ? selectedDayFromSearch ?? defaultSelectedDayId
      : defaultSelectedDayId,
    view: isTripWorkspaceView(viewFromSearch) ? viewFromSearch : "overview",
  };
}

export function getTripWorkspacePath({
  dayIds,
  navigation,
  pathname,
  search,
}: {
  dayIds: readonly string[];
  navigation: TripWorkspaceNavigation;
  pathname: string;
  search: string;
}) {
  const searchParams = new URLSearchParams(search);
  const defaultSelectedDayId = dayIds[0] ?? "";

  if (navigation.view === "overview") {
    searchParams.delete("view");
  } else {
    searchParams.set("view", navigation.view);
  }

  if (!navigation.selectedDayId || navigation.selectedDayId === defaultSelectedDayId) {
    searchParams.delete("day");
  } else {
    searchParams.set("day", navigation.selectedDayId);
  }

  const query = searchParams.toString();

  return query ? `${pathname}?${query}` : pathname;
}
