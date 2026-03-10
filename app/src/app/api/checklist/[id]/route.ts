import { db } from "@/db";
import { checklistFactors } from "@/db/schema";
import { eq, asc, max } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const existing = await db
    .select()
    .from(checklistFactors)
    .where(eq(checklistFactors.id, Number(id)));

  if (existing.length === 0) {
    return NextResponse.json({ error: "Factor not found" }, { status: 404 });
  }

  const { name, description, weight, scoreType, configJson, sortOrder } = body;

  const [updated] = await db
    .update(checklistFactors)
    .set({
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(weight !== undefined && { weight }),
      ...(scoreType !== undefined && { scoreType }),
      ...(configJson !== undefined && { configJson }),
      ...(sortOrder !== undefined && { sortOrder }),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(checklistFactors.id, Number(id)))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const existing = await db
    .select()
    .from(checklistFactors)
    .where(eq(checklistFactors.id, Number(id)));

  if (existing.length === 0) {
    return NextResponse.json({ error: "Factor not found" }, { status: 404 });
  }

  await db
    .delete(checklistFactors)
    .where(eq(checklistFactors.id, Number(id)));

  return NextResponse.json({ success: true }, { status: 200 });
}
