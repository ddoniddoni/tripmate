import { expect, test } from "@playwright/test";

const testEmail = process.env.E2E_TEST_EMAIL?.trim();
const isAuthenticatedE2EEnabled = process.env.E2E_AUTHENTICATED === "1" && Boolean(testEmail);

test.describe("인증된 사용자 핵심 여정", () => {
  test.skip(
    !isAuthenticatedE2EEnabled,
    "E2E_AUTHENTICATED=1과 전용 E2E_TEST_EMAIL이 있을 때만 실제 Supabase 여정을 실행합니다.",
  );

  test("개발용 로그인으로 여행을 만들고 삭제한다", async ({ page }) => {
    const tripTitle = `E2E 삭제 확인 ${Date.now()}`;

    // This test exercises Supabase only. Avoid the unrelated real-time provider while the
    // editor page is open; the trip is deleted through the owner-only server action below.
    await page.route("**/api/liveblocks-auth", (route) => route.abort());

    await page.goto("/login");
    await page.getByLabel("이메일").fill(testEmail ?? "");
    await page.getByRole("button", { name: "이메일로 바로 시작하기" }).click();

    const profileHeading = page.getByRole("heading", {
      name: "여행에서 사용할 이름을 알려 주세요.",
    });
    const tripsHeading = page.getByRole("heading", { name: "나의 여행" });

    await expect(profileHeading.or(tripsHeading)).toBeVisible();

    if (await profileHeading.isVisible()) {
      await page.getByLabel("닉네임").fill("TripMate E2E");
      await page.getByRole("button", { name: "저장하고 여행 보기" }).click();
    }

    await expect(page).toHaveURL(/\/trips$/);
    await page.getByRole("button", { name: "새 여행 만들기" }).click();
    await page.getByLabel("여행 이름").fill(tripTitle);
    await page.getByLabel("여행지").fill("대한민국 · 부산");
    await page.getByLabel("시작일").fill("2030-10-01");
    await page.getByLabel("종료일").fill("2030-10-02");

    const aiPlannerOption = page.getByLabel("여행을 만든 뒤 AI 동선 초안 열기");
    if (await aiPlannerOption.isChecked()) {
      await aiPlannerOption.uncheck();
    }

    await page.getByRole("button", { name: "여행 만들기" }).click();

    await expect(page).toHaveURL(/\/trips\/[0-9a-f-]+$/);
    await expect(page.getByRole("heading", { name: tripTitle })).toBeVisible();

    await page.getByRole("button", { name: "이 여행 삭제" }).click();
    const deleteDialog = page.getByRole("alertdialog", { name: `${tripTitle}을 삭제할까요?` });
    await expect(deleteDialog).toBeVisible();
    await deleteDialog.getByRole("button", { name: "여행 삭제" }).click();

    await expect(page).toHaveURL(/\/trips$/);
    await expect(page.getByRole("heading", { name: "나의 여행" })).toBeVisible();
    await expect(page.getByRole("heading", { name: tripTitle })).not.toBeVisible();
  });
});
