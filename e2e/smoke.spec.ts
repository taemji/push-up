import { expect, test } from "@playwright/test";

test("home page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Push-up Coach");
  await expect(page.getByRole("heading", { name: "Push-up Coach" })).toBeVisible();
  await expect(page.getByText("오늘 루틴을 설정해요")).toBeVisible();
  await expect(page.getByLabel("세트 수")).toHaveValue("3");
  await expect(page.getByLabel("세트당 개수")).toHaveValue("15");
  await expect(page.getByLabel("휴식 시간(초)")).toHaveValue("60");
  await expect(page.getByLabel("휴식 시간(초)")).toBeEnabled();
  await expect(page.getByText("3세트 x 15개 · 휴식 60초")).toBeVisible();
  await expect(page.getByRole("button", { name: /시작하기/ })).toBeVisible();
  await expect(page.getByText("45회")).toBeVisible();
});

test("page shows the cumulative chart between the calendar and start button", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 667 });
  await page.goto("/");

  const cumulativeChart = page.getByLabel("누적기록 차트");
  await cumulativeChart.scrollIntoViewIfNeeded();

  await expect(cumulativeChart).toBeVisible();
  await expect(cumulativeChart.getByText("민지")).toBeVisible();
  await expect(cumulativeChart.getByText("주영")).toBeVisible();
  await expect(cumulativeChart.getByText("동훈")).toBeVisible();
  await expect(page.getByRole("button", { name: /시작하기/ })).toBeVisible();
});

test("start flow shows countdown before workout", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /시작하기/ }).click();
  await expect(page.getByRole("heading", { name: "자세를 잡아주세요" })).toBeVisible();
  await expect(page.getByText("곧 시작합니다")).toBeVisible();
  await expect(page.getByRole("button", { name: "바로 시작" })).toBeVisible();
});

test("configured set plan drives workout and rest screen", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("세트 수").fill("2");
  await page.getByLabel("세트당 개수").fill("1");
  await expect(page.getByLabel("휴식 시간(초)")).toHaveValue("60");
  await expect(page.getByText("2세트 x 1개 · 휴식 60초")).toBeVisible();

  await page.getByRole("button", { name: /시작하기/ }).click();
  await page.getByRole("button", { name: "바로 시작" }).click();
  await expect(page.getByText("1/2 세트")).toBeVisible();
  await expect(page.getByText("1 reps")).toBeVisible();

  await page.getByRole("button", { name: "수동 +1" }).click();
  await expect(page.getByText("휴식 중")).toBeVisible();
  await expect(page.getByText("다음 2/2 세트")).toBeVisible();
  await expect(page.getByText("1:00")).toBeVisible();

  await page.getByRole("button", { name: "다음 세트" }).click();
  await expect(page.getByText("2/2 세트")).toBeVisible();
});

test("manual set button completes all remaining reps at once", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("세트 수").fill("2");
  await page.getByLabel("세트당 개수").fill("5");

  await page.getByRole("button", { name: /시작하기/ }).click();
  await page.getByRole("button", { name: "바로 시작" }).click();
  await page.getByRole("button", { name: "수동 +1" }).click();
  await expect(page.getByText("1/5")).toBeVisible();

  await page.getByRole("button", { name: "현재 세트 완료" }).click();
  await expect(page.getByText("휴식 중")).toBeVisible();
  await expect(page.getByText("완료 5/10개 · 50%")).toBeVisible();
});

test("active workout matches the squat screen layout", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /시작하기/ }).click();
  await page.getByRole("button", { name: "바로 시작" }).click();

  await expect(page.getByText("푸시업 수행")).toBeVisible();
  await expect(page.getByRole("button", { name: /카메라/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "수동 +1" })).toBeVisible();
  await expect(page.getByRole("button", { name: "현재 세트 완료" })).toBeVisible();
  await expect(page.getByLabel("푸시업 카메라 미리보기")).toBeVisible();
  await expect(page.getByText(/카메라|얼굴/).last()).toBeVisible();
});

test("camera permission starts a visible preview", async ({ page }) => {
  await page.route("**/api/workouts/**", (route) => route.fulfill({ status: 503 }));
  await page.addInitScript(() => {
    const stream = { getTracks: () => [] } as unknown as MediaStream;

    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: async () => stream,
    });
    Object.defineProperty(HTMLMediaElement.prototype, "srcObject", {
      configurable: true,
      get() {
        return (this as HTMLMediaElement & { __stream?: MediaStream }).__stream ?? null;
      },
      set(value: MediaStream | null) {
        (this as HTMLMediaElement & { __stream?: MediaStream | null }).__stream = value;
      },
    });
    Object.defineProperty(HTMLMediaElement.prototype, "play", {
      configurable: true,
      value: async () => undefined,
    });
  });

  await page.goto("/");
  await page.getByRole("button", { name: /시작하기/ }).click();
  await expect(page.getByRole("heading", { name: "자세를 잡아주세요" })).toBeVisible();
  await page.getByRole("button", { name: "바로 시작" }).click();

  const preview = page.getByLabel("푸시업 카메라 미리보기");
  await expect(preview).toBeVisible();
  await expect.poll(() => preview.evaluate((video) => Boolean((video as HTMLVideoElement).srcObject))).toBe(true);
});
