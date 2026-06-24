import { describe, expect, it } from "vitest";

import { calculateCurrentStreak, getMonthCalendarDays } from "@/lib/workout-summary";

describe("calculateCurrentStreak", () => {
  it("counts consecutive completions ending today", () => {
    expect(calculateCurrentStreak(["2026-06-20", "2026-06-21", "2026-06-22", "2026-06-23"], "2026-06-23")).toBe(4);
  });

  it("returns zero when today is not complete", () => {
    expect(calculateCurrentStreak(["2026-06-20", "2026-06-21", "2026-06-22"], "2026-06-23")).toBe(0);
  });

  it("stops at the first missed date", () => {
    expect(calculateCurrentStreak(["2026-06-19", "2026-06-21", "2026-06-22", "2026-06-23"], "2026-06-23")).toBe(3);
  });
});

describe("getMonthCalendarDays", () => {
  it("pads the first week and returns every day in the month", () => {
    const days = getMonthCalendarDays("2026-06");

    expect(days.slice(0, 2)).toEqual([null, "2026-06-01"]);
    expect(days.at(-1)).toBe("2026-06-30");
  });
});