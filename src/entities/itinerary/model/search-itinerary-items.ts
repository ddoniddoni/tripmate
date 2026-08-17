import type {
  ItineraryDocument,
  ItineraryItem,
  TripDay,
} from "@/entities/itinerary/model/trip-itinerary";

export type ItinerarySearchResult = {
  day: TripDay;
  dayIndex: number;
  item: ItineraryItem;
  itemIndex: number;
};

function normalizeSearchValue(value: string) {
  return value.normalize("NFKC").trim().toLocaleLowerCase("ko-KR");
}

function getItineraryItemSearchText(item: ItineraryItem) {
  return normalizeSearchValue(
    [
      item.place.name,
      item.place.address,
      item.place.category,
      item.note,
      item.startTime,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

export function searchItineraryItems(
  document: ItineraryDocument,
  query: string,
): ItinerarySearchResult[] {
  const searchTerms = normalizeSearchValue(query).split(/\s+/).filter(Boolean);
  const results: ItinerarySearchResult[] = [];

  document.dayOrder.forEach((dayId, dayIndex) => {
    const day = document.days[dayId];

    if (!day) {
      return;
    }

    day.itemIds.forEach((itemId, itemIndex) => {
      const item = document.items[itemId];

      if (!item) {
        return;
      }

      if (
        searchTerms.length > 0 &&
        !searchTerms.every((term) => getItineraryItemSearchText(item).includes(term))
      ) {
        return;
      }

      results.push({ day, dayIndex, item, itemIndex });
    });
  });

  return results;
}
