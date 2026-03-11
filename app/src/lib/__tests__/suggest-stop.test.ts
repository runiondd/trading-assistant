import { describe, it, expect } from "vitest";
import { suggestStopLoss, type StopInputs } from "@/lib/suggest-stop";

function makeInputs(overrides: Partial<StopInputs> = {}): StopInputs {
  return {
    entryPrice: 100,
    targetPrice: 110,
    direction: "long",
    levels: [],
    atr: null,
    ema20: null,
    ema50: null,
    bb: null,
    kc: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Basic behavior
// ---------------------------------------------------------------------------

describe("suggestStopLoss basics", () => {
  it("returns empty array when no data available", () => {
    const result = suggestStopLoss(makeInputs());
    expect(result).toEqual([]);
  });

  it("returns empty array when entry price is 0", () => {
    const result = suggestStopLoss(makeInputs({ entryPrice: 0, atr: 5 }));
    expect(result).toEqual([]);
  });

  it("returns at most 3 suggestions", () => {
    const result = suggestStopLoss(
      makeInputs({
        levels: [
          { price: 99, label: "L1", levelType: "manual" },
          { price: 97, label: "L2", levelType: "manual" },
          { price: 95, label: "L3", levelType: "fibonacci" },
          { price: 93, label: "L4", levelType: "fibonacci" },
          { price: 90, label: "L5", levelType: "manual" },
        ],
        atr: 3,
      }),
    );
    expect(result.length).toBeLessThanOrEqual(3);
  });
});

// ---------------------------------------------------------------------------
// Single source suggestions
// ---------------------------------------------------------------------------

describe("single source suggestions", () => {
  it("suggests stop from a manual S/R level (long)", () => {
    const result = suggestStopLoss(
      makeInputs({
        levels: [{ price: 95, label: "Major Support", levelType: "manual" }],
      }),
    );
    expect(result.length).toBe(1);
    expect(result[0].price).toBe(95);
    expect(result[0].sources[0].label).toBe("Major Support");
    expect(result[0].riskPct).toBeCloseTo(5, 1);
  });

  it("suggests ATR-based stop for long", () => {
    const result = suggestStopLoss(makeInputs({ atr: 4 }));
    expect(result.length).toBe(1);
    // 100 - 1.5*4 = 94
    expect(result[0].price).toBeCloseTo(94, 1);
    expect(result[0].sources[0].source).toBe("atr");
  });

  it("suggests ATR-based stop for short", () => {
    const result = suggestStopLoss(
      makeInputs({ direction: "short", entryPrice: 100, targetPrice: 90, atr: 4 }),
    );
    expect(result.length).toBe(1);
    // 100 + 1.5*4 = 106
    expect(result[0].price).toBeCloseTo(106, 1);
  });

  it("suggests EMA 50 as stop when below entry (long)", () => {
    const result = suggestStopLoss(makeInputs({ ema50: 96 }));
    expect(result.length).toBe(1);
    expect(result[0].price).toBe(96);
    expect(result[0].sources[0].label).toBe("EMA 50");
  });

  it("ignores EMA 50 when above entry for long", () => {
    const result = suggestStopLoss(makeInputs({ ema50: 105 }));
    expect(result).toEqual([]);
  });

  it("uses BB lower for long stop", () => {
    const result = suggestStopLoss(
      makeInputs({ bb: { upper: 110, middle: 100, lower: 92 } }),
    );
    expect(result.length).toBe(1);
    expect(result[0].price).toBe(92);
    expect(result[0].sources[0].label).toBe("BB Lower");
  });

  it("uses BB upper for short stop", () => {
    const result = suggestStopLoss(
      makeInputs({
        direction: "short",
        entryPrice: 100,
        targetPrice: 90,
        bb: { upper: 108, middle: 100, lower: 92 },
      }),
    );
    expect(result.length).toBe(1);
    expect(result[0].price).toBe(108);
    expect(result[0].sources[0].label).toBe("BB Upper");
  });
});

// ---------------------------------------------------------------------------
// Confluence clustering
// ---------------------------------------------------------------------------

describe("confluence clustering", () => {
  it("clusters nearby candidates and sums confidence", () => {
    // EMA50 at 95.3, manual level at 95.0 — within 0.5% of 100
    const result = suggestStopLoss(
      makeInputs({
        levels: [{ price: 95, label: "Support", levelType: "manual" }],
        ema50: 95.3,
      }),
    );
    // Should cluster into 1 suggestion
    expect(result.length).toBe(1);
    expect(result[0].sources.length).toBe(2);
    // Confidence should be higher than either alone (manual=30, ema50=20, +15 confluence)
    expect(result[0].confidence).toBeGreaterThanOrEqual(50);
  });

  it("keeps distant candidates as separate suggestions", () => {
    // 95 and 90 are far apart — should be separate clusters
    const result = suggestStopLoss(
      makeInputs({
        levels: [
          { price: 95, label: "Near Support", levelType: "manual" },
          { price: 90, label: "Far Support", levelType: "manual" },
        ],
      }),
    );
    expect(result.length).toBe(2);
  });

  it("ranks higher confidence clusters first", () => {
    // ATR stop at ~94, fib at 94.2, manual at 90
    // The ATR+fib cluster should rank above the lone manual level
    const result = suggestStopLoss(
      makeInputs({
        levels: [
          { price: 94.2, label: "Fib 38.2%", levelType: "fibonacci" },
          { price: 90, label: "Major Support", levelType: "manual" },
        ],
        atr: 4, // ATR stop = 100 - 6 = 94
      }),
    );
    expect(result.length).toBe(2);
    expect(result[0].confidence).toBeGreaterThan(result[1].confidence);
    // First suggestion should be the cluster near 94
    expect(result[0].price).toBeGreaterThan(93);
    expect(result[0].price).toBeLessThan(95);
  });

  it("triple confluence scores very high", () => {
    // manual + fib + EMA50 all near 95
    const result = suggestStopLoss(
      makeInputs({
        levels: [
          { price: 95, label: "Support", levelType: "manual" },
          { price: 95.2, label: "Fib 50%", levelType: "fibonacci" },
        ],
        ema50: 95.1,
      }),
    );
    expect(result.length).toBe(1);
    expect(result[0].sources.length).toBe(3);
    // manual(30) + fib(20) + ema50(20) + 2*confluence(30) = 100
    expect(result[0].confidence).toBeGreaterThanOrEqual(90);
  });
});

// ---------------------------------------------------------------------------
// R:R ratio calculation
// ---------------------------------------------------------------------------

describe("R:R in suggestions", () => {
  it("calculates R:R when target provided (long)", () => {
    const result = suggestStopLoss(
      makeInputs({
        entryPrice: 100,
        targetPrice: 110,
        levels: [{ price: 95, label: "Support", levelType: "manual" }],
      }),
    );
    // risk = 5, reward = 10, R:R = 2:1
    expect(result[0].rrRatio).toBeCloseTo(2, 1);
  });

  it("calculates R:R when target provided (short)", () => {
    const result = suggestStopLoss(
      makeInputs({
        direction: "short",
        entryPrice: 100,
        targetPrice: 90,
        levels: [{ price: 105, label: "Resistance", levelType: "manual" }],
      }),
    );
    // risk = 5, reward = 10, R:R = 2:1
    expect(result[0].rrRatio).toBeCloseTo(2, 1);
  });

  it("returns null R:R when no target", () => {
    const result = suggestStopLoss(
      makeInputs({
        targetPrice: null,
        levels: [{ price: 95, label: "Support", levelType: "manual" }],
      }),
    );
    expect(result[0].rrRatio).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Direction filtering
// ---------------------------------------------------------------------------

describe("direction filtering", () => {
  it("only suggests stops below entry for longs", () => {
    const result = suggestStopLoss(
      makeInputs({
        direction: "long",
        entryPrice: 100,
        levels: [
          { price: 105, label: "Above", levelType: "manual" },
          { price: 95, label: "Below", levelType: "manual" },
        ],
      }),
    );
    expect(result.length).toBe(1);
    expect(result[0].price).toBe(95);
  });

  it("only suggests stops above entry for shorts", () => {
    const result = suggestStopLoss(
      makeInputs({
        direction: "short",
        entryPrice: 100,
        targetPrice: 90,
        levels: [
          { price: 105, label: "Above", levelType: "manual" },
          { price: 95, label: "Below", levelType: "manual" },
        ],
      }),
    );
    expect(result.length).toBe(1);
    expect(result[0].price).toBe(105);
  });
});
