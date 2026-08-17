import { expect, test } from "@playwright/test";

test.describe("비로그인 사용자 진입", () => {
  test("보호된 여행 목록에서 로그인 화면으로 이동한다", async ({ page }) => {
    await page.goto("/trips");

    await expect(page).toHaveURL(/\/login$/);
    await expect(
      page.getByRole("heading", { name: "여행을 계속 계획해 볼까요?" }),
    ).toBeVisible();
    await expect(page.getByText("이메일만 입력하면 인증 메일 없이 바로 여행을 시작할 수 있어요.")).toBeVisible();
    await expect(page.getByRole("button", { name: "이메일로 바로 시작하기" })).toBeVisible();
  });

  test("이메일 입력은 브라우저 검증을 제공한다", async ({ page }) => {
    await page.goto("/login");

    const emailField = page.getByLabel("이메일");

    await expect(emailField).toHaveAttribute("type", "email");
    await expect(emailField).toHaveAttribute("required", "");

    await emailField.fill("tripmate");
    await expect
      .poll(() =>
        emailField.evaluate(
          (input) => input instanceof HTMLInputElement && !input.checkValidity(),
        ),
      )
      .toBe(true);

    await emailField.fill("traveler@example.com");
    await expect
      .poll(() =>
        emailField.evaluate(
          (input) => input instanceof HTMLInputElement && input.checkValidity(),
        ),
      )
      .toBe(true);
  });
});
