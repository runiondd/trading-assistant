import { db } from "@/db";
import { accounts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [account] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.id, Number(id)));

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  return NextResponse.json(account);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.accountType !== undefined) updates.accountType = body.accountType;
  if (body.balance !== undefined) updates.balance = body.balance;
  if (body.defaultRiskPct !== undefined)
    updates.defaultRiskPct = body.defaultRiskPct;

  updates.updatedAt = new Date().toISOString();

  const [updated] = await db
    .update(accounts)
    .set(updates)
    .where(eq(accounts.id, Number(id)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}
