export type DeleteTripActionState = {
  message: string;
  status: "error" | "idle";
};

export const initialDeleteTripActionState: DeleteTripActionState = {
  message: "",
  status: "idle",
};
