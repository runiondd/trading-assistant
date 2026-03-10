export interface PositionSizeInput {
  balance: number;
  riskPct: number; // e.g. 1.0 for 1%
  entryPrice: number;
  stopLoss: number;
  direction: "long" | "short";
}

export interface PositionSizeResult {
  riskAmount: number; // balance × riskPct / 100
  shares: number; // floor(riskAmount / riskPerShare)
  positionCost: number; // shares × entryPrice
  riskPerShare: number; // |entryPrice - stopLoss|
}

export function calculatePositionSize(
  input: PositionSizeInput
): PositionSizeResult {
  const { balance, riskPct, entryPrice, stopLoss, direction } = input;

  const riskAmount = (balance * riskPct) / 100;
  const riskPerShare = Math.abs(entryPrice - stopLoss);

  // Validate direction vs stop-loss placement
  if (direction === "long" && stopLoss >= entryPrice) {
    return { riskAmount, riskPerShare, shares: 0, positionCost: 0 };
  }
  if (direction === "short" && stopLoss <= entryPrice) {
    return { riskAmount, riskPerShare, shares: 0, positionCost: 0 };
  }

  // Zero risk distance guard
  if (riskPerShare === 0) {
    return { riskAmount, riskPerShare: 0, shares: 0, positionCost: 0 };
  }

  const shares = Math.floor(riskAmount / riskPerShare);
  const positionCost = shares * entryPrice;

  return { riskAmount, riskPerShare, shares, positionCost };
}

export function checkIraEligibility(
  direction: "long" | "short",
  vehicle: string,
  accountType: string
): { eligible: boolean; reason?: string } {
  const isIra =
    accountType === "ira" || accountType === "roth";

  if (!isIra) {
    return { eligible: true };
  }

  if (direction === "short") {
    return {
      eligible: false,
      reason: "Short selling not allowed in IRA accounts",
    };
  }

  if (vehicle === "options" || vehicle === "futures") {
    return {
      eligible: false,
      reason: "Options/futures not allowed in IRA accounts",
    };
  }

  return { eligible: true };
}
