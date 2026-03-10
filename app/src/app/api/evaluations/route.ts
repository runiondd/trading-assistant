import { db } from "@/db";
import {
  tradeEvaluations,
  factorScores,
  checklistFactors,
  accounts,
} from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { calculateScore, type ChecklistFactor } from "@/lib/scoring";
import {
  calculatePositionSize,
  checkIraEligibility,
} from "@/lib/position-sizing";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    assetId,
    accountId,
    direction,
    timeframe,
    entryPrice,
    stopLoss,
    targets,
    factorValues,
    overrides,
  } = body;

  // Validate required fields
  if (
    assetId == null ||
    accountId == null ||
    !direction ||
    !timeframe ||
    entryPrice == null ||
    stopLoss == null ||
    !targets ||
    !factorValues
  ) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  // Fetch account
  const [account] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.id, accountId));

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  // Fetch all checklist factors
  const factors = await db
    .select()
    .from(checklistFactors)
    .orderBy(asc(checklistFactors.sortOrder));

  // Calculate R:R ratio
  const rrRatio =
    targets[0] != null
      ? Math.abs(targets[0] - entryPrice) / Math.abs(entryPrice - stopLoss)
      : 0;

  // Build values map keyed by factor id (number)
  const valuesMap: Record<number, string> = {};
  for (const [key, value] of Object.entries(factorValues)) {
    valuesMap[Number(key)] = value as string;
  }

  // Score evaluation
  const scoringResult = calculateScore(
    factors as ChecklistFactor[],
    valuesMap,
    direction,
    rrRatio
  );

  // Calculate position size
  const positionResult = calculatePositionSize({
    balance: account.balance,
    riskPct: account.defaultRiskPct,
    entryPrice,
    stopLoss,
    direction,
  });

  // Check IRA eligibility
  const iraCheck = checkIraEligibility(
    direction,
    "shares",
    account.accountType
  );

  // Insert trade evaluation
  const [evaluation] = await db
    .insert(tradeEvaluations)
    .values({
      assetId,
      accountId,
      direction,
      timeframe,
      entryPrice,
      stopLoss,
      targetsJson: JSON.stringify(targets),
      compositeScore: scoringResult.compositeScore,
      signal: scoringResult.signal,
      rrRatio,
      positionSize: positionResult.shares,
      positionCost: positionResult.positionCost,
      vehicle: "shares",
      iraEligible: iraCheck.eligible ? 1 : 0,
      overridesJson: overrides ? JSON.stringify(overrides) : null,
    })
    .returning();

  // Insert factor scores
  const factorScoreRows = scoringResult.factorResults.map((fr) => ({
    evaluationId: evaluation.id,
    factorId: fr.factorId,
    rawValue: fr.rawValue,
    normalizedScore: fr.normalizedScore,
    maxScore: fr.maxScore,
  }));

  if (factorScoreRows.length > 0) {
    await db.insert(factorScores).values(factorScoreRows);
  }

  // Fetch inserted factor scores
  const insertedScores = await db
    .select()
    .from(factorScores)
    .where(eq(factorScores.evaluationId, evaluation.id));

  return NextResponse.json({
    evaluation,
    factorScores: insertedScores,
    scoring: scoringResult,
  });
}
