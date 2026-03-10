import { db } from "@/db";
import { assets } from "@/db/schema";
import { eq, and, like, or } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const assetClass = searchParams.get("class");
  const search = searchParams.get("search");
  const includeArchived = searchParams.get("include_archived") === "true";

  const conditions = [];

  if (!includeArchived) {
    conditions.push(eq(assets.active, 1));
  }

  if (assetClass) {
    conditions.push(eq(assets.assetClass, assetClass));
  }

  if (search) {
    const pattern = `%${search}%`;
    conditions.push(
      or(like(assets.ticker, pattern), like(assets.name, pattern))!
    );
  }

  const result = await db
    .select()
    .from(assets)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { ticker, name, assetClass } = body;

  if (!ticker || !name || !assetClass) {
    return NextResponse.json(
      { error: "Missing required fields: ticker, name, assetClass" },
      { status: 400 }
    );
  }

  const [created] = await db
    .insert(assets)
    .values({
      ticker,
      name,
      assetClass,
      exchange: body.exchange ?? null,
      active: 1,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
