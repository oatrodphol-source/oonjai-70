export interface TriageInput {
  waterLevel: string | null;
  peopleCount: number;
  bedridden: boolean;
  elderly: boolean;
  type: string;
}

/**
 * AI Triage System - Rule-based scoring
 * Formula: (waterLevel×3 + peopleCount×2 + bedridden×4 + elderly×2 + severityType×2) -> severity 1-5
 */
export function calculateSeverityScore(input: TriageInput): number {
  // Normalize waterLevel to a 0-2 scale
  let wlScore = 0;
  if (input.waterLevel === 'high' || input.waterLevel === 'ท่วมมิดหัว' || input.waterLevel === 'วิกฤต') {
    wlScore = 2;
  } else if (input.waterLevel === 'medium' || input.waterLevel === 'ระดับเอว') {
    wlScore = 1;
  }

  // Normalize peopleCount to a 0-2 scale
  let pcScore = 0;
  if (input.peopleCount >= 5) {
    pcScore = 2;
  } else if (input.peopleCount > 1) {
    pcScore = 1;
  }

  // Boolean flags
  const bdScore = input.bedridden ? 1 : 0;
  const elScore = input.elderly ? 1 : 0;
  
  // Normalize severityType to a 1-2 scale
  const stScore = (input.type === 'sos' || input.type === 'medical') ? 2 : 1;

  // Apply weights according to the specified formula
  const totalScore = (wlScore * 3) + (pcScore * 2) + (bdScore * 4) + (elScore * 2) + (stScore * 2);

  // Map totalScore to severity 1-5
  // Max possible score: (2*3) + (2*2) + (1*4) + (1*2) + (2*2) = 6 + 4 + 4 + 2 + 4 = 20
  if (totalScore >= 16) return 5;
  if (totalScore >= 12) return 4;
  if (totalScore >= 8) return 3;
  if (totalScore >= 4) return 2;
  return 1;
}
