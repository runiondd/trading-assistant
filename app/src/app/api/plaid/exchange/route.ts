import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { isPlaidConfigured, exchangePublicToken } from "@/lib/plaid";

export async function POST(request: NextRequest) {
  if (!isPlaidConfigured()) {
    return NextResponse.json(
      { error: "Plaid is not configured" },
      { status: 503 }
    );
  }

  try {
    const { publicToken } = await request.json();

    if (!publicToken) {
      return NextResponse.json(
        { error: "Missing required field: publicToken" },
        { status: 400 }
      );
    }

    const { accessToken, accounts: plaidAccounts } =
      await exchangePublicToken(publicToken);

    const createdAccounts = [];

    for (const plaidAccount of plaidAccounts) {
      const [created] = await db
        .insert(accounts)
        .values({
          name: plaidAccount.name || plaidAccount.official_name || "Unnamed Account",
          accountType: plaidAccount.subtype || plaidAccount.type || "taxable",
          balance: plaidAccount.balances.current ?? 0,
          plaidAccountId: plaidAccount.account_id,
          plaidAccessToken: accessToken,
          balanceUpdatedAt: new Date().toISOString(),
        })
        .returning();

      createdAccounts.push(created);
    }

    return NextResponse.json(createdAccounts, { status: 201 });
  } catch (error) {
    console.error("Failed to exchange public token:", error);
    return NextResponse.json(
      { error: "Failed to exchange public token" },
      { status: 500 }
    );
  }
}
