"use client";

import { useActionState } from "react";

import {
  requestMagicLink,
  startDevelopmentSession,
} from "@/features/auth/model/auth-actions";
import { initialMagicLinkActionState } from "@/features/auth/model/magic-link";

type LoginFormProps = {
  allowDevelopmentSession: boolean;
  nextPath: string;
};

function EmailField({ disabled }: { disabled: boolean }) {
  return (
    <>
      <label htmlFor="login-email">이메일</label>
      <input
        autoComplete="email"
        disabled={disabled}
        id="login-email"
        inputMode="email"
        name="email"
        placeholder="you@example.com"
        required
        type="email"
      />
    </>
  );
}

function DevelopmentLoginForm({ nextPath }: Pick<LoginFormProps, "nextPath">) {
  const [developmentState, developmentAction, isDevelopmentPending] = useActionState(
    startDevelopmentSession,
    initialMagicLinkActionState,
  );

  return (
    <form className="login-form">
      <input name="next" type="hidden" value={nextPath} />
      <EmailField disabled={isDevelopmentPending} />
      <div className="login-actions">
        <button formAction={developmentAction} type="submit" disabled={isDevelopmentPending}>
          {isDevelopmentPending ? "입장하는 중…" : "이메일로 바로 시작하기"}
        </button>
      </div>
      {developmentState.status !== "idle" ? (
        <p
          className={`login-message login-message-${developmentState.status}`}
          role={developmentState.status === "error" ? "alert" : "status"}
        >
          {developmentState.message}
        </p>
      ) : null}
    </form>
  );
}

function MagicLinkLoginForm({ nextPath }: Pick<LoginFormProps, "nextPath">) {
  const [magicLinkState, magicLinkAction, isMagicLinkPending] = useActionState(
    requestMagicLink,
    initialMagicLinkActionState,
  );

  return (
    <form action={magicLinkAction} className="login-form">
      <input name="next" type="hidden" value={nextPath} />
      <EmailField disabled={isMagicLinkPending} />
      <div className="login-actions">
        <button type="submit" disabled={isMagicLinkPending}>
          {isMagicLinkPending ? "메일을 보내는 중…" : "이메일 인증 링크 보내기"}
        </button>
      </div>
      {magicLinkState.status !== "idle" ? (
        <p
          className={`login-message login-message-${magicLinkState.status}`}
          role={magicLinkState.status === "error" ? "alert" : "status"}
        >
          {magicLinkState.message}
        </p>
      ) : null}
    </form>
  );
}

export function LoginForm({ allowDevelopmentSession, nextPath }: LoginFormProps) {
  return allowDevelopmentSession ? (
    <DevelopmentLoginForm nextPath={nextPath} />
  ) : (
    <MagicLinkLoginForm nextPath={nextPath} />
  );
}
