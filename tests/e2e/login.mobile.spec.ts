import { devices, expect, test } from "@playwright/test";

test.use({ ...devices["Pixel 7"] });

test("모바일 로그인 화면은 가로 스크롤 없이 핵심 행동을 보여 준다", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByRole("heading", { name: "여행을 계속 계획해 볼까요?" })).toBeVisible();
  await expect(page.getByLabel("이메일 (로그인 아이디)")).toBeVisible();
  await expect(page.getByLabel("비밀번호")).toBeVisible();
  await expect(page.getByRole("button", { name: "로그인하기" })).toBeVisible();

  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
});
