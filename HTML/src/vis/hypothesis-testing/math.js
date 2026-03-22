import { NON_ZERO_REWARDS } from './constants';

// Expected reward given three reel probability arrays
export function expectedReward(p1, p2, p3) {
  let er = 0;
  for (const [x, y, z, r] of NON_ZERO_REWARDS) {
    er += r * p1[x] * p2[y] * p3[z];
  }
  return er;
}

// Log-likelihood: Σ_w Σ_k n_k * log(p_k)
export function logLikelihood(freqs, probs) {
  let ll = 0;
  for (let w = 0; w < 3; w++) {
    for (let k = 0; k < 7; k++) {
      if (freqs[w][k] > 0 && probs[w][k] > 1e-30) {
        ll += freqs[w][k] * Math.log(probs[w][k]);
      }
    }
  }
  return ll;
}

// Marginal reward for each symbol on a given reel: ∂E[R]/∂p_k^w
export function marginalRewards(reelIdx, probs) {
  const marg = new Array(7).fill(0);
  for (const [x, y, z, r] of NON_ZERO_REWARDS) {
    const syms = [x, y, z];
    const k = syms[reelIdx];
    let prod = r;
    for (let w = 0; w < 3; w++) {
      if (w !== reelIdx) prod *= probs[w][syms[w]];
    }
    marg[k] += prod;
  }
  return marg;
}

// Solve single reel Lagrangian: p_k = n_k / (λ + μ * g_k), Σ p_k = 1
function solveReel(n, g, mu) {
  let lamMin = 0;
  for (let k = 0; k < 7; k++) {
    if (n[k] > 0) {
      lamMin = Math.max(lamMin, -mu * g[k] + 1e-8);
    }
  }
  const N = n.reduce((a, b) => a + b, 0);
  let lo = lamMin, hi = lamMin + N * 200;

  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    let s = 0;
    let valid = true;
    for (let k = 0; k < 7; k++) {
      if (n[k] > 0) {
        const d = mid + mu * g[k];
        if (d <= 0) { valid = false; break; }
        s += n[k] / d;
      }
    }
    if (!valid || s > 1) lo = mid; else hi = mid;
  }

  const lam = (lo + hi) / 2;
  const p = new Array(7);
  for (let k = 0; k < 7; k++) {
    if (n[k] > 0) {
      const d = lam + mu * g[k];
      p[k] = d > 0 ? n[k] / d : 0;
    } else {
      p[k] = 0;
    }
  }
  // Safety normalize
  const sum = p.reduce((a, b) => a + b, 0);
  if (sum > 0) for (let k = 0; k < 7; k++) p[k] /= sum;
  return p;
}

// Constrained MLE: maximize log L subject to E[R] = target
export function constrainedMLE(freqs, target) {
  const N = freqs[0].reduce((a, b) => a + b, 0);
  const mleProbs = freqs.map(f => f.map(n => n / N));
  const mleER = expectedReward(mleProbs[0], mleProbs[1], mleProbs[2]);

  if (Math.abs(mleER - target) < 0.001) return mleProbs;

  // Binary search on Lagrange multiplier μ
  // E[R] is decreasing in μ at the optimum
  let muLo = mleER < target ? -500000 : 0;
  let muHi = mleER < target ? 0 : 500000;

  let bestProbs = mleProbs;
  let bestDiff = Math.abs(mleER - target);

  for (let iter = 0; iter < 30; iter++) {
    const mu = (muLo + muHi) / 2;

    // Coordinate descent for this μ
    let p = mleProbs.map(a => [...a]);
    for (let cd = 0; cd < 5; cd++) {
      for (let w = 0; w < 3; w++) {
        const g = marginalRewards(w, p);
        p[w] = solveReel(freqs[w], g, mu);
      }
    }

    const er = expectedReward(p[0], p[1], p[2]);
    const diff = Math.abs(er - target);

    if (diff < bestDiff) {
      bestDiff = diff;
      bestProbs = p.map(a => [...a]);
    }

    if (diff < 0.005) break;

    // E[R] decreasing in μ
    if (er > target) muLo = mu;
    else muHi = mu;
  }

  return bestProbs;
}

// Generate one sample from a model
export function generateSample(probs, n) {
  const freqs = [[0,0,0,0,0,0,0], [0,0,0,0,0,0,0], [0,0,0,0,0,0,0]];
  const cdfs = probs.map(p => {
    const cdf = new Array(7);
    cdf[0] = p[0];
    for (let i = 1; i < 7; i++) cdf[i] = cdf[i - 1] + p[i];
    return cdf;
  });

  for (let i = 0; i < n; i++) {
    for (let w = 0; w < 3; w++) {
      const r = Math.random();
      let k = 0;
      while (k < 6 && r >= cdfs[w][k]) k++;
      freqs[w][k]++;
    }
  }
  return freqs;
}

// Compute test statistic T for a given sample
export function testStatistic(freqs, target) {
  const N = freqs[0].reduce((a, b) => a + b, 0);
  const mleProbs = freqs.map(f => f.map(n => Math.max(n, 1e-15) / N));
  const mleLL = logLikelihood(freqs, mleProbs);

  const h0Probs = constrainedMLE(freqs, target);
  const h0LL = logLikelihood(freqs, h0Probs);

  return Math.max(0, mleLL - h0LL);
}

// Run Monte Carlo simulation (async, yields to UI)
export async function runSimulation(model, nSim, nGames, target, onProgress) {
  const results = [];
  const batchSize = 200;

  for (let i = 0; i < nSim; i++) {
    const sample = generateSample(model, nGames);
    const T = testStatistic(sample, target);
    results.push(T);

    if (i % batchSize === 0) {
      onProgress?.(i / nSim);
      await new Promise(r => setTimeout(r, 0));
    }
  }

  onProgress?.(1);
  return results;
}
