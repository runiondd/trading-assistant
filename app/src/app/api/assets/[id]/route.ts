import { db } from "@/db";
import { assets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [asset] = await db
    .select()
    .from(assets)
    .where(eq(assets.id, Number(id)));

  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  return NextResponse.json(asset);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.assetClass !== undefined) updates.assetClass = body.assetClass;
  if (body.exchange !== undefined) updates.exchange = body.exchange;

  const [updated] = await db
    .update(assets)
    .set(updates)
    .where(eq(assets.id, Number(id)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [deleted] = await db
    .update(assets)
    .set({ active: 0 })
    .where(eq(assets.id, Number(id)))
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  return NextResponse.json({ message: "Asset archived successfully" });
}
