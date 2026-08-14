type TripInvitationActionStatus = "error" | "idle" | "success";

export type CreateTripInvitationActionState = {
  invitationUrl?: string;
  message: string;
  status: TripInvitationActionStatus;
};

export const initialCreateTripInvitationActionState: CreateTripInvitationActionState = {
  message: "",
  status: "idle",
};

export type AcceptTripInvitationActionState = {
  message: string;
  status: Exclude<TripInvitationActionStatus, "success">;
};

export const initialAcceptTripInvitationActionState: AcceptTripInvitationActionState = {
  message: "",
  status: "idle",
};

export type RevokeTripInvitationActionResult = {
  message: string;
  success: boolean;
};
