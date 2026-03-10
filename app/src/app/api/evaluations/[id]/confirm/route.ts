import { db } from "@/db";
import { tradeEvaluations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [existing] = await db
    .select()
    .from(tradeEvaluations)
    .where(eq(tradeEvaluations.id, Number(id)));

  if (!existing) {
    return NextResponse.json(
      { error: "Evaluation not found" },
      { status: 404 }
    );
  }

  if (existing.status === "passed") {
    return NextResponse.json(
      { error: "Cannot confirm an evaluation that has already been passed" },
      { status: 400 }
    );
  }

  const [updated] = await db
    .update(tradeEvaluations)
    .set({
      status: "confirmed",
      confirmedAt: new Date().toISOString(),
    })
    .where(eq(tradeEvaluations.id, Number(id)))
    .returning();

  return NextResponse.json(updated);
}
