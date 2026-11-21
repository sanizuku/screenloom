import {
  BLACK,
  WHITE,
  contrastRatio,
  formatHsl,
  formatRgb,
  hexToHsv,
  hslToRgb,
  hsvToHex,
  hsvToRgb,
  normalizeHex,
  parseColor,
  parseHex,
  readableTextColor,
  rgbToHsl,
  rgbToHsv,
  toHex,
  wcagLevel,
} from "./color-utils";

describe("parseHex / parseColor", () => {
  it("parses 3, 4, 6 and 8 digit hex", () => {
    expect(parseHex("#abc")).toEqual({ r: 170, g: 187, b: 204, a: 1 });
    expect(parseHex("f00")).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    expect(parseHex("#2456c7")).toEqual({ r: 36, g: 86, b: 199, a: 1 });
    expect(parseHex("#00000080")?.a).toBeCloseTo(0.502, 2);
    expect(parseHex("#0008")?.a).toBeCloseTo(0.533, 2);
  });

  it("rejects garbage", () => {
    expect(parseHex("#12")).toBeNull();
    expect(parseHex("#ggg")).toBeNull();
    expect(parseColor("")).toBeNull();
    expect(parseColor("blue-ish")).toBeNull();
    expect(parseColor("rgb(1, 2)")).toBeNull();
  });

  it("parses rgb() in comma and space syntax, with alpha", () => {
    expect(parseColor("rgb(36, 86, 199)")).toEqual({ r: 36, g: 86, b: 199, a: 1 });
    expect(parseColor("rgba(36, 86, 199, 0.5)")).toEqual({ r: 36, g: 86, b: 199, a: 0.5 });
    expect(parseColor("rgb(36 86 199 / 50%)")).toEqual({ r: 36, g: 86, b: 199, a: 0.5 });
    expect(parseColor("rgb(300 -4 0)")).toEqual({ r: 255, g: 0, b: 0, a: 1 });
  });

  it("parses hsl()", () => {
    expect(parseColor("hsl(0 100% 50%)")).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    expect(parseColor("hsla(120, 100%, 25%, 0.4)")).toEqual({ r: 0, g: 128, b: 0, a: 0.4 });
  });
});

describe("conversions", () => {
  it("toHex pads and optionally adds alpha", () => {
    expect(toHex({ r: 1, g: 2, b: 3, a: 1 })).toBe("#010203");
    expect(toHex({ r: 255, g: 255, b: 255, a: 0.5 }, true)).toBe("#ffffff80");
  });

  it("rgb <-> hsv round-trips", () => {
    const samples = ["#2456c7", "#ff0000", "#00ff7f", "#808080", "#000000", "#ffffff", "#c0362c"];
    for (const hex of samples) {
      const hsv = hexToHsv(hex)!;
      expect(hsvToHex(hsv)).toBe(hex);
    }
  });

  it("known hsv values", () => {
    expect(rgbToHsv({ r: 255, g: 0, b: 0, a: 1 })).toEqual({ h: 0, s: 100, v: 100, a: 1 });
    expect(rgbToHsv({ r: 0, g: 0, b: 255, a: 1 }).h).toBe(240);
    expect(hsvToRgb({ h: 120, s: 100, v: 100, a: 1 })).toEqual({ r: 0, g: 255, b: 0, a: 1 });
    expect(hsvToRgb({ h: 360, s: 100, v: 100, a: 1 })).toEqual({ r: 255, g: 0, b: 0, a: 1 });
  });

  it("rgb <-> hsl", () => {
    const hsl = rgbToHsl({ r: 36, g: 86, b: 199, a: 1 });
    expect(Math.round(hsl.h)).toBe(222);
    expect(Math.round(hsl.s)).toBe(69);
    expect(Math.round(hsl.l)).toBe(46);
    expect(toHex(hslToRgb(hsl))).toBe("#2456c7");
  });

  it("normalizeHex drops or keeps alpha", () => {
    expect(normalizeHex("rgb(36 86 199 / 50%)")).toBe("#2456c7");
    expect(normalizeHex("rgb(36 86 199 / 50%)", true)).toBe("#2456c780");
    expect(normalizeHex("#ABC", true)).toBe("#aabbccff");
    expect(normalizeHex("nope")).toBeNull();
  });

  it("formats CSS strings", () => {
    expect(formatRgb({ r: 36, g: 86, b: 199, a: 1 })).toBe("rgb(36 86 199)");
    expect(formatRgb({ r: 36, g: 86, b: 199, a: 0.5 })).toBe("rgb(36 86 199 / 50%)");
    expect(formatHsl({ r: 255, g: 0, b: 0, a: 1 })).toBe("hsl(0 100% 50%)");
  });
});

describe("contrast", () => {
  it("matches WCAG reference values", () => {
    expect(contrastRatio(WHITE, BLACK)).toBe(21);
    expect(contrastRatio(BLACK, BLACK)).toBe(1);
    // #767676 on white is the classic 4.54:1
    expect(contrastRatio(parseColor("#767676")!, WHITE)).toBeCloseTo(4.54, 1);
  });

  it("composites translucent colors before measuring", () => {
    const halfBlack = { ...BLACK, a: 0.5 };
    const r = contrastRatio(halfBlack, WHITE);
    expect(r).toBeGreaterThan(3);
    expect(r).toBeLessThan(5);
  });

  it("wcagLevel thresholds", () => {
    expect(wcagLevel(7.1)).toBe("AAA");
    expect(wcagLevel(4.5)).toBe("AA");
    expect(wcagLevel(3.2)).toBe("AA Large");
    expect(wcagLevel(2.9)).toBe("Fail");
  });

  it("readableTextColor picks the stronger one", () => {
    expect(readableTextColor(parseColor("#2456c7")!)).toEqual(WHITE);
    expect(readableTextColor(parseColor("#ffe066")!)).toEqual(BLACK);
  });
});
