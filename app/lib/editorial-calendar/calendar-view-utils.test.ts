import { describe, expect, it } from "vitest";
import {
  anchorForToday,
  dayKey,
  rangeLabel,
  stepAnchor,
  visibleDays,
  visibleRange,
} from "@/features/editing-studio/components/calendar/calendar-view-utils";

describe("calendar-view-utils", () => {
  it("builds month grid from Monday before 1st through Sunday after last day", () => {
    const anchor = new Date(2026, 4, 15);
    const days = visibleDays("month", anchor);
    expect(days.length).toBeGreaterThanOrEqual(35);
    expect(days.length).toBeLessThanOrEqual(42);
    expect(dayKey(days[0]!)).toBe("2026-04-27");
    expect(dayKey(days[days.length - 1]!)).toBe("2026-05-31");
  });

  it("labels ranges for each view", () => {
    const anchor = new Date(2026, 4, 24);
    expect(rangeLabel("month", anchor)).toBe("May 2026");
    expect(rangeLabel("year", anchor)).toBe("2026");
    expect(rangeLabel("day", anchor)).toContain("Sunday");
  });

  it("steps month across year boundary", () => {
    const dec = new Date(2026, 11, 10);
    const jan = stepAnchor("month", dec, 1);
    expect(jan.getFullYear()).toBe(2027);
    expect(jan.getMonth()).toBe(0);
  });

  it("covers full year in year view range", () => {
    const anchor = new Date(2026, 5, 1);
    const { from, to } = visibleRange("year", anchor);
    expect(from.getFullYear()).toBe(2026);
    expect(from.getMonth()).toBe(0);
    expect(to.getFullYear()).toBe(2026);
    expect(to.getMonth()).toBe(11);
  });

  it("snaps today anchor to month start by default", () => {
    const today = anchorForToday("month");
    expect(today.getDate()).toBe(1);
  });
});
