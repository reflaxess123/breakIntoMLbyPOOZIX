// Symbol indices: 0=blank, 1=bar, 2=bar×2, 3=bar×3, 4=seven, 5=cherry, 6=diamond
export const SYMBOL_NAMES = ['0', 'bar', 'bar×2', 'bar×3', '7', '🍒', '💎'];

export const N_GAMES = 138;
export const SAMPLE_MEAN = 0.384;
export const CASINO_CLAIM = 0.92;

// Observed absolute frequencies per reel
export const OBSERVED_FREQ = [
  [59, 49, 14, 6, 6, 1, 3],   // Reel 1
  [85, 8, 24, 16, 4, 0, 1],   // Reel 2
  [77, 39, 6, 1, 7, 3, 5],    // Reel 3
];

// MLE probabilities (frequencies / N)
export const MLE_PROBS = OBSERVED_FREQ.map(r => r.map(n => n / N_GAMES));

// Reward function: (x, y, z) -> payout
// Designed so that E[R] ≈ 0.647 under MLE probabilities
export function getReward(x, y, z) {
  // Three identical non-blank → jackpot
  if (x === y && y === z && x !== 0) {
    const jackpots = [0, 20, 40, 100, 2862, 200, 200];
    return jackpots[x];
  }
  // All bars (any mix of 1, 2, 3) → bar combo
  if (x >= 1 && x <= 3 && y >= 1 && y <= 3 && z >= 1 && z <= 3) return 5;
  // Cherry visible → cherry payout
  if (x === 5 || y === 5 || z === 5) return 2;
  return 0;
}

// Precompute non-zero reward entries for fast E[R] computation
export const NON_ZERO_REWARDS = [];
for (let x = 0; x < 7; x++)
  for (let y = 0; y < 7; y++)
    for (let z = 0; z < 7; z++) {
      const r = getReward(x, y, z);
      if (r > 0) NON_ZERO_REWARDS.push([x, y, z, r]);
    }
