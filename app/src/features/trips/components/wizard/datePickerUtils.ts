const CALENDAR_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_IN_MS = 86_400_000;

export interface CalendarDay {
  value: string;
  day: number;
  label: string;
  inCurrentMonth: boolean;
  isToday: boolean;
  disabled: boolean;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function parseCalendarDate(value: string): Date | null {
  const match = CALENDAR_DATE_PATTERN.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return date;
}

export function toCalendarDate(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export function addCalendarDays(value: string, amount: number): string {
  const date = parseCalendarDate(value);
  if (!date) return value;
  return toCalendarDate(new Date(date.getTime() + amount * DAY_IN_MS));
}

export function addCalendarMonths(value: string, amount: number): string {
  const date = parseCalendarDate(value);
  if (!date) return value;
  const day = date.getUTCDate();
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return toCalendarDate(target);
}

function neutralDate(value: string): Date {
  return parseCalendarDate(value) ?? new Date(Date.UTC(1970, 0, 1));
}

const HUMAN_DATE = new Intl.DateTimeFormat("es-CL", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const MONTH_YEAR = new Intl.DateTimeFormat("es-CL", {
  timeZone: "UTC",
  month: "long",
  year: "numeric",
});

function capitalize(value: string): string {
  return value ? `${value[0].toLocaleUpperCase("es-CL")}${value.slice(1)}` : value;
}

export function formatCalendarDate(value: string): string {
  return capitalize(HUMAN_DATE.format(neutralDate(value)));
}

export function formatCalendarMonth(value: string): string {
  return capitalize(MONTH_YEAR.format(neutralDate(value)));
}

export function todayInTimeZone(timeZone?: string): string {
  const now = new Date();
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timeZone || "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
    return `${part("year")}-${part("month")}-${part("day")}`;
  } catch {
    return toCalendarDate(now);
  }
}

export function buildCalendarMonth(
  viewDate: string,
  minDate: string | undefined,
  today: string,
): CalendarDay[] {
  const view = neutralDate(viewDate);
  const first = new Date(Date.UTC(view.getUTCFullYear(), view.getUTCMonth(), 1));
  const mondayOffset = (first.getUTCDay() + 6) % 7;
  const gridStart = new Date(first.getTime() - mondayOffset * DAY_IN_MS);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart.getTime() + index * DAY_IN_MS);
    const value = toCalendarDate(date);
    return {
      value,
      day: date.getUTCDate(),
      label: formatCalendarDate(value),
      inCurrentMonth: date.getUTCMonth() === view.getUTCMonth(),
      isToday: value === today,
      disabled: Boolean(minDate && value < minDate),
    };
  });
}

export function initialCalendarDate(value: string, minDate: string | undefined, today: string): string {
  if (parseCalendarDate(value) && (!minDate || value >= minDate)) return value;
  if (minDate && parseCalendarDate(minDate) && minDate > today) return minDate;
  return today;
}
