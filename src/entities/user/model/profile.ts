import { z } from "@/shared/lib/zod";

export const profileDisplayNameSchema = z
  .string("닉네임을 입력해 주세요.")
  .trim()
  .min(1, "닉네임을 입력해 주세요.")
  .max(80, "닉네임은 80자 이내로 입력해 주세요.");

export const userProfileSchema = z.object({
  displayName: profileDisplayNameSchema.nullable(),
  id: z.uuid(),
});

export type UserProfile = z.infer<typeof userProfileSchema>;

export function parseProfileDisplayNameFormData(formData: FormData) {
  return profileDisplayNameSchema.safeParse(formData.get("displayName"));
}
