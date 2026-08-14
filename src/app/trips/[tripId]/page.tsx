import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { createEmptyTripItinerary } from "@/entities/itinerary/lib/create-empty-trip-itinerary";
import {
  getSupabaseTrip,
  listSupabasePendingTripInvitations,
  listSupabaseTripMembers,
} from "@/entities/trip/api/supabase-trip-repository";
import { getTripPermissions } from "@/entities/trip/model/trip-membership";
import { getAuthenticatedUser } from "@/features/auth/model/get-authenticated-user";
import { getTripRoomId } from "@/features/collaboration/model/trip-room";
import { TripHistoryControls } from "@/features/collaboration/ui/trip-history-controls";
import { LiveblocksItineraryEditor } from "@/features/collaboration/ui/liveblocks-itinerary-editor";
import { TripCollaborationRoom } from "@/features/collaboration/ui/trip-collaboration-room";
import { TripCollaborationStatus } from "@/features/collaboration/ui/trip-collaboration-status";
import { ItineraryEditorShell } from "@/features/itinerary-editor/ui/itinerary-editor-shell";
import { DeleteTripDialog } from "@/features/trip-management/ui/delete-trip-dialog";
import { TripSharingDialog } from "@/features/trip-sharing/ui/trip-sharing-dialog";

type TripEditorPageProps = {
  params: Promise<{ tripId: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: TripEditorPageProps): Promise<Metadata> {
  const { tripId } = await params;
  const trip = await getSupabaseTrip(tripId);

  return {
    title: trip?.title ?? "여행 편집",
  };
}

export default async function TripEditorPage({ params }: TripEditorPageProps) {
  const [{ tripId }, user] = await Promise.all([params, getAuthenticatedUser()]);

  if (!user) {
    redirect("/login");
  }

  const [trip, members] = await Promise.all([
    getSupabaseTrip(tripId),
    listSupabaseTripMembers(tripId),
  ]);

  if (!trip) {
    notFound();
  }

  const currentMember = members.find((member) => member.userId === user.id);

  if (!currentMember) {
    notFound();
  }

  const permissions = getTripPermissions(currentMember.role);
  const pendingInvitations = permissions.canManageMembers
    ? await listSupabasePendingTripInvitations(trip.id)
    : [];
  const initialTripItinerary = createEmptyTripItinerary(trip);

  const editor = (
    <ItineraryEditorShell
      canEditItinerary={permissions.canEditItinerary}
      collaborationControl={<TripCollaborationStatus />}
      historyControl={<TripHistoryControls canEditItinerary={permissions.canEditItinerary} />}
      itineraryEditor={
        <LiveblocksItineraryEditor
          canEditItinerary={permissions.canEditItinerary}
          currentUserId={user.id}
          trip={trip}
        />
      }
      sharingControl={
        <TripSharingDialog
          canManageMembers={permissions.canManageMembers}
          invitations={pendingInvitations}
          memberCount={members.length}
          tripId={trip.id}
        />
      }
      deletionControl={
        <DeleteTripDialog
          canDeleteTrip={permissions.canDeleteTrip}
          tripId={trip.id}
          tripTitle={trip.title}
        />
      }
      tripItinerary={initialTripItinerary}
    />
  );

  return (
    <TripCollaborationRoom
      initialItinerary={initialTripItinerary.itinerary}
      roomId={getTripRoomId(trip.id)}
    >
      {editor}
    </TripCollaborationRoom>
  );
}
