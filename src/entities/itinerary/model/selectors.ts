import type {
  ItineraryDocument,
  ItineraryItem,
  PlaceSuggestion,
  TripDay,
} from "@/entities/itinerary/model/trip-itinerary";

export function selectOrderedDays(document: ItineraryDocument): TripDay[] {
  return document.dayOrder.flatMap((dayId) => {
    const day = document.days[dayId];
    return day ? [day] : [];
  });
}

export function selectItemsForDay(
  document: ItineraryDocument,
  dayId: string,
): ItineraryItem[] {
  const day = document.days[dayId];

  if (!day) {
    return [];
  }

  return day.itemIds.flatMap((itemId) => {
    const item = document.items[itemId];
    return item ? [item] : [];
  });
}

export function selectPlaceSuggestionsForDay(
  document: ItineraryDocument,
  dayId: string,
): PlaceSuggestion[] {
  return Object.values(document.placeSuggestions).filter((suggestion) => suggestion.dayId === dayId);
}
