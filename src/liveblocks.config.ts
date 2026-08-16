import type { LiveList, LiveMap, LiveObject } from "@liveblocks/client";

import type { TripWorkspaceView } from "@/features/collaboration/model/trip-workspace-navigation";
import type { TripExpense } from "@/entities/expense/model/trip-expense";
import type { TripExpenseSettlementTransferCompletion } from "@/entities/expense/model/trip-expense-settlement-state";
import type { PreparationChecklistItem } from "@/entities/preparation-checklist/model/preparation-checklist";
import type {
  ItineraryItem,
  PlaceSuggestion,
  TripDay,
} from "@/entities/itinerary/model/trip-itinerary";
import type { TripMemberRole } from "@/entities/trip/model/trip-membership";

type LiveTripDay = Omit<TripDay, "itemIds"> & {
  itemIds: LiveList<string>;
};

declare global {
  interface Liveblocks {
    Presence: {
      activeWorkspace?: TripWorkspaceView;
      selectedItineraryItemId?: string | null;
    };
    Storage: {
      checklistItems: LiveMap<string, LiveObject<PreparationChecklistItem>>;
      dayOrder: LiveList<string>;
      days: LiveMap<string, LiveObject<LiveTripDay>>;
      expenseItems: LiveMap<string, LiveObject<TripExpense>>;
      expenseSettlementCompletions: LiveMap<string, LiveObject<TripExpenseSettlementTransferCompletion>>;
      expenseSettlementRevision: number;
      items: LiveMap<string, LiveObject<ItineraryItem>>;
      placeSuggestions: LiveMap<string, LiveObject<PlaceSuggestion>>;
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
