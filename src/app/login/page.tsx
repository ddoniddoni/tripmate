import { redirect } from "next/navigation";

import { getAuthenticatedUser } from "@/features/auth/model/get-authenticated-user";
import { LoginForm } from "@/features/auth/ui/login-form";
import { BrandMark } from "@/shared/ui/brand-mark";
import { getSafeInternalPath } from "@/shared/lib/safe-internal-path";

type LoginPageProps = {
  searchParams: Promise<{ auth?: string; next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const [user, params] = await Promise.all([getAuthenticatedUser(), searchParams]);

  const nextPath = getSafeInternalPath(params.next);

  if (user) {
    redirect(nextPath);
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-heading">
        <BrandMark />
        <div>
          <span className="eyebrow">함께 만드는 여행</span>
          <h1 id="login-heading">여행을 계속 계획해 볼까요?</h1>
          <p>처음 가입할 때만 이메일을 확인하고, 이후에는 이메일과 비밀번호로 바로 로그인할 수 있어요.</p>
        </div>
        {params.auth === "confirmation-failed" ? (
          <p className="login-message login-message-error" role="alert">
            계정 확인 링크를 확인하지 못했습니다. 회원가입을 다시 시도해 주세요.
          </p>
        ) : null}
        <LoginForm nextPath={nextPath} />
        <p className="login-help">
          비밀번호는 8자 이상으로 설정해 주세요. 이메일 확인은 처음 가입할 때만 필요합니다.
        </p>
      </section>
    </main>
  );
}
