"use client";

import { useUpdateMyPresence } from "@liveblocks/react";
import { useEffect } from "react";

export function useItinerarySelectionPresence(selectedItemId: string | null) {
  const updateMyPresence = useUpdateMyPresence();

  useEffect(() => {
    updateMyPresence({ selectedItineraryItemId: selectedItemId });
  }, [selectedItemId, updateMyPresence]);
}
