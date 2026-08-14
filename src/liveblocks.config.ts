import type { LiveList, LiveMap, LiveObject } from "@liveblocks/client";

import type { TripExpense } from "@/entities/expense/model/trip-expense";
import type { PreparationChecklistItem } from "@/entities/preparation-checklist/model/preparation-checklist";
import type {
  ItineraryItem,
  TripDay,
} from "@/entities/itinerary/model/trip-itinerary";
import type { TripMemberRole } from "@/entities/trip/model/trip-membership";

type LiveTripDay = Omit<TripDay, "itemIds"> & {
  itemIds: LiveList<string>;
};

declare global {
  interface Liveblocks {
    Presence: Record<string, never>;
    Storage: {
      checklistItems: LiveMap<string, LiveObject<PreparationChecklistItem>>;
      dayOrder: LiveList<string>;
      days: LiveMap<string, LiveObject<LiveTripDay>>;
      expenseItems: LiveMap<string, LiveObject<TripExpense>>;
      items: LiveMap<string, LiveObject<ItineraryItem>>;
    };
    UserMeta: {
      id: string;
      info: {
        color: string;
        name: string;
        role: TripMemberRole;
      };
    };
  }
}

export {};
