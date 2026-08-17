import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { createEmptyTripItinerary } from "@/entities/itinerary/lib/create-empty-trip-itinerary";
import {
  getSupabaseTrip,
  listSupabasePendingTripInvitations,
  listSupabaseTripMembers,
} from "@/entities/trip/api/supabase-trip-repository";
import { getTripPermissions } from "@/entities/trip/model/trip-membership";
import { getSupabaseUserProfile } from "@/entities/user/api/supabase-profile-repository";
import { getAuthenticatedUser } from "@/features/auth/model/get-authenticated-user";
import { getTripRoomId } from "@/features/collaboration/model/trip-room";
import { getTripWorkspaceNavigation } from "@/features/collaboration/model/trip-workspace-navigation";
import { TripHistoryControls } from "@/features/collaboration/ui/trip-history-controls";
import { LiveblocksItineraryEditor } from "@/features/collaboration/ui/liveblocks-itinerary-editor";
import { TripCollaborationRoom } from "@/features/collaboration/ui/trip-collaboration-room";
import { TripCollaborationStatus } from "@/features/collaboration/ui/trip-collaboration-status";
import { ItineraryEditorShell } from "@/features/itinerary-editor/ui/itinerary-editor-shell";
import { DeleteTripDialog } from "@/features/trip-management/ui/delete-trip-dialog";
import { EditTripDetailsDialog } from "@/features/trip-management/ui/edit-trip-details-dialog";
import { TripSharingDialog } from "@/features/trip-sharing/ui/trip-sharing-dialog";
import { getSafeTripEditorPath } from "@/shared/lib/safe-internal-path";

type TripEditorPageProps = {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<{ ai?: string; day?: string; view?: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: TripEditorPageProps): Promise<Metadata> {
  const { tripId } = await params;
  const trip = await getSupabaseTrip(tripId);

  return {
    title: trip?.title ?? "여행 편집",
  };
}

export default async function TripEditorPage({ params, searchParams }: TripEditorPageProps) {
  const [{ tripId }, user, workspaceSearchParams] = await Promise.all([
    params,
    getAuthenticatedUser(),
    searchParams,
  ]);
  const tripEditorPath = getSafeTripEditorPath(tripId, workspaceSearchParams);

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(tripEditorPath)}`);
  }

  const [profileResult, tripResult, membersResult] = await Promise.allSettled([
    getSupabaseUserProfile(user.id),
    getSupabaseTrip(tripId),
    listSupabaseTripMembers(tripId),
  ]);

  if (profileResult.status === "rejected") {
    throw profileResult.reason;
  }

  const profile = profileResult.value;

  if (!profile?.displayName) {
    redirect(`/profile?next=${encodeURIComponent(tripEditorPath)}`);
  }

  if (tripResult.status === "rejected") {
    throw tripResult.reason;
  }

  if (membersResult.status === "rejected") {
    throw membersResult.reason;
  }

  const trip = tripResult.value;
  const members = membersResult.value;

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
  const initialWorkspaceNavigation = getTripWorkspaceNavigation(
    workspaceSearchParams,
    initialTripItinerary.itinerary.dayOrder,
  );
  const initialAiPlannerOpen = workspaceSearchParams.ai === "1";

  const editor = (
    <ItineraryEditorShell
      canEditItinerary={permissions.canEditItinerary}
      collaborationControl={<TripCollaborationStatus />}
      historyControl={<TripHistoryControls canEditItinerary={permissions.canEditItinerary} />}
      itineraryEditor={
        <LiveblocksItineraryEditor
          canEditItinerary={permissions.canEditItinerary}
          currentUserId={user.id}
          initialAiPlannerOpen={initialAiPlannerOpen}
          initialWorkspaceNavigation={initialWorkspaceNavigation}
          members={members}
          trip={trip}
        />
      }
      sharingControl={
        <TripSharingDialog
          canManageMembers={permissions.canManageMembers}
          currentUserId={user.id}
          invitations={pendingInvitations}
          memberCount={members.length}
          members={members}
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
      tripDetailsControl={
        <EditTripDetailsDialog
          canUpdateTrip={permissions.canUpdateTrip}
          destination={trip.destination}
          endDate={trip.endDate}
          startDate={trip.startDate}
          title={trip.title}
          tripId={trip.id}
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
