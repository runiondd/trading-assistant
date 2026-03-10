/**
 * End-to-end smoke test for the complete trade evaluation flow.
 *
 * Requires the dev server to be running at http://localhost:3001.
 * Exercises: create asset → add levels → evaluate with scoring →
 * view result → confirm trade → log outcome → verify in journal.
 */

import { describe, it, expect, beforeAll } from "vitest";

const BASE = "http://localhost:3001";

async function api(path: string, opts?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, opts);
  const body = await res.json();
  return { status: res.status, body };
}

async function post(path: string, data: unknown) {
  return api(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

async function put(path: string, data?: unknown) {
  return api(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: data ? JSON.stringify(data) : undefined,
  });
}

// Check server is reachable before running tests
beforeAll(async () => {
  try {
    await fetch(`${BASE}/api/assets`);
  } catch {
    throw new Error(
      "Dev server not running at http://localhost:3001. Start it with: cd app && npm run dev"
    );
  }
});

describe("e2e: full trade evaluation flow", () => {
  const uniqueTicker = `TEST${Date.now()}`;
  let assetId: number;
  let accountId: number;
  let evaluationId: number;
  let passedEvalId: number;
  let factors: { id: number; name: string; scoreType: string; configJson: string | null }[];

  // ── Step 1: Create a test asset ──

  it("creates a new asset", async () => {
    const { status, body } = await post("/api/assets", {
      ticker: uniqueTicker,
      name: "E2E Test Asset",
      assetClass: "equity",
      exchange: "TEST",
    });

    expect(status).toBe(201);
    expect(body.id).toBeTypeOf("number");
    expect(body.ticker).toBe(uniqueTicker);
    assetId = body.id;
  });

  it("asset appears in asset list", async () => {
    const { body } = await api("/api/assets");
    const found = body.find((a: { ticker: string }) => a.ticker === uniqueTicker);
    expect(found).toBeTruthy();
    expect(found.assetClass).toBe("equity");
  });

  // ── Step 2: Add S/R levels ──
  // Note: the levels API expects snake_case `level_type`, not camelCase

  it("adds manual support/resistance levels", async () => {
    const { status: s1 } = await post(`/api/assets/${assetId}/levels`, {
      price: 150,
      label: "Major Support",
      level_type: "manual",
    });
    expect(s1).toBe(201);

    const { status: s2 } = await post(`/api/assets/${assetId}/levels`, {
      price: 170,
      label: "Major Resistance",
      level_type: "manual",
    });
    expect(s2).toBe(201);
  });

  it("adds fibonacci levels via batch", async () => {
    const { status } = await post(`/api/assets/${assetId}/levels`, {
      levels: [
        { price: 153.54, label: "Fib 23.6%", level_type: "fibonacci" },
        { price: 157.64, label: "Fib 38.2%", level_type: "fibonacci" },
        { price: 160.0, label: "Fib 50%", level_type: "fibonacci" },
        { price: 162.36, label: "Fib 61.8%", level_type: "fibonacci" },
        { price: 165.72, label: "Fib 78.6%", level_type: "fibonacci" },
      ],
    });
    expect(status).toBe(201);
  });

  it("fetches all levels for the asset", async () => {
    const { status, body } = await api(`/api/assets/${assetId}/levels`);
    expect(status).toBe(200);
    expect(body.length).toBe(7); // 2 manual + 5 fib
  });

  // ── Step 3: Get an account for the evaluation ──

  it("fetches accounts", async () => {
    const { status, body } = await api("/api/accounts");
    expect(status).toBe(200);
    expect(body.length).toBeGreaterThan(0);
    accountId = body[0].id;
  });

  // ── Step 4: Fetch checklist factors ──

  it("fetches checklist factors", async () => {
    const { status, body } = await api("/api/checklist");
    expect(status).toBe(200);
    expect(body.length).toBeGreaterThan(0);
    factors = body;
  });

  // ── Step 5: Create a trade evaluation ──

  it("creates a scored evaluation", async () => {
    // Build factor values: give good values for a high score
    const factorValues: Record<string, string> = {};
    for (const f of factors) {
      if (f.scoreType === "pass_fail") {
        factorValues[String(f.id)] = "true";
      } else if (f.scoreType === "scale") {
        const options = f.configJson ? JSON.parse(f.configJson).options : [];
        factorValues[String(f.id)] = options[options.length - 1] ?? "true";
      } else if (f.scoreType === "numeric") {
        factorValues[String(f.id)] = "3.0";
      }
    }

    const { status, body } = await post("/api/evaluations", {
      assetId,
      accountId,
      direction: "long",
      timeframe: "4h",
      entryPrice: 155,
      stopLoss: 150,
      targets: [170],
      factorValues,
    });

    expect(status).toBe(200);
    expect(body.evaluation).toBeTruthy();
    expect(body.evaluation.id).toBeTypeOf("number");
    expect(body.evaluation.compositeScore).toBeTypeOf("number");
    expect(body.evaluation.compositeScore).toBeGreaterThan(0);
    expect(body.evaluation.signal).toMatch(/^(green|yellow|red)$/);
    expect(body.evaluation.positionSize).toBeGreaterThan(0);
    expect(body.evaluation.status).toBe("pending");
    expect(body.factorScores.length).toBe(factors.length);

    evaluationId = body.evaluation.id;
  });

  it("validates entry != stop", async () => {
    const factorValues: Record<string, string> = {};
    for (const f of factors) {
      factorValues[String(f.id)] = f.scoreType === "pass_fail" ? "true" : "1";
    }

    const { status, body } = await post("/api/evaluations", {
      assetId,
      accountId,
      direction: "long",
      timeframe: "4h",
      entryPrice: 100,
      stopLoss: 100,
      targets: [110],
      factorValues,
    });

    expect(status).toBe(400);
    expect(body.error).toContain("same");
  });

  // ── Step 6: Fetch evaluation detail ──

  it("fetches evaluation detail with scores", async () => {
    const { status, body } = await api(`/api/evaluations/${evaluationId}`);
    expect(status).toBe(200);
    expect(body.evaluation.id).toBe(evaluationId);
    expect(body.factorScores.length).toBe(factors.length);
  });

  // ── Step 7: Confirm the trade ──

  it("confirms the trade", async () => {
    const { status, body } = await put(`/api/evaluations/${evaluationId}/confirm`);
    expect(status).toBe(200);
    expect(body.status).toBe("confirmed");
    expect(body.confirmedAt).toBeTruthy();
  });

  it("can re-confirm an already-confirmed trade (idempotent)", async () => {
    const { status } = await put(`/api/evaluations/${evaluationId}/confirm`);
    expect(status).toBe(200);
  });

  // ── Step 8: Log trade outcome ──

  it("logs a trade outcome", async () => {
    const { status, body } = await post(`/api/evaluations/${evaluationId}/outcome`, {
      actualEntry: 155.5,
      actualExit: 168.0,
      pnl: 2300,
      notes: "E2E test outcome — hit target near resistance",
    });

    expect(status).toBe(201);
    expect(body.evaluationId).toBe(evaluationId);
    expect(body.pnl).toBe(2300);
    expect(body.actualEntry).toBe(155.5);
    expect(body.actualExit).toBe(168.0);
  });

  // ── Step 9: Verify in journal ──

  it("trade appears in journal with outcome", async () => {
    const { status, body } = await api("/api/journal");
    expect(status).toBe(200);

    const entry = body.find((e: { id: number }) => e.id === evaluationId);
    expect(entry).toBeTruthy();
    expect(entry.ticker).toBe(uniqueTicker);
    expect(entry.status).toBe("confirmed");
    expect(entry.outcome).toBeTruthy();
    expect(entry.outcome.pnl).toBe(2300);
  });

  it("journal filters by status", async () => {
    const { body: confirmed } = await api("/api/journal?status=confirmed");
    const found = confirmed.find((e: { id: number }) => e.id === evaluationId);
    expect(found).toBeTruthy();

    const { body: passed } = await api("/api/journal?status=passed");
    const notFound = passed.find((e: { id: number }) => e.id === evaluationId);
    expect(notFound).toBeFalsy();
  });

  // ── Step 10: Pass flow (separate evaluation) ──

  it("can pass on a trade with a reason", async () => {
    const factorValues: Record<string, string> = {};
    for (const f of factors) {
      factorValues[String(f.id)] = f.scoreType === "pass_fail" ? "false" : "0";
    }

    const { body: evalBody } = await post("/api/evaluations", {
      assetId,
      accountId,
      direction: "short",
      timeframe: "1h",
      entryPrice: 165,
      stopLoss: 170,
      targets: [155],
      factorValues,
    });

    passedEvalId = evalBody.evaluation.id;
    expect(evalBody.evaluation.signal).toBe("red");

    const { status, body } = await put(`/api/evaluations/${passedEvalId}/pass`, {
      passReason: "Low conviction, waiting for better setup",
    });

    expect(status).toBe(200);
    expect(body.status).toBe("passed");
    expect(body.passReason).toBe("Low conviction, waiting for better setup");
  });

  // ── Step 11: Cannot confirm a passed evaluation ──

  it("rejects confirming a passed evaluation", async () => {
    const { status, body } = await put(`/api/evaluations/${passedEvalId}/confirm`);
    expect(status).toBe(400);
    expect(body.error).toContain("passed");
  });

  // ── Cleanup verification ──

  it("asset detail still accessible with all data", async () => {
    const { status, body } = await api(`/api/assets/${assetId}`);
    expect(status).toBe(200);
    expect(body.ticker).toBe(uniqueTicker);
  });
});
