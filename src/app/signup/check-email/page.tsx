import Link from "next/link";

import { BrandMark } from "@/shared/ui/brand-mark";

const confirmationSteps = [
  "가입한 이메일의 받은편지함을 열어요.",
  "TripMate에서 보낸 가입 확인 메일을 찾습니다.",
  "메일 안의 확인 링크를 클릭하면 바로 시작할 수 있어요.",
];

export default function CheckEmailPage() {
  return (
    <main className="login-page">
      <section className="login-card email-confirmation-card" aria-labelledby="check-email-heading">
        <BrandMark />
        <div>
          <span className="eyebrow">거의 다 됐어요</span>
          <h1 id="check-email-heading">이메일을 확인해 주세요</h1>
          <p>가입을 마무리하려면 받은편지함의 확인 링크를 한 번만 열어 주세요.</p>
        </div>

        <ol className="email-confirmation-steps">
          {confirmationSteps.map((step, index) => (
            <li key={step}>
              <span aria-hidden="true">{index + 1}</span>
              <p>{step}</p>
            </li>
          ))}
        </ol>

        <p className="email-confirmation-help">
          메일이 보이지 않으면 스팸함을 확인해 주세요. 인증이 끝난 뒤부터는 이메일과 비밀번호로 바로
          로그인할 수 있어요.
        </p>

        <Link className="email-confirmation-link" href="/login">
          로그인 화면으로 돌아가기
        </Link>
      </section>
    </main>
  );
}
