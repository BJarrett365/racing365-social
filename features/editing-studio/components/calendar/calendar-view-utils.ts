export type CalendarView = "day" | "week" | "month" | "year";

export function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function startOfWeekMonday(d: Date): Date {
  const copy = startOfDay(d);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy;
}

export function startOfMonth(d: Date): Date {
  const copy = startOfDay(d);
  copy.setDate(1);
  return copy;
}

export function startOfYear(d: Date): Date {
  const copy = startOfDay(d);
  copy.setMonth(0, 1);
  return copy;
}

export function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

export function addMonths(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setMonth(copy.getMonth() + n);
  return copy;
}

export function addYears(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setFullYear(copy.getFullYear() + n);
  return copy;
}

export function snapAnchorForView(view: CalendarView, d: Date): Date {
  switch (view) {
    case "day":
      return startOfDay(d);
    case "week":
      return startOfWeekMonday(d);
    case "month":
      return startOfMonth(d);
    case "year":
      return startOfYear(d);
  }
}

export function visibleRange(view: CalendarView, anchor: Date): { from: Date; to: Date } {
  const a = snapAnchorForView(view, anchor);
  switch (view) {
    case "day": {
      const end = new Date(a);
      end.setHours(23, 59, 59, 999);
      return { from: a, to: end };
    }
    case "week":
      return { from: a, to: addDays(a, 6) };
    case "month": {
      const days = visibleDays("month", a);
      return { from: days[0]!, to: days[days.length - 1]! };
    }
    case "year":
      return { from: a, to: addDays(addYears(a, 1), -1) };
  }
}

export function visibleDays(view: CalendarView, anchor: Date): Date[] {
  const a = snapAnchorForView(view, anchor);
  switch (view) {
    case "day":
      return [a];
    case "week":
      return Array.from({ length: 7 }, (_, i) => addDays(a, i));
    case "month": {
      const monthStart = startOfMonth(a);
      const gridStart = startOfWeekMonday(monthStart);
      const monthEnd = addDays(addMonths(monthStart, 1), -1);
      const gridEnd = addDays(startOfWeekMonday(monthEnd), 6);
      const days: Date[] = [];
      for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) {
        days.push(new Date(d));
      }
      return days;
    }
    case "year":
      return [];
  }
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function rangeLabel(view: CalendarView, anchor: Date): string {
  const a = snapAnchorForView(view, anchor);
  switch (view) {
    case "day":
      return a.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    case "week": {
      const end = addDays(a, 6);
      return `${a.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
    }
    case "month":
      return a.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    case "year":
      return String(a.getFullYear());
  }
}

export function stepAnchor(view: CalendarView, anchor: Date, delta: -1 | 1): Date {
  const a = snapAnchorForView(view, anchor);
  switch (view) {
    case "day":
      return addDays(a, delta);
    case "week":
      return addDays(a, delta * 7);
    case "month":
      return addMonths(a, delta);
    case "year":
      return addYears(a, delta);
  }
}

export function anchorForToday(view: CalendarView): Date {
  return snapAnchorForView(view, new Date());
}

export type YearMonthSummary = {
  monthIndex: number;
  monthStart: Date;
  label: string;
};

export function yearMonthSummaries(anchor: Date): YearMonthSummary[] {
  const yearStart = startOfYear(anchor);
  return Array.from({ length: 12 }, (_, monthIndex) => {
    const monthStart = new Date(yearStart.getFullYear(), monthIndex, 1);
    return {
      monthIndex,
      monthStart,
      label: monthStart.toLocaleDateString("en-GB", { month: "long" }),
    };
  });
}

export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
