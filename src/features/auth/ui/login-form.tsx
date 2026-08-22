"use client";

import { useActionState, useState } from "react";

import {
  signInWithPassword,
  signUpWithPassword,
} from "@/features/auth/model/auth-actions";
import { initialAuthActionState } from "@/features/auth/model/credentials";

type LoginFormProps = {
  nextPath: string;
};

function MailIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <rect height="13" rx="2.25" width="16" x="2" y="3.5" />
      <path d="m3.25 5 6.75 5 6.75-5" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <rect height="9" rx="1.75" width="13" x="3.5" y="8" />
      <path d="M6.5 8V5.75a3.5 3.5 0 0 1 7 0V8M10 11.5v2.5" />
    </svg>
  );
}

function EmailField({ disabled }: { disabled: boolean }) {
  return (
    <>
      <label htmlFor="login-email">이메일 (로그인 아이디)</label>
      <div className="login-email-field">
        <MailIcon />
        <input
          autoComplete="email"
          disabled={disabled}
          id="login-email"
          inputMode="email"
          name="email"
          placeholder="이메일 주소를 입력하세요"
          required
          type="email"
        />
      </div>
    </>
  );
}

type PasswordFieldProps = {
  autoComplete: "current-password" | "new-password";
  disabled: boolean;
  id: string;
  label: string;
  name: "password" | "passwordConfirmation";
};

function PasswordField({ autoComplete, disabled, id, label, name }: PasswordFieldProps) {
  return (
    <>
      <label htmlFor={id}>{label}</label>
      <div className="login-password-field">
        <LockIcon />
        <input
          autoComplete={autoComplete}
          disabled={disabled}
          id={id}
          minLength={8}
          name={name}
          placeholder="8자 이상 입력하세요"
          required
          type="password"
        />
      </div>
    </>
  );
}

export function LoginForm({ nextPath }: LoginFormProps) {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [signInState, signInAction, isSignInPending] = useActionState(
    signInWithPassword,
    initialAuthActionState,
  );
  const [signUpState, signUpAction, isSignUpPending] = useActionState(
    signUpWithPassword,
    initialAuthActionState,
  );
  const isSignUp = mode === "sign-up";
  const isPending = isSignUp ? isSignUpPending : isSignInPending;
  const action = isSignUp ? signUpAction : signInAction;
  const actionState = isSignUp ? signUpState : signInState;

  return (
    <form action={action} className="login-form" key={mode}>
      <input name="next" type="hidden" value={nextPath} />
      <EmailField disabled={isPending} />
      <PasswordField
        autoComplete={isSignUp ? "new-password" : "current-password"}
        disabled={isPending}
        id="login-password"
        label="비밀번호"
        name="password"
      />
      {isSignUp ? (
        <PasswordField
          autoComplete="new-password"
          disabled={isPending}
          id="login-password-confirmation"
          label="비밀번호 확인"
          name="passwordConfirmation"
        />
      ) : null}
      <div className="login-actions">
        <button type="submit" disabled={isPending}>
          {isPending ? "처리하는 중…" : isSignUp ? "회원가입하기" : "로그인하기"}
        </button>
        <button
          className="login-mode-button"
          disabled={isPending}
          onClick={() => setMode(isSignUp ? "sign-in" : "sign-up")}
          type="button"
        >
          {isSignUp ? "이미 계정이 있어요 · 로그인" : "처음이신가요? 회원가입"}
        </button>
      </div>
      {actionState.status !== "idle" ? (
        <p
          className={`login-message login-message-${actionState.status}`}
          role={actionState.status === "error" ? "alert" : "status"}
        >
          {actionState.message}
        </p>
      ) : null}
    </form>
  );
}
