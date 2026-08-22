import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { createEmptyTripItinerary } from "@/entities/itinerary/lib/create-empty-trip-itinerary";
import {
  getSupabaseTrip,
  listSupabasePendingTripInvitations,
  listSupabaseTripMembers,
} from "@/entities/trip/api/supabase-trip-repository";
import { countSupabasePendingTripInvitationNotifications } from "@/entities/trip/api/supabase-trip-notification-repository";
import { getTripPermissions } from "@/entities/trip/model/trip-membership";
import { getSupabaseUserProfile } from "@/entities/user/api/supabase-profile-repository";
import { getAuthenticatedUser } from "@/features/auth/model/get-authenticated-user";
import { getTripRoomId } from "@/features/collaboration/model/trip-room";
import { getTripWorkspaceNavigation } from "@/features/collaboration/model/trip-workspace-navigation";
import { LiveblocksItineraryEditor } from "@/features/collaboration/ui/liveblocks-itinerary-editor";
import { TripCollaborationRoom } from "@/features/collaboration/ui/trip-collaboration-room";
import { TripCollaborationStatus } from "@/features/collaboration/ui/trip-collaboration-status";
import { ItineraryEditorShell } from "@/features/itinerary-editor/ui/itinerary-editor-shell";
import { NotificationLink } from "@/features/notifications/ui/notification-link";
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

  const [profileResult, tripResult, membersResult, pendingNotificationCountResult] =
    await Promise.allSettled([
      getSupabaseUserProfile(user.id),
      getSupabaseTrip(tripId),
      listSupabaseTripMembers(tripId),
      countSupabasePendingTripInvitationNotifications(user.id),
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
  const pendingNotificationCount =
    pendingNotificationCountResult.status === "fulfilled"
      ? pendingNotificationCountResult.value
      : 0;

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
      itineraryEditor={
        <LiveblocksItineraryEditor
          currentUserId={user.id}
          initialAiPlannerOpen={initialAiPlannerOpen}
          initialWorkspaceNavigation={initialWorkspaceNavigation}
          invitations={pendingInvitations}
          members={members}
          permissions={permissions}
          trip={trip}
        />
      }
      notificationControl={<NotificationLink pendingCount={pendingNotificationCount} />}
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
