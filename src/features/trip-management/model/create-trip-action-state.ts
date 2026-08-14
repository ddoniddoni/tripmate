export type CreateTripActionState = {
  message: string;
  status: "error" | "idle" | "success";
};

export const initialCreateTripActionState: CreateTripActionState = {
  message: "",
  status: "idle",
};
