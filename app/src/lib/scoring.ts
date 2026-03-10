export type ScoreType = "pass_fail" | "scale" | "numeric";

export interface ChecklistFactor {
  id: number;
  name: string;
  weight: number;
  scoreType: ScoreType;
  configJson: string | null;
}

export interface FactorResult {
  factorId: number;
  rawValue: string;
  normalizedScore: number;
  maxScore: number;
}

export type Signal = "green" | "yellow" | "red";

export interface ScoringResult {
  factorResults: FactorResult[];
  compositeScore: number; // 0-100
  signal: Signal; // green >= 75, yellow >= 50, red < 50
}

interface ScaleConfig {
  options: string[];
  // Direction-aware scoring: maps each option to a 0-1 fraction per direction.
  // When present, overrides the default linear index-based scoring.
  scoreMap?: {
    long: Record<string, number>;
    short: Record<string, number>;
  };
}

function scorePassFail(value: string, weight: number): { normalizedScore: number; maxScore: number } {
  const passed = value === "true";
  return {
    normalizedScore: passed ? weight : 0,
    maxScore: weight,
  };
}

function scoreScale(
  value: string,
  weight: number,
  configJson: string | null,
  direction: "long" | "short",
): { normalizedScore: number; maxScore: number } {
  if (!configJson) {
    return { normalizedScore: 0, maxScore: weight };
  }

  const config: ScaleConfig = JSON.parse(configJson);
  const options = config.options;

  if (!options || options.length <= 1) {
    return { normalizedScore: 0, maxScore: weight };
  }

  // If a direction-aware scoreMap exists, use it
  if (config.scoreMap) {
    const dirMap = config.scoreMap[direction];
    if (dirMap && value in dirMap) {
      return { normalizedScore: dirMap[value] * weight, maxScore: weight };
    }
    // Fall through to default if value not in map
  }

  // Default: linear index-based scoring (first option = 0, last = full weight)
  const selectedIndex = options.indexOf(value);
  if (selectedIndex === -1) {
    return { normalizedScore: 0, maxScore: weight };
  }

  const normalizedScore = (selectedIndex / (options.length - 1)) * weight;
  return { normalizedScore, maxScore: weight };
}

function scoreNumeric(value: string, weight: number): { normalizedScore: number; maxScore: number } {
  const num = parseFloat(value);
  if (isNaN(num)) {
    return { normalizedScore: 0, maxScore: weight };
  }

  let normalizedScore: number;
  if (num >= 2) {
    normalizedScore = weight;
  } else if (num >= 1) {
    normalizedScore = weight / 2;
  } else {
    normalizedScore = 0;
  }

  return { normalizedScore, maxScore: weight };
}

function deriveSignal(compositeScore: number): Signal {
  if (compositeScore >= 75) return "green";
  if (compositeScore >= 50) return "yellow";
  return "red";
}

export function calculateScore(
  factors: ChecklistFactor[],
  values: Record<number, string>,
  direction: "long" | "short",
  _rrRatio: number,
): ScoringResult {
  const factorResults: FactorResult[] = factors.map((factor) => {
    const rawValue = values[factor.id] ?? "";

    let scored: { normalizedScore: number; maxScore: number };

    if (rawValue === "") {
      scored = { normalizedScore: 0, maxScore: factor.weight };
    } else {
      switch (factor.scoreType) {
        case "pass_fail":
          scored = scorePassFail(rawValue, factor.weight);
          break;
        case "scale":
          scored = scoreScale(rawValue, factor.weight, factor.configJson, direction);
          break;
        case "numeric":
          scored = scoreNumeric(rawValue, factor.weight);
          break;
        default:
          scored = { normalizedScore: 0, maxScore: factor.weight };
      }
    }

    return {
      factorId: factor.id,
      rawValue,
      normalizedScore: scored.normalizedScore,
      maxScore: scored.maxScore,
    };
  });

  const totalNormalized = factorResults.reduce((sum, r) => sum + r.normalizedScore, 0);
  const totalMax = factorResults.reduce((sum, r) => sum + r.maxScore, 0);
  const compositeScore = totalMax === 0 ? 0 : (totalNormalized / totalMax) * 100;
  const signal = deriveSignal(compositeScore);

  return { factorResults, compositeScore, signal };
}
