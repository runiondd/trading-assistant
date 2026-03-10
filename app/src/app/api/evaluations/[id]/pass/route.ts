import { db } from "@/db";
import { tradeEvaluations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

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

  if (existing.status === "confirmed") {
    return NextResponse.json(
      { error: "Cannot pass an evaluation that has already been confirmed" },
      { status: 400 }
    );
  }

  const [updated] = await db
    .update(tradeEvaluations)
    .set({
      status: "passed",
      passedAt: new Date().toISOString(),
      passReason: body.passReason ?? null,
    })
    .where(eq(tradeEvaluations.id, Number(id)))
    .returning();

  return NextResponse.json(updated);
}
