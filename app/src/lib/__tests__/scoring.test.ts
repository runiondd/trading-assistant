import { describe, it, expect } from "vitest";
import { calculateScore, ChecklistFactor } from "@/lib/scoring";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePassFail(id: number, weight: number): ChecklistFactor {
  return { id, name: `pf-${id}`, weight, scoreType: "pass_fail", configJson: null };
}

function makeScale(id: number, weight: number, options: string[]): ChecklistFactor {
  return {
    id,
    name: `scale-${id}`,
    weight,
    scoreType: "scale",
    configJson: JSON.stringify({ options }),
  };
}

function makeNumeric(id: number, weight: number): ChecklistFactor {
  return { id, name: `numeric-${id}`, weight, scoreType: "numeric", configJson: null };
}

// ---------------------------------------------------------------------------
// 1. Scale factor scoring (each option level)
// ---------------------------------------------------------------------------

describe("scale factor scoring", () => {
  const options = ["weak", "moderate", "strong"];
  const factor = makeScale(1, 10, options);

  it("scores the first option as 0", () => {
    const result = calculateScore([factor], { 1: "weak" }, "long", 2);
    expect(result.factorResults[0].normalizedScore).toBe(0);
    expect(result.factorResults[0].maxScore).toBe(10);
  });

  it("scores the middle option proportionally", () => {
    const result = calculateScore([factor], { 1: "moderate" }, "long", 2);
    expect(result.factorResults[0].normalizedScore).toBe(5);
  });

  it("scores the last option as full weight", () => {
    const result = calculateScore([factor], { 1: "strong" }, "long", 2);
    expect(result.factorResults[0].normalizedScore).toBe(10);
  });

  it("scores an unknown option as 0", () => {
    const result = calculateScore([factor], { 1: "unknown" }, "long", 2);
    expect(result.factorResults[0].normalizedScore).toBe(0);
  });

  it("handles a 4-option scale correctly", () => {
    const fourOptions = ["none", "low", "medium", "high"];
    const f = makeScale(2, 12, fourOptions);
    const result = calculateScore([f], { 2: "medium" }, "long", 2);
    // index 2 / (4-1) * 12 = (2/3) * 12 = 8
    expect(result.factorResults[0].normalizedScore).toBeCloseTo(8);
  });
});

// ---------------------------------------------------------------------------
// 2. Pass/fail factor scoring
// ---------------------------------------------------------------------------

