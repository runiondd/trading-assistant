import { db } from "@/db";
import {
  tradeEvaluations,
  factorScores,
  checklistFactors,
  tradeOutcomes,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [evaluation] = await db
    .select()
    .from(tradeEvaluations)
    .where(eq(tradeEvaluations.id, Number(id)));

  if (!evaluation) {
    return NextResponse.json(
      { error: "Evaluation not found" },
      { status: 404 }
    );
  }

  // Fetch factor scores joined with checklist factors for names/weights
  const scores = await db
    .select({
      id: factorScores.id,
      evaluationId: factorScores.evaluationId,
      factorId: factorScores.factorId,
      rawValue: factorScores.rawValue,
      normalizedScore: factorScores.normalizedScore,
      maxScore: factorScores.maxScore,
      factorName: checklistFactors.name,
      factorWeight: checklistFactors.weight,
    })
    .from(factorScores)
    .innerJoin(
      checklistFactors,
      eq(factorScores.factorId, checklistFactors.id)
    )
    .where(eq(factorScores.evaluationId, Number(id)));

  // Check if a trade outcome exists
  const [outcome] = await db
    .select()
    .from(tradeOutcomes)
    .where(eq(tradeOutcomes.evaluationId, Number(id)));

  return NextResponse.json({
    evaluation,
    factorScores: scores,
    outcome: outcome ?? null,
  });
}
