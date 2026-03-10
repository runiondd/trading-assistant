import { db } from "@/db";
import { tradeEvaluations, assets, tradeOutcomes } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status") ?? "all";
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 200);

  const query = db
    .select({
      id: tradeEvaluations.id,
      assetId: tradeEvaluations.assetId,
      accountId: tradeEvaluations.accountId,
      direction: tradeEvaluations.direction,
      timeframe: tradeEvaluations.timeframe,
      entryPrice: tradeEvaluations.entryPrice,
      stopLoss: tradeEvaluations.stopLoss,
      targetsJson: tradeEvaluations.targetsJson,
      compositeScore: tradeEvaluations.compositeScore,
      signal: tradeEvaluations.signal,
      status: tradeEvaluations.status,
      rrRatio: tradeEvaluations.rrRatio,
      positionSize: tradeEvaluations.positionSize,
      positionCost: tradeEvaluations.positionCost,
      vehicle: tradeEvaluations.vehicle,
      iraEligible: tradeEvaluations.iraEligible,
      confirmedAt: tradeEvaluations.confirmedAt,
      passedAt: tradeEvaluations.passedAt,
      passReason: tradeEvaluations.passReason,
      overridesJson: tradeEvaluations.overridesJson,
      createdAt: tradeEvaluations.createdAt,
      ticker: assets.ticker,
      assetName: assets.name,
      outcome: {
        id: tradeOutcomes.id,
        actualEntry: tradeOutcomes.actualEntry,
        actualExit: tradeOutcomes.actualExit,
        pnl: tradeOutcomes.pnl,
        notes: tradeOutcomes.notes,
        closedAt: tradeOutcomes.closedAt,
      },
    })
    .from(tradeEvaluations)
    .innerJoin(assets, eq(tradeEvaluations.assetId, assets.id))
    .leftJoin(
      tradeOutcomes,
      eq(tradeEvaluations.id, tradeOutcomes.evaluationId)
    )
    .orderBy(desc(tradeEvaluations.createdAt))
    .limit(limit);

  if (status === "confirmed") {
    query.where(eq(tradeEvaluations.status, "confirmed"));
  } else if (status === "passed") {
    query.where(eq(tradeEvaluations.status, "passed"));
  }

  const rows = await query;

  const result = rows.map((row) => ({
    id: row.id,
    assetId: row.assetId,
    accountId: row.accountId,
    direction: row.direction,
    timeframe: row.timeframe,
    entryPrice: row.entryPrice,
    stopLoss: row.stopLoss,
    targetsJson: row.targetsJson,
    compositeScore: row.compositeScore,
    signal: row.signal,
    status: row.status,
    rrRatio: row.rrRatio,
    positionSize: row.positionSize,
    positionCost: row.positionCost,
    vehicle: row.vehicle,
    iraEligible: row.iraEligible,
    confirmedAt: row.confirmedAt,
    passedAt: row.passedAt,
    passReason: row.passReason,
    overridesJson: row.overridesJson,
    createdAt: row.createdAt,
    ticker: row.ticker,
    assetName: row.assetName,
    outcome: row.outcome?.id ? row.outcome : null,
  }));

  return NextResponse.json(result);
}