describe("pass/fail factor scoring", () => {
  const factor = makePassFail(10, 15);

  it("gives full weight when value is 'true'", () => {
    const result = calculateScore([factor], { 10: "true" }, "long", 2);
    expect(result.factorResults[0].normalizedScore).toBe(15);
    expect(result.factorResults[0].maxScore).toBe(15);
  });

  it("gives 0 when value is 'false'", () => {
    const result = calculateScore([factor], { 10: "false" }, "long", 2);
    expect(result.factorResults[0].normalizedScore).toBe(0);
    expect(result.factorResults[0].maxScore).toBe(15);
  });

  it("gives 0 for any non-'true' string", () => {
    const result = calculateScore([factor], { 10: "yes" }, "long", 2);
    expect(result.factorResults[0].normalizedScore).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 3. Composite score calculation with mixed factors
// ---------------------------------------------------------------------------

describe("composite score with mixed factors", () => {
  const factors: ChecklistFactor[] = [
    makePassFail(1, 10),
    makeScale(2, 10, ["low", "medium", "high"]),
    makeNumeric(3, 10),
  ];

  it("computes correct composite from mixed factor types", () => {
    // pass_fail true => 10/10
    // scale "medium" => 5/10
    // numeric "2.5" => 10/10  (>= 2 => full)
    const result = calculateScore(
      factors,
      { 1: "true", 2: "medium", 3: "2.5" },
      "long",
      2,
    );
    // total normalized = 25, total max = 30, composite = 83.33...
    expect(result.compositeScore).toBeCloseTo(83.33, 1);
  });

  it("computes composite when some factors score 0", () => {
    // pass_fail false => 0/10
    // scale "low" => 0/10
    // numeric "0.5" => 0/10 (< 1 => 0)
    const result = calculateScore(
      factors,
      { 1: "false", 2: "low", 3: "0.5" },
      "short",
      1,
    );
    expect(result.compositeScore).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 4. Signal thresholds (green/yellow/red boundary cases)
// ---------------------------------------------------------------------------

describe("signal thresholds", () => {
  it("returns 'green' when composite is exactly 75", () => {
    // Need 75% score: 3 factors weight 10 each, total max = 30
    // Need normalized = 22.5 => pass_fail true (10) + scale "high" (10) + numeric "1" (5) = 25 => 83.3 (too high)
    // Use 4 factors weight 25 each, total max = 100
    // Need normalized = 75
    const factors = [makePassFail(1, 25), makePassFail(2, 25), makePassFail(3, 25), makePassFail(4, 25)];
    // 3 true, 1 false => 75/100 = 75
    const result = calculateScore(factors, { 1: "true", 2: "true", 3: "true", 4: "false" }, "long", 2);
    expect(result.compositeScore).toBe(75);
    expect(result.signal).toBe("green");
  });

  it("returns 'yellow' when composite is exactly 50", () => {
    const factors = [makePassFail(1, 25), makePassFail(2, 25), makePassFail(3, 25), makePassFail(4, 25)];
    // 2 true, 2 false => 50/100 = 50
    const result = calculateScore(factors, { 1: "true", 2: "true", 3: "false", 4: "false" }, "long", 2);
    expect(result.compositeScore).toBe(50);
    expect(result.signal).toBe("yellow");
  });

  it("returns 'red' when composite is just below 50", () => {
    // 1 true out of 4 => 25
    const factors = [makePassFail(1, 25), makePassFail(2, 25), makePassFail(3, 25), makePassFail(4, 25)];
    const result = calculateScore(factors, { 1: "true", 2: "false", 3: "false", 4: "false" }, "long", 2);
    expect(result.compositeScore).toBe(25);
    expect(result.signal).toBe("red");
  });

  it("returns 'yellow' at 74.99 (just below green)", () => {
    // Use scale with many options to get close to 75 but not quite
    // 3 factors, weight 10 each. Need < 75% => normalized < 22.5 of 30
    // scale with 100 options, pick index 74 => 74/99 * 10 = 7.474...
    // pass_fail true => 10, pass_fail true => 10 => total = 27.474 / 30 = 91.6 (too high)
    // Simpler: 1 factor weight 10000, scale 10001 options, pick index 7499
    // => 7499 / 10000 * 10000 = 7499 => 7499/10000 * 100 = 74.99
    const options = Array.from({ length: 10001 }, (_, i) => `opt${i}`);
    const factors = [makeScale(1, 10000, options)];
    const result = calculateScore(factors, { 1: "opt7499" }, "long", 2);
    expect(result.compositeScore).toBeCloseTo(74.99, 1);
    expect(result.signal).toBe("yellow");
  });
});

// ---------------------------------------------------------------------------
// 5. All max values -> score 100
// ---------------------------------------------------------------------------

describe("all max values yield score 100", () => {
  it("returns composite 100 and green signal", () => {
    const factors: ChecklistFactor[] = [
      makePassFail(1, 10),
      makeScale(2, 20, ["low", "high"]),
      makeNumeric(3, 15),
    ];
    const result = calculateScore(
      factors,
      { 1: "true", 2: "high", 3: "3" },
      "long",
      3,
    );
    expect(result.compositeScore).toBe(100);
    expect(result.signal).toBe("green");
  });
});

// ---------------------------------------------------------------------------
// 6. All min values -> score 0
// ---------------------------------------------------------------------------

describe("all min values yield score 0", () => {
  it("returns composite 0 and red signal", () => {
    const factors: ChecklistFactor[] = [
      makePassFail(1, 10),
      makeScale(2, 20, ["low", "high"]),
      makeNumeric(3, 15),
    ];
    const result = calculateScore(
      factors,
      { 1: "false", 2: "low", 3: "0" },
      "long",
      0,
    );
    expect(result.compositeScore).toBe(0);
    expect(result.signal).toBe("red");
  });
});

// ---------------------------------------------------------------------------
// 7. Missing factor values default to 0
// ---------------------------------------------------------------------------

describe("missing factor values default to 0", () => {
  it("treats missing values as empty string and scores 0", () => {
    const factors: ChecklistFactor[] = [
      makePassFail(1, 10),
      makeScale(2, 20, ["a", "b", "c"]),
      makeNumeric(3, 15),
    ];
    // Pass no values at all
    const result = calculateScore(factors, {}, "long", 2);
    expect(result.factorResults[0].normalizedScore).toBe(0);
    expect(result.factorResults[0].rawValue).toBe("");
    expect(result.factorResults[1].normalizedScore).toBe(0);
    expect(result.factorResults[1].rawValue).toBe("");
    expect(result.factorResults[2].normalizedScore).toBe(0);
    expect(result.factorResults[2].rawValue).toBe("");
    expect(result.compositeScore).toBe(0);
    expect(result.signal).toBe("red");
  });

  it("scores provided factors normally while missing ones get 0", () => {
    const factors: ChecklistFactor[] = [
      makePassFail(1, 10),
      makePassFail(2, 10),
    ];
    // Only provide factor 1
    const result = calculateScore(factors, { 1: "true" }, "long", 2);
    expect(result.factorResults[0].normalizedScore).toBe(10);
    expect(result.factorResults[1].normalizedScore).toBe(0);
    expect(result.compositeScore).toBe(50);
    expect(result.signal).toBe("yellow");
  });
});

// ---------------------------------------------------------------------------
// Numeric factor edge cases
// ---------------------------------------------------------------------------

describe("numeric factor scoring", () => {
  const factor = makeNumeric(1, 10);

  it("gives full weight for value >= 2", () => {
    const result = calculateScore([factor], { 1: "2" }, "long", 2);
    expect(result.factorResults[0].normalizedScore).toBe(10);
  });

  it("gives half weight for value >= 1 and < 2", () => {
    const result = calculateScore([factor], { 1: "1.5" }, "long", 2);
    expect(result.factorResults[0].normalizedScore).toBe(5);
  });

  it("gives 0 for value < 1", () => {
    const result = calculateScore([factor], { 1: "0.9" }, "long", 2);
    expect(result.factorResults[0].normalizedScore).toBe(0);
  });

  it("gives 0 for non-numeric string", () => {
    const result = calculateScore([factor], { 1: "abc" }, "long", 2);
    expect(result.factorResults[0].normalizedScore).toBe(0);
  });
});
