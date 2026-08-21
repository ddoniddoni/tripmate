"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { profileDisplayNameSchema } from "@/entities/user/model/profile";
import type { UpdateProfileActionState } from "@/features/profile/model/profile-action-state";
import { updateProfileDisplayName } from "@/features/profile/model/update-profile-action";
import type { PostAuthenticationPath } from "@/shared/lib/safe-internal-path";
import { z } from "@/shared/lib/zod";

const profileFormSchema = z.object({ displayName: profileDisplayNameSchema });

type ProfileFormValues = z.infer<typeof profileFormSchema>;

type ProfileFormProps = {
  initialDisplayName: string;
  nextPath: PostAuthenticationPath;
  submitLabel?: string;
  variant?: "account" | "onboarding";
};

function toFormData(values: ProfileFormValues, nextPath: PostAuthenticationPath) {
  const formData = new FormData();
  formData.set("displayName", values.displayName);
  formData.set("next", nextPath);
  return formData;
}

export function ProfileForm({
  initialDisplayName,
  nextPath,
  submitLabel,
  variant = "onboarding",
}: ProfileFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState<UpdateProfileActionState | null>(null);
  const [isPending, startTransition] = useTransition();
  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<ProfileFormValues>({
    defaultValues: { displayName: initialDisplayName },
    resolver: zodResolver(profileFormSchema),
  });

  function handleSave(values: ProfileFormValues) {
    setMessage(null);

    startTransition(async () => {
      try {
        const result = await updateProfileDisplayName(toFormData(values, nextPath));
        setMessage(result);

        if (result.status === "success") {
          router.replace(nextPath);
        }
      } catch {
        setMessage({
          message: "닉네임을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
          status: "error",
        });
      }
    });
  }

  return (
    <form className={`profile-form profile-form-${variant}`} noValidate onSubmit={handleSubmit(handleSave)}>
      <div className="profile-name-field">
        <label htmlFor="profile-display-name">닉네임</label>
        <input
          aria-describedby={errors.displayName ? "profile-display-name-error" : undefined}
          aria-invalid={Boolean(errors.displayName)}
          autoComplete="nickname"
          disabled={isPending}
          id="profile-display-name"
          maxLength={80}
          placeholder="예: 지우"
          {...register("displayName")}
        />
        {errors.displayName ? (
          <span id="profile-display-name-error" role="alert">
            {errors.displayName.message}
          </span>
        ) : null}
      </div>

      {message ? (
        <p
          className={`form-message form-message-${message.status}`}
          role={message.status === "error" ? "alert" : "status"}
        >
          {message.message}
        </p>
      ) : null}

      <button className="primary-button profile-save-button" disabled={isPending} type="submit">
        {isPending
          ? "저장하는 중…"
          : (submitLabel ??
            (nextPath.startsWith("/invites/")
              ? "저장하고 초대 확인하기"
              : "저장하고 여행 보기"))}
      </button>
    </form>
  );
}
