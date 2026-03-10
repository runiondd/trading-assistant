import { db } from "@/db";
import { checklistFactors } from "@/db/schema";
import { eq, asc, max } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const factors = await db
    .select()
    .from(checklistFactors)
    .orderBy(asc(checklistFactors.sortOrder));

  return NextResponse.json(factors);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, weight, scoreType, description, configJson } = body;

  if (!name || weight === undefined || !scoreType) {
    return NextResponse.json(
      { error: "name, weight, and scoreType are required" },
      { status: 400 }
    );
  }

  const [{ maxSort }] = await db
    .select({ maxSort: max(checklistFactors.sortOrder) })
    .from(checklistFactors);

  const sortOrder = (maxSort ?? 0) + 1;

  const [created] = await db
    .insert(checklistFactors)
    .values({
      name,
      weight,
      scoreType,
      description: description ?? null,
      configJson: configJson ?? null,
      sortOrder,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
