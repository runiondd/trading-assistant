import { db } from "@/db";
import { levels, assets } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// DELETE /api/assets/[id]/levels?levelId=123  — delete a single level
// DELETE /api/assets/[id]/levels?type=fibonacci — delete all fib levels for this asset
// DELETE /api/assets/[id]/levels?type=all — delete ALL levels for this asset
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const assetId = Number(id);
  const searchParams = request.nextUrl.searchParams;
  const levelId = searchParams.get("levelId");
  const type = searchParams.get("type");

  if (levelId) {
    await db
      .delete(levels)
      .where(and(eq(levels.id, Number(levelId)), eq(levels.assetId, assetId)));
    return NextResponse.json({ deleted: true });
  }

  if (type === "fibonacci") {
    await db
      .delete(levels)
      .where(and(eq(levels.assetId, assetId), eq(levels.levelType, "fibonacci")));
    return NextResponse.json({ deleted: true });
  }

  if (type === "all") {
    await db.delete(levels).where(eq(levels.assetId, assetId));
    return NextResponse.json({ deleted: true });
  }

  return NextResponse.json({ error: "Provide levelId or type param" }, { status: 400 });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const assetId = Number(id);

  const [asset] = await db
    .select()
    .from(assets)
    .where(eq(assets.id, assetId));

  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const rows = await db
    .select()
    .from(levels)
    .where(eq(levels.assetId, assetId))
    .orderBy(desc(levels.price));

  return NextResponse.json(rows);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const assetId = Number(id);

  const [asset] = await db
    .select()
    .from(assets)
    .where(eq(assets.id, assetId));

  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const body = await request.json();

  // Support both single level and batch format
  const items: { price: number; label: string; level_type: string }[] =
    Array.isArray(body.levels) ? body.levels : [body];

  // Validate items
  for (const item of items) {
    if (item.price == null || isNaN(item.price) || item.price <= 0) {
      return NextResponse.json({ error: "Each level must have a valid price greater than 0" }, { status: 400 });
    }
    if (!item.label) {
      return NextResponse.json({ error: "Each level must have a label" }, { status: 400 });
    }
  }

  // If batch fib insert, clear existing fib levels for this asset first
  if (Array.isArray(body.levels) && items.every((i) => i.level_type === "fibonacci")) {
    await db
      .delete(levels)
      .where(and(eq(levels.assetId, assetId), eq(levels.levelType, "fibonacci")));
  }

  const created = await db
    .insert(levels)
    .values(
      items.map((item) => ({
        assetId,
        price: item.price,
        label: item.label,
        levelType: item.level_type,
      }))
    )
    .returning();

  // Return a single object when a single level was sent, array for batch
  if (Array.isArray(body.levels)) {
    return NextResponse.json(created, { status: 201 });
  }

  return NextResponse.json(created[0], { status: 201 });
}
