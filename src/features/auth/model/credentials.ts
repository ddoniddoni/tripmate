import { z } from "@/shared/lib/zod";

export const emailSchema = z
  .string("이메일 주소를 입력해 주세요.")
  .trim()
  .min(1, "이메일 주소를 입력해 주세요.")
  .email("유효한 이메일 주소를 입력해 주세요.");

export const passwordSchema = z
  .string("비밀번호를 입력해 주세요.")
  .min(8, "비밀번호는 8자 이상으로 입력해 주세요.");

const credentialsSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

const signUpCredentialsSchema = credentialsSchema
  .extend({
    passwordConfirmation: z.string("비밀번호 확인을 입력해 주세요."),
  })
  .refine(({ password, passwordConfirmation }) => password === passwordConfirmation, {
    message: "비밀번호가 서로 일치하지 않아요.",
    path: ["passwordConfirmation"],
  });

export type AuthActionState = {
  message: string;
  status: "error" | "idle" | "success";
};

export const initialAuthActionState: AuthActionState = {
  message: "",
  status: "idle",
};

export function parseEmail(input: unknown) {
  return emailSchema.safeParse(input);
}

export function parseCredentials(formData: FormData) {
  return credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
}

export function parseSignUpCredentials(formData: FormData) {
  return signUpCredentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    passwordConfirmation: formData.get("passwordConfirmation"),
  });
}
