import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import CheckEmailPage from "@/app/signup/check-email/page";

describe("CheckEmailPage", () => {
  it("guides a new user through email confirmation", () => {
    const markup = renderToStaticMarkup(<CheckEmailPage />);

    expect(markup).toContain("이메일을 확인해 주세요");
    expect(markup).toContain("TripMate에서 보낸 가입 확인 메일을 찾습니다.");
    expect(markup).toContain('href="/login"');
  });
});
