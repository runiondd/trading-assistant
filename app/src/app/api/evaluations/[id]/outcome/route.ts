import { db } from "@/db";
import { tradeOutcomes, tradeEvaluations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const evaluationId = Number(id);

  const [evaluation] = await db
    .select()
    .from(tradeEvaluations)
    .where(eq(tradeEvaluations.id, evaluationId));

  if (!evaluation) {
    return NextResponse.json({ error: "Evaluation not found" }, { status: 404 });
  }

  const body = await request.json();
  const { actualEntry, actualExit, pnl, notes } = body;

  if (actualEntry === undefined || actualExit === undefined || pnl === undefined) {
    return NextResponse.json(
      { error: "Missing required fields: actualEntry, actualExit, pnl" },
      { status: 400 }
    );
  }

  const [created] = await db
    .insert(tradeOutcomes)
    .values({
      evaluationId,
      actualEntry,
      actualExit,
      pnl,
      notes: notes ?? null,
      closedAt: new Date().toISOString(),
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
