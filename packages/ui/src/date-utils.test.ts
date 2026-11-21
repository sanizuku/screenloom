import {
  addDays,
  addMonths,
  addYears,
  clampDate,
  dayOfWeek,
  endOfWeek,
  formatDate,
  fromLocalDate,
  getLocaleFormat,
  getMonthGrid,
  isLeapYear,
  isOutsideRange,
  isValidISODate,
  parseDateInput,
  parseFormat,
  parseISODate,
  startOfWeek,
  toISODate,
} from "./date-utils";

describe("ISO parse / format", () => {
  it("round trips", () => {
    expect(toISODate(parseISODate("2026-03-15")!)).toBe("2026-03-15");
    expect(parseISODate("2026-03-15")).toEqual({ year: 2026, month: 3, day: 15 });
  });

  it("rejects invalid ISO strings", () => {
    expect(parseISODate("2026-02-30")).toBeNull();
    expect(parseISODate("2026-13-01")).toBeNull();
    expect(parseISODate("2026-3-15")).toBeNull();
    expect(parseISODate("15/03/2026")).toBeNull();
    expect(parseISODate("")).toBeNull();
    expect(parseISODate(null)).toBeNull();
  });

  it("knows leap years", () => {
    expect(isLeapYear(2028)).toBe(true);
    expect(isLeapYear(1900)).toBe(false);
    expect(isLeapYear(2000)).toBe(true);
    expect(isValidISODate("2028-02-29")).toBe(true);
    expect(isValidISODate("2026-02-29")).toBe(false);
  });
});

