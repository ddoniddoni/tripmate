import { z } from "@/shared/lib/zod";

export const magicLinkEmailSchema = z
  .string("이메일 주소를 입력해 주세요.")
  .trim()
  .min(1, "이메일 주소를 입력해 주세요.")
  .email("유효한 이메일 주소를 입력해 주세요.");

export type MagicLinkActionState = {
  message: string;
  status: "error" | "idle" | "success";
};

export const initialMagicLinkActionState: MagicLinkActionState = {
  message: "",
  status: "idle",
};

export function parseMagicLinkEmail(input: unknown) {
  return magicLinkEmailSchema.safeParse(input);
}
