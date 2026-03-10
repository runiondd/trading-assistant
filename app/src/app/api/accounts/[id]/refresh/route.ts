import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isPlaidConfigured, refreshBalances } from "@/lib/plaid";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!isPlaidConfigured()) {
    return NextResponse.json(
      { error: "Plaid is not configured" },
      { status: 503 }
    );
  }

  const [account] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.id, Number(id)));

  if (!account) {
    return NextResponse.json(
      { error: "Account not found" },
      { status: 404 }
    );
  }

  if (!account.plaidAccessToken) {
    return NextResponse.json(
      { error: "Account has no Plaid connection" },
      { status: 400 }
    );
  }

  try {
    const plaidAccounts = await refreshBalances(account.plaidAccessToken);

    const matchingAccount = plaidAccounts.find(
      (a) => a.account_id === account.plaidAccountId
    );

    if (!matchingAccount) {
      return NextResponse.json(
        { error: "Plaid account not found" },
        { status: 404 }
      );
    }

    const [updated] = await db
      .update(accounts)
      .set({
        balance: matchingAccount.balances.current ?? account.balance,
        balanceUpdatedAt: new Date().toISOString(),
      })
      .where(eq(accounts.id, Number(id)))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to refresh balances:", error);
    return NextResponse.json(
      { error: "Failed to refresh balances" },
      { status: 500 }
    );
  }
}
