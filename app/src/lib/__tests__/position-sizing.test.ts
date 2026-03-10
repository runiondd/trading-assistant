import { describe, it, expect } from "vitest";
import {
  calculatePositionSize,
  checkIraEligibility,
} from "@/lib/position-sizing";

describe("calculatePositionSize", () => {
  it("standard long calculation: $92K account, 1% risk, entry $100, stop $95", () => {
    const result = calculatePositionSize({
      balance: 92_000,
      riskPct: 1.0,
      entryPrice: 100,
      stopLoss: 95,
      direction: "long",
    });

    expect(result.riskAmount).toBe(920);
    expect(result.riskPerShare).toBe(5);
    expect(result.shares).toBe(184);
    expect(result.positionCost).toBe(18_400);
  });

  it("standard short calculation", () => {
    const result = calculatePositionSize({
      balance: 50_000,
      riskPct: 1.0,
      entryPrice: 200,
      stopLoss: 210,
      direction: "short",
    });

    expect(result.riskAmount).toBe(500);
    expect(result.riskPerShare).toBe(10);
    expect(result.shares).toBe(50);
    expect(result.positionCost).toBe(10_000);
  });

  it("returns shares=0 when entry equals stop (zero risk distance)", () => {
    const result = calculatePositionSize({
      balance: 100_000,
      riskPct: 1.0,
      entryPrice: 50,
      stopLoss: 50,
      direction: "long",
    });

    expect(result.shares).toBe(0);
    expect(result.positionCost).toBe(0);
  });

  it("returns shares=0 for invalid long (stop >= entry)", () => {
    const result = calculatePositionSize({
      balance: 100_000,
      riskPct: 1.0,
      entryPrice: 100,
      stopLoss: 105,
      direction: "long",
    });

    expect(result.shares).toBe(0);
    expect(result.positionCost).toBe(0);
  });

  it("returns shares=0 for invalid short (stop <= entry)", () => {
    const result = calculatePositionSize({
      balance: 100_000,
      riskPct: 1.0,
      entryPrice: 100,
      stopLoss: 95,
      direction: "short",
    });

    expect(result.shares).toBe(0);
    expect(result.positionCost).toBe(0);
  });

  it("high conviction 2% risk doubles the shares", () => {
    const onePercent = calculatePositionSize({
      balance: 92_000,
      riskPct: 1.0,
      entryPrice: 100,
      stopLoss: 95,
      direction: "long",
    });

    const twoPercent = calculatePositionSize({
      balance: 92_000,
      riskPct: 2.0,
      entryPrice: 100,
      stopLoss: 95,
      direction: "long",
    });

    expect(twoPercent.riskAmount).toBe(onePercent.riskAmount * 2);
    expect(twoPercent.shares).toBe(onePercent.shares * 2);
    expect(twoPercent.shares).toBe(368);
    expect(twoPercent.positionCost).toBe(36_800);
  });
});

describe("checkIraEligibility", () => {
  it("blocks short selling in IRA accounts", () => {
    const result = checkIraEligibility("short", "stock", "ira");

    expect(result.eligible).toBe(false);
    expect(result.reason).toBe(
      "Short selling not allowed in IRA accounts"
    );
  });

  it("blocks short selling in Roth IRA accounts", () => {
    const result = checkIraEligibility("short", "stock", "roth");

    expect(result.eligible).toBe(false);
    expect(result.reason).toBe(
      "Short selling not allowed in IRA accounts"
    );
  });

  it("blocks options in IRA accounts", () => {
    const result = checkIraEligibility("long", "options", "ira");

    expect(result.eligible).toBe(false);
    expect(result.reason).toBe(
      "Options/futures not allowed in IRA accounts"
    );
  });

  it("blocks futures in IRA accounts", () => {
    const result = checkIraEligibility("long", "futures", "roth");

    expect(result.eligible).toBe(false);
    expect(result.reason).toBe(
      "Options/futures not allowed in IRA accounts"
    );
  });

  it("allows all vehicles in taxable accounts", () => {
    expect(checkIraEligibility("long", "stock", "taxable")).toEqual({
      eligible: true,
    });
    expect(checkIraEligibility("short", "stock", "taxable")).toEqual({
      eligible: true,
    });
    expect(checkIraEligibility("long", "options", "taxable")).toEqual({
      eligible: true,
    });
    expect(checkIraEligibility("long", "futures", "taxable")).toEqual({
      eligible: true,
    });
  });

  it("allows long stock in IRA accounts", () => {
    const result = checkIraEligibility("long", "stock", "ira");

    expect(result.eligible).toBe(true);
    expect(result.reason).toBeUndefined();
  });
});