describe("arithmetic", () => {
  it("adds days across month and year boundaries", () => {
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("clamps addMonths to the end of the month", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2028-01-31", 1)).toBe("2028-02-29");
    expect(addMonths("2026-03-31", -1)).toBe("2026-02-28");
    expect(addMonths("2026-12-15", 1)).toBe("2027-01-15");
    expect(addMonths("2026-01-15", -1)).toBe("2025-12-15");
    expect(addYears("2028-02-29", 1)).toBe("2029-02-28");
  });

  it("finds the week start and end", () => {
    // 2026-03-15 is a Sunday
    expect(dayOfWeek("2026-03-15")).toBe(0);
    expect(startOfWeek("2026-03-15", 1)).toBe("2026-03-09");
    expect(endOfWeek("2026-03-15", 1)).toBe("2026-03-15");
    expect(startOfWeek("2026-03-15", 0)).toBe("2026-03-15");
    expect(endOfWeek("2026-03-15", 0)).toBe("2026-03-21");
  });

  it("checks and clamps ranges", () => {
    expect(isOutsideRange("2026-01-01", "2026-02-01")).toBe("min");
    expect(isOutsideRange("2026-12-01", null, "2026-06-30")).toBe("max");
    expect(isOutsideRange("2026-03-01", "2026-01-01", "2026-06-30")).toBeNull();
    expect(clampDate("2025-01-01", "2026-01-01")).toBe("2026-01-01");
  });
});

describe("getMonthGrid", () => {
  it("starts on Monday when weekStartsOn is 1", () => {
    const grid = getMonthGrid("2026-03-15", 1);
    expect(grid).toHaveLength(6);
    expect(grid.every((w) => w.length === 7)).toBe(true);
    // 1 March 2026 is a Sunday, so the Monday before is 23 Feb
    expect(grid[0]?.[0]).toBe("2026-02-23");
  });

  it("starts on Sunday when weekStartsOn is 0", () => {
    const grid = getMonthGrid("2026-03-15", 0);
    expect(grid[0]?.[0]).toBe("2026-03-01");
    expect(grid).toHaveLength(6);
    expect(grid[5]?.[6]).toBe("2026-04-11");
  });
});

describe("formats", () => {
  it("formats with the given pattern", () => {
    expect(formatDate("2026-03-05", "DD/MM/YYYY")).toBe("05/03/2026");
    expect(formatDate("2026-03-05", "MM/DD/YYYY")).toBe("03/05/2026");
    expect(formatDate("2026-03-05", "YYYY-MM-DD")).toBe("2026-03-05");
    expect(formatDate("2026-03-05", "DD.MM.YYYY")).toBe("05.03.2026");
  });

  it("falls back to DD/MM/YYYY for unknown patterns", () => {
    expect(parseFormat("nonsense")).toEqual({ order: ["D", "M", "Y"], separator: "/" });
    expect(parseFormat("DD/DD/YYYY").order).toEqual(["D", "M", "Y"]);
  });

  it("derives the format from a locale", () => {
    expect(getLocaleFormat("en-US")).toBe("MM/DD/YYYY");
    expect(getLocaleFormat("en-GB")).toBe("DD/MM/YYYY");
    expect(getLocaleFormat("de-DE")).toBe("DD.MM.YYYY");
  });
});

describe("parseDateInput", () => {
  const today = "2026-03-10";
  const parse = (text: string, format = "DD/MM/YYYY") => parseDateInput(text, format, { today });

  it("parses each supported format", () => {
    expect(parse("15/03/2026")).toBe("2026-03-15");
    expect(parse("03/15/2026", "MM/DD/YYYY")).toBe("2026-03-15");
    expect(parse("2026-03-15", "YYYY-MM-DD")).toBe("2026-03-15");
  });

  it("accepts single digits, any separator and two-digit years", () => {
    expect(parse("5/3/2026")).toBe("2026-03-05");
    expect(parse("5-3-26")).toBe("2026-03-05");
    expect(parse("5.3.26")).toBe("2026-03-05");
    expect(parse("5 3 85")).toBe("1985-03-05");
  });

  it("always accepts ISO typed in", () => {
    expect(parse("2026-03-15")).toBe("2026-03-15");
  });

  it("rejects things that are not dates", () => {
    expect(parse("")).toBeNull();
    expect(parse("31/02/2026")).toBeNull();
    expect(parse("hello")).toBeNull();
    expect(parse("1/0")).toBeNull();
    expect(parse("123")).toBeNull();
    expect(parse("5/3/202")).toBeNull();
  });

  it("understands smart shortcuts", () => {
    expect(parse("t")).toBe("2026-03-10");
    expect(parse("T")).toBe("2026-03-10");
    expect(parse("+7")).toBe("2026-03-17");
    expect(parse("-1")).toBe("2026-03-09");
    expect(parse("+30")).toBe("2026-04-09");
    expect(parse("15")).toBe("2026-03-15");
    expect(parse("1503")).toBe("2026-03-15");
    expect(parse("150326")).toBe("2026-03-15");
    expect(parse("15032026")).toBe("2026-03-15");
    expect(parse("5/3")).toBe("2026-03-05");
  });

  it("follows the format order for shortcuts", () => {
    expect(parse("0315", "MM/DD/YYYY")).toBe("2026-03-15");
    expect(parse("3/5", "MM/DD/YYYY")).toBe("2026-03-05");
    expect(parse("20260315", "YYYY-MM-DD")).toBe("2026-03-15");
  });

  it("uses the real local date when today is not given", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 6, 4, 12));
    expect(parseDateInput("t")).toBe("2026-07-04");
    vi.useRealTimers();
  });
});

describe("timezones", () => {
  const original = process.env.TZ;
  afterEach(() => {
    process.env.TZ = original;
  });

  it.each(["Pacific/Kiritimati", "America/Los_Angeles", "Asia/Kolkata"])("gives the same results in %s", (tz) => {
    process.env.TZ = tz;
    expect(addDays("2026-03-08", 1)).toBe("2026-03-09"); // US DST change day
    expect(addMonths("2026-10-31", 1)).toBe("2026-11-30");
    expect(dayOfWeek("2026-03-15")).toBe(0);
    expect(getMonthGrid("2026-03-01", 1)[0]?.[0]).toBe("2026-02-23");
    expect(fromLocalDate(new Date(2026, 2, 15))).toBe("2026-03-15");
    expect(formatDate("2026-03-15")).toBe("15/03/2026");
  });
});
