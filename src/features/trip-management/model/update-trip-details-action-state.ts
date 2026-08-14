export type UpdateTripDetailsActionState = {
  message: string;
  status: "error" | "idle" | "success";
};

export const initialUpdateTripDetailsActionState: UpdateTripDetailsActionState = {
  message: "",
  status: "idle",
};
