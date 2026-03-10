import { NextResponse } from "next/server";
import { isPlaidConfigured, createLinkToken } from "@/lib/plaid";

export async function POST() {
  if (!isPlaidConfigured()) {
    return NextResponse.json(
      { error: "Plaid is not configured" },
      { status: 503 }
    );
  }

  try {
    const linkToken = await createLinkToken();
    return NextResponse.json({ linkToken });
  } catch (error) {
    console.error("Failed to create link token:", error);
    return NextResponse.json(
      { error: "Failed to create link token" },
      { status: 500 }
    );
  }
}
