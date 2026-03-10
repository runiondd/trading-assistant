import { db } from "@/db";
import { accounts } from "@/db/schema";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const result = await db.select().from(accounts);
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, accountType, balance } = body;

  if (!name || !accountType || balance === undefined) {
    return NextResponse.json(
      { error: "Missing required fields: name, accountType, balance" },
      { status: 400 }
    );
  }

  const [created] = await db
    .insert(accounts)
    .values({
      name,
      accountType,
      balance,
      defaultRiskPct: body.defaultRiskPct ?? 1.0,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
