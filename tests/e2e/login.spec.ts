import { expect, test } from "@playwright/test";

test.describe("비로그인 사용자 진입", () => {
  test("보호된 여행 목록에서 로그인 화면으로 이동한다", async ({ page }) => {
    await page.goto("/trips");

    await expect(page).toHaveURL(/\/login$/);
    await expect(
      page.getByRole("heading", { name: "여행을 계속 계획해 볼까요?" }),
    ).toBeVisible();
    await expect(
      page.getByText("처음 가입할 때만 이메일을 확인하고, 이후에는 이메일과 비밀번호로 바로 로그인할 수 있어요."),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "로그인하기" })).toBeVisible();
    await expect(page.getByLabel("비밀번호")).toBeVisible();
  });

  test("이메일 입력은 브라우저 검증을 제공한다", async ({ page }) => {
    await page.goto("/login");

    const emailField = page.getByLabel("이메일 (로그인 아이디)");

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

  test("회원가입 후 확인해야 할 이메일 흐름을 안내한다", async ({ page }) => {
    await page.goto("/signup/check-email");

    await expect(page.getByRole("heading", { name: "이메일을 확인해 주세요" })).toBeVisible();
    await expect(page.getByText("TripMate에서 보낸 가입 확인 메일을 찾습니다.")).toBeVisible();
    await expect(page.getByRole("link", { name: "로그인 화면으로 돌아가기" })).toHaveAttribute("href", "/login");
  });
});
