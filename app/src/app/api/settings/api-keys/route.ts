import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { eq } from "drizzle-orm";

function maskValue(value: string): string {
  if (value.length <= 8) return "••••••••";
  return value.slice(0, 4) + "••••" + value.slice(-4);
}

export async function GET() {
  try {
    const rows = await db
      .select({ id: apiKeys.id, name: apiKeys.name, value: apiKeys.value, createdAt: apiKeys.createdAt })
      .from(apiKeys);

    return NextResponse.json(
      rows.map((r) => ({
        id: r.id,
        name: r.name,
        maskedValue: maskValue(r.value),
        createdAt: r.createdAt,
      })),
    );
  } catch {
    // Table may not exist yet
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, value } = body as { name: string; value: string };

  if (!name || !value) {
    return NextResponse.json({ error: "name and value required" }, { status: 400 });
  }

  // Upsert: delete existing key with same name, then insert
  try {
    await db.delete(apiKeys).where(eq(apiKeys.name, name));
    const [created] = await db
      .insert(apiKeys)
      .values({ name, value })
      .returning();

    return NextResponse.json(
      { id: created.id, name: created.name, maskedValue: maskValue(value) },
      { status: 201 },
    );
  } catch (err) {
    console.error("Failed to save API key:", err);
    return NextResponse.json({ error: "Failed to save API key" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { name } = await request.json();
  if (!name) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }

  try {
    await db.delete(apiKeys).where(eq(apiKeys.name, name));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete API key" }, { status: 500 });
  }
}
