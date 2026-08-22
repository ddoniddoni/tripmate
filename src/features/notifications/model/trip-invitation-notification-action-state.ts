export type TripInvitationNotificationActionState = {
  message: string;
  status: "error" | "idle" | "success";
};

export const initialTripInvitationNotificationActionState: TripInvitationNotificationActionState = {
  message: "",
  status: "idle",
};
