import { db } from "@/db";
import { savedFactorValues, checklistFactors } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const rows = await db
    .select({
      id: savedFactorValues.id,
      assetId: savedFactorValues.assetId,
      factorId: savedFactorValues.factorId,
      value: savedFactorValues.value,
      updatedAt: savedFactorValues.updatedAt,
      factorName: checklistFactors.name,
    })
    .from(savedFactorValues)
    .innerJoin(
      checklistFactors,
      eq(savedFactorValues.factorId, checklistFactors.id)
    )
    .where(eq(savedFactorValues.assetId, Number(id)));

  return NextResponse.json(rows);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { factorId, value } = await request.json();

  if (factorId === undefined || value === undefined) {
    return NextResponse.json(
      { error: "factorId and value are required" },
      { status: 400 }
    );
  }

  const [row] = await db
    .insert(savedFactorValues)
    .values({
      assetId: Number(id),
      factorId: Number(factorId),
      value: String(value),
    })
    .onConflictDoUpdate({
      target: [savedFactorValues.assetId, savedFactorValues.factorId],
      set: {
        value: String(value),
        updatedAt: new Date().toISOString().replace("T", " ").slice(0, 19),
      },
    })
    .returning();

  return NextResponse.json(row);
}
