export type DeleteAccountActionState = {
  message: string;
  status: "error" | "idle";
};

export const initialDeleteAccountActionState: DeleteAccountActionState = {
  message: "",
  status: "idle",
};
