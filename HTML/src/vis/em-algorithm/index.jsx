import { useState, useRef, useEffect, useCallback } from 'react';
import { K } from '../../components/Latex';
import { Routes, Route, Navigate, NavLink } from 'react-router-dom';

// ── Seeded RNG ──
function makeRng(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
}

// ── Box-Muller: two standard normals ──
function boxMuller(rng) {
  const u1 = rng(), u2 = rng();
  const r = Math.sqrt(-2 * Math.log(u1));
  return [r * Math.cos(2 * Math.PI * u2), r * Math.sin(2 * Math.PI * u2)];
}

// ── Sample from N(mu, Sigma) using Cholesky ──
function sampleGauss2D(mu, sigma, rng) {
  const [z1, z2] = boxMuller(rng);
  // Cholesky of 2x2: [[a,0],[c,d]]
  const a = Math.sqrt(sigma[0][0]);
  const c = sigma[1][0] / a;
  const d = Math.sqrt(sigma[1][1] - c * c);
  return [mu[0] + a * z1, mu[1] + c * z1 + d * z2];
}

// ── 2x2 matrix helpers ──
function det2(m) { return m[0][0] * m[1][1] - m[0][1] * m[1][0]; }
function inv2(m) {
  const d = det2(m);
  return [[m[1][1] / d, -m[0][1] / d], [-m[1][0] / d, m[0][0] / d]];
}

// ── 2D Gaussian PDF ──
function gauss2dPdf(x, mu, sigma) {
  const dx = [x[0] - mu[0], x[1] - mu[1]];
  const si = inv2(sigma);
  const exponent = -0.5 * (dx[0] * (si[0][0] * dx[0] + si[0][1] * dx[1]) +
                            dx[1] * (si[1][0] * dx[0] + si[1][1] * dx[1]));
  const norm = 1 / (2 * Math.PI * Math.sqrt(Math.abs(det2(sigma))));
  return norm * Math.exp(exponent);
}

// ── Generate data from mixture ──
function generateData(seed = 42) {
  const rng = makeRng(seed);
  const trueMu = [[-2.5, 2], [2.5, -1.5]];
  const trueSigma = [
    [[1.2, 0.4], [0.4, 0.8]],
    [[0.9, -0.3], [-0.3, 1.1]],
  ];
  const trueW = [0.45, 0.55];
  const points = [];
  for (let i = 0; i < 80; i++) {
    const comp = rng() < trueW[0] ? 0 : 1;
    const pt = sampleGauss2D(trueMu[comp], trueSigma[comp], rng);
    points.push(pt);
  }
  return points;
}

// ── Random initial parameters ──
function randomInit(points, seed) {
  const rng = makeRng(seed);
  // Pick two random points as initial means (with some jitter)
  const i1 = Math.floor(rng() * points.length);
  let i2 = Math.floor(rng() * points.length);
  if (i2 === i1) i2 = (i2 + 1) % points.length;
  const mu = [
    [points[i1][0] + (rng() - 0.5), points[i1][1] + (rng() - 0.5)],
    [points[i2][0] + (rng() - 0.5), points[i2][1] + (rng() - 0.5)],
  ];
  const sigma = [
    [[1.5, 0], [0, 1.5]],
    [[1.5, 0], [0, 1.5]],
  ];
  const w = [0.5, 0.5];
  // uniform g_ij
  const g = points.map(() => [0.5, 0.5]);
  return { mu, sigma, w, g };
}

// ── E-step ──
function eStep(points, mu, sigma, w) {
  const g = points.map((x) => {
    const p0 = w[0] * gauss2dPdf(x, mu[0], sigma[0]);
    const p1 = w[1] * gauss2dPdf(x, mu[1], sigma[1]);
    const s = p0 + p1;
    if (s < 1e-300) return [0.5, 0.5];
    return [p0 / s, p1 / s];
  });
  return g;
}

// ── M-step ──
function mStep(points, g) {
  const K = 2;
  const n = points.length;
  const mu = [];
  const sigma = [];
  const w = [];
  for (let j = 0; j < K; j++) {
    let nj = 0;
    let mx = 0, my = 0;
    for (let i = 0; i < n; i++) {
      nj += g[i][j];
      mx += g[i][j] * points[i][0];
      my += g[i][j] * points[i][1];
    }
    if (nj < 1e-10) nj = 1e-10;
    const muj = [mx / nj, my / nj];
    let s00 = 0, s01 = 0, s11 = 0;
    for (let i = 0; i < n; i++) {
      const dx = points[i][0] - muj[0];
      const dy = points[i][1] - muj[1];
      s00 += g[i][j] * dx * dx;
      s01 += g[i][j] * dx * dy;
      s11 += g[i][j] * dy * dy;
    }
    // Regularize to prevent singular covariance
    const reg = 0.01;
    const sigj = [[s00 / nj + reg, s01 / nj], [s01 / nj, s11 / nj + reg]];
    mu.push(muj);
    sigma.push(sigj);
    w.push(nj / n);
  }
  return { mu, sigma, w };
}

// ── Log-likelihood ──
function logLikelihood(points, mu, sigma, w) {
  let ll = 0;
  for (const x of points) {
    let s = 0;
    for (let j = 0; j < 2; j++) {
      s += w[j] * gauss2dPdf(x, mu[j], sigma[j]);
    }
    ll += Math.log(Math.max(s, 1e-300));
  }
  return ll;
}

// ── Color blending ──
const COLOR1 = [0xda, 0x77, 0x56]; // terracotta
const COLOR2 = [0x58, 0x81, 0x57]; // green

function blendColor(g1) {
  const g2 = 1 - g1;
  const r = Math.round(COLOR1[0] * g1 + COLOR2[0] * g2);
  const g = Math.round(COLOR1[1] * g1 + COLOR2[1] * g2);
  const b = Math.round(COLOR1[2] * g1 + COLOR2[2] * g2);
  return `rgb(${r},${g},${b})`;
}

// ── Draw ellipse for 2x2 covariance matrix ──
function drawEllipse(ctx, mu, sigma, scale, toCanvasX, toCanvasY, scaleX, scaleY, color, alpha) {
  // Eigenvalues and eigenvectors of 2x2 symmetric matrix
  const a = sigma[0][0], b = sigma[0][1], d = sigma[1][1];
  const trace = a + d;
  const det = a * d - b * b;
  const disc = Math.sqrt(Math.max(0, trace * trace / 4 - det));
  const l1 = trace / 2 + disc;
  const l2 = trace / 2 - disc;
  const angle = b === 0 && a >= d ? 0 : Math.atan2(l1 - a, b);

  ctx.save();
  ctx.translate(toCanvasX(mu[0]), toCanvasY(mu[1]));
  ctx.rotate(-angle); // canvas y is flipped
  ctx.beginPath();
  ctx.ellipse(0, 0,
    Math.sqrt(Math.max(l1, 0.01)) * scale * scaleX,
    Math.sqrt(Math.max(l2, 0.01)) * scale * scaleY,
    0, 0, 2 * Math.PI);
  ctx.strokeStyle = color;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
  ctx.restore();
}

// ── Main Canvas drawing ──
function drawScene(ctx, W, H, points, params) {
  const { mu, sigma, g } = params;
  const pad = { l: 45, r: 20, t: 20, b: 35 };
  const pw = W - pad.l - pad.r;
  const ph = H - pad.t - pad.b;

  // Compute data range
  let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
  for (const p of points) {
    if (p[0] < xMin) xMin = p[0];
    if (p[0] > xMax) xMax = p[0];
    if (p[1] < yMin) yMin = p[1];
    if (p[1] > yMax) yMax = p[1];
  }
  const xMargin = (xMax - xMin) * 0.15 + 1;
  const yMargin = (yMax - yMin) * 0.15 + 1;
  xMin -= xMargin; xMax += xMargin;
  yMin -= yMargin; yMax += yMargin;

  const toX = (v) => pad.l + (v - xMin) / (xMax - xMin) * pw;
  const toY = (v) => pad.t + ph - (v - yMin) / (yMax - yMin) * ph;
  const scaleX = pw / (xMax - xMin);
  const scaleY = ph / (yMax - yMin);

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // Grid lines
  ctx.strokeStyle = '#e8e6dc';
  ctx.lineWidth = 1;
  const xStep = Math.ceil((xMax - xMin) / 8);
  for (let v = Math.ceil(xMin); v <= xMax; v += xStep) {
    const x = toX(v);
    ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, pad.t + ph); ctx.stroke();
    ctx.fillStyle = '#6b6b66'; ctx.font = '11px Fira Sans';
    ctx.textAlign = 'center'; ctx.fillText(v.toFixed(0), x, H - pad.b + 16);
  }
  const yStep = Math.ceil((yMax - yMin) / 6);
  for (let v = Math.ceil(yMin); v <= yMax; v += yStep) {
    const y = toY(v);
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + pw, y); ctx.stroke();
    ctx.fillStyle = '#6b6b66'; ctx.font = '11px Fira Sans';
    ctx.textAlign = 'right'; ctx.fillText(v.toFixed(0), pad.l - 8, y + 4);
  }

  // Axes border
  ctx.strokeStyle = '#6b6b66';
  ctx.lineWidth = 1;
  ctx.strokeRect(pad.l, pad.t, pw, ph);

  // Gaussian ellipses (1σ and 2σ)
  const colors = ['#da7756', '#588157'];
  for (let j = 0; j < 2; j++) {
    drawEllipse(ctx, mu[j], sigma[j], 1, toX, toY, scaleX, scaleY, colors[j], 0.8);
    drawEllipse(ctx, mu[j], sigma[j], 2, toX, toY, scaleX, scaleY, colors[j], 0.4);
  }

  // Points
  for (let i = 0; i < points.length; i++) {
    const px = toX(points[i][0]);
    const py = toY(points[i][1]);
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, 2 * Math.PI);
    ctx.fillStyle = blendColor(g[i][0]);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  // Cluster centers
  for (let j = 0; j < 2; j++) {
    const cx = toX(mu[j][0]);
    const cy = toY(mu[j][1]);
    ctx.beginPath();
    ctx.arc(cx, cy, 9, 0, 2 * Math.PI);
    ctx.fillStyle = colors[j];
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.strokeStyle = colors[j];
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

// ── GMM Canvas component ──
function GMMCanvas({ points, params }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [w, setW] = useState(0);

  useEffect(() => {
    const measure = () => containerRef.current && setW(containerRef.current.clientWidth);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const H = Math.min(460, Math.max(300, w * 0.6));

  useEffect(() => {
    if (!w) return;
    const c = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    c.width = w * dpr;
    c.height = H * dpr;
    const ctx = c.getContext('2d');
    ctx.scale(dpr, dpr);
    drawScene(ctx, w, H, points, params);
  }, [w, H, points, params]);

  return (
    <div ref={containerRef} className="w-full">
      {w > 0 && (
        <canvas
          ref={canvasRef}
          style={{ width: w, height: H }}
          className="rounded-lg block border border-border"
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Bernoulli Mixture (binary features — like document topics)
// ══════════════════════════════════════════════════════════════

function generateBinaryData(seed, n = 60, d = 8) {
  const rng = makeRng(seed);
  // Two clusters with different Bernoulli params
  const p1 = Array.from({ length: d }, () => 0.15 + rng() * 0.3); // low probabilities
  const p2 = Array.from({ length: d }, () => 0.55 + rng() * 0.35); // high probabilities
  const data = [];
  for (let i = 0; i < n; i++) {
    const cluster = rng() < 0.45 ? 0 : 1;
    const pk = cluster === 0 ? p1 : p2;
    data.push(pk.map(p => rng() < p ? 1 : 0));
  }
  return { data, d, trueP: [p1, p2] };
}

function BernoulliEMPage() {
  const [{ data, d }] = useState(() => generateBinaryData(77));
  const n = data.length;
  const K_clusters = 2;

  // Parameters: p[j][f] = P(feature f = 1 | cluster j), w[j] = weight
  const [params, setParams] = useState(() => {
    const rng = makeRng(999);
    return {
      p: [Array.from({ length: d }, () => 0.2 + rng() * 0.6), Array.from({ length: d }, () => 0.2 + rng() * 0.6)],
      w: [0.5, 0.5],
      g: data.map(() => [0.5, 0.5]),
    };
  });
  const [iteration, setIteration] = useState(0);
  const [running, setRunning] = useState(false);
  const runRef = useRef(false);

  const doEStep = useCallback(() => {
    setParams(prev => {
      const g = data.map(xi => {
        const logP = prev.p.map((pj, j) => {
          let ll = Math.log(prev.w[j]);
          for (let f = 0; f < d; f++) {
            const pf = Math.max(1e-10, Math.min(1 - 1e-10, pj[f]));
            ll += xi[f] * Math.log(pf) + (1 - xi[f]) * Math.log(1 - pf);
          }
          return ll;
        });
        const maxLP = Math.max(...logP);
        const exp = logP.map(lp => Math.exp(lp - maxLP));
        const sum = exp.reduce((a, b) => a + b);
        return exp.map(e => e / sum);
      });
      return { ...prev, g };
    });
  }, [data, d]);

  const doMStep = useCallback(() => {
    setParams(prev => {
      const newP = Array.from({ length: K_clusters }, (_, j) => {
        const nj = prev.g.reduce((s, gi) => s + gi[j], 0);
        return Array.from({ length: d }, (_, f) => {
          const sumF = data.reduce((s, xi, i) => s + prev.g[i][j] * xi[f], 0);
          return Math.max(0.01, Math.min(0.99, sumF / Math.max(nj, 1e-10)));
        });
      });
      const newW = Array.from({ length: K_clusters }, (_, j) =>
        prev.g.reduce((s, gi) => s + gi[j], 0) / n
      );
      setIteration(i => i + 1);
      return { ...prev, p: newP, w: newW };
    });
  }, [data, d, n]);

  const runEM = useCallback(() => {
    if (running) { runRef.current = false; setRunning(false); return; }
    runRef.current = true; setRunning(true);
    let isE = true;
    const tick = () => {
      if (!runRef.current) return;
      if (isE) doEStep(); else doMStep();
      isE = !isE;
      setTimeout(tick, isE ? 150 : 400);
    };
    tick();
  }, [running, doEStep, doMStep]);

  const reset = useCallback(() => {
    runRef.current = false; setRunning(false);
    const rng = makeRng(Date.now() % 100000);
    setParams({
      p: [Array.from({ length: d }, () => 0.2 + rng() * 0.6), Array.from({ length: d }, () => 0.2 + rng() * 0.6)],
      w: [0.5, 0.5],
      g: data.map(() => [0.5, 0.5]),
    });
    setIteration(0);
  }, [data, d]);

  useEffect(() => () => { runRef.current = false; }, []);

  // Draw heatmap of data with cluster coloring
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = Math.max(400, n * 6 + 60);
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    const cellW = Math.min(40, (W - 160) / d);
    const cellH = Math.min(8, (H - 60) / n);
    const offX = 100, offY = 30;

    // Sort rows by cluster assignment for clarity
    const sorted = data.map((xi, i) => ({ xi, i, g: params.g[i] }))
      .sort((a, b) => (b.g[0] - 0.5) - (a.g[0] - 0.5));

    sorted.forEach(({ xi, g: gi }, row) => {
      // Row color indicator
      const r1 = Math.round(218 * gi[0] + 88 * gi[1]);
      const g1 = Math.round(119 * gi[0] + 129 * gi[1]);
      const b1 = Math.round(86 * gi[0] + 87 * gi[1]);
      ctx.fillStyle = `rgb(${r1},${g1},${b1})`;
      ctx.fillRect(offX - 15, offY + row * cellH, 10, cellH - 1);

      // Data cells
      xi.forEach((v, f) => {
        ctx.fillStyle = v ? '#1a1a19' : '#f0ede6';
        ctx.fillRect(offX + f * cellW, offY + row * cellH, cellW - 1, cellH - 1);
      });
    });

    // Feature labels
    ctx.fillStyle = '#6b6b66';
    ctx.font = '10px Fira Sans, sans-serif';
    ctx.textAlign = 'center';
    for (let f = 0; f < d; f++) {
      ctx.fillText(`f${f + 1}`, offX + f * cellW + cellW / 2, offY - 5);
    }

    // Parameter bars below
    const barY = offY + n * cellH + 20;
    ctx.fillStyle = '#6b6b66';
    ctx.font = '11px Fira Sans, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('P(f=1|кластер 1):', 5, barY + 10);
    ctx.fillText('P(f=1|кластер 2):', 5, barY + 30);

    params.p.forEach((pj, j) => {
      const color = j === 0 ? '#da7756' : '#588157';
      pj.forEach((pf, f) => {
        const bh = 14;
        const by = barY + j * 20;
        ctx.fillStyle = '#f0ede6';
        ctx.fillRect(offX + f * cellW, by, cellW - 1, bh);
        ctx.fillStyle = color;
        ctx.fillRect(offX + f * cellW, by + bh * (1 - pf), cellW - 1, bh * pf);
      });
    });
  }, [data, params, d, n]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <button onClick={doEStep} disabled={running} className="px-4 py-2 rounded-lg bg-accent text-white font-medium hover:opacity-90 disabled:opacity-40 w-full sm:w-auto">E-шаг</button>
        <button onClick={doMStep} disabled={running} className="px-4 py-2 rounded-lg bg-green text-white font-medium hover:opacity-90 disabled:opacity-40 w-full sm:w-auto">M-шаг</button>
        <button onClick={runEM} className={`px-4 py-2 rounded-lg font-medium w-full sm:w-auto ${running ? 'bg-red text-white' : 'bg-text text-white hover:opacity-90'}`}>{running ? 'Стоп' : 'Запустить'}</button>
        <button onClick={reset} className="px-4 py-2 rounded-lg border border-border text-text font-medium hover:bg-bg w-full sm:w-auto">Сброс</button>
        <span className="text-sm text-text-dim self-center">Итерация: <strong>{iteration}</strong> | <K m={`w_1=${params.w[0].toFixed(2)}`} /></span>
      </div>

      <div className="bg-card rounded-xl border border-border p-4">
        <canvas ref={canvasRef} className="w-full rounded" />
      </div>

      <div className="bg-card rounded-xl border border-border p-5 space-y-3">
        <h2 className="text-lg font-bold">Смесь Бернулли — бинарные данные</h2>
        <p>Данные — таблица 0 и 1 ({n} объектов × {d} признаков). Каждый кластер — свой набор вероятностей «единички» по каждому признаку.</p>
        <p><strong>Применение:</strong> тематическое моделирование документов (слово есть/нет), анализ анкет, медицинские симптомы (есть/нет).</p>
        <p>Формула E-шага та же (Байес), M-шаг:</p>
        <div className="overflow-x-auto py-2">
          <K d m={`p_{jf} = \\frac{\\sum_i g_{ij} \\cdot x_{if}}{\\sum_i g_{ij}}`} />
        </div>
        <p className="text-sm text-text-dim">Внизу — оценённые P(f=1|кластер) для каждого признака. Столбик выше = выше вероятность единицы в этом кластере.</p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Poisson Mixture (count data — like word frequencies)
// ══════════════════════════════════════════════════════════════

function generatePoissonData(seed, n = 100) {
  const rng = makeRng(seed);
  const lambdas = [2.5, 8.0]; // Two Poisson rates
  const w = [0.4, 0.6];
  const data = [];
  for (let i = 0; i < n; i++) {
    const j = rng() < w[0] ? 0 : 1;
    // Poisson sampling via inverse transform
    const L = Math.exp(-lambdas[j]);
    let k = 0, p = 1;
    do { k++; p *= rng(); } while (p > L);
    data.push(k - 1);
  }
  return data;
}

function poissonPMF(k, lambda) {
  let logP = -lambda + k * Math.log(lambda);
  for (let i = 2; i <= k; i++) logP -= Math.log(i);
  return Math.exp(logP);
}

function PoissonEMPage() {
  const [data] = useState(() => generatePoissonData(55));
  const n = data.length;
  const maxVal = Math.max(...data);

  const [params, setParams] = useState({ lambda: [1.5, 6.0], w: [0.5, 0.5], g: data.map(() => [0.5, 0.5]) });
  const [iteration, setIteration] = useState(0);
  const [running, setRunning] = useState(false);
  const runRef = useRef(false);

  const doEStep = useCallback(() => {
    setParams(prev => {
      const g = data.map(xi => {
        const p = prev.lambda.map((lam, j) => prev.w[j] * poissonPMF(xi, lam));
        const sum = p.reduce((a, b) => a + b);
        return p.map(v => v / Math.max(sum, 1e-30));
      });
      return { ...prev, g };
    });
  }, [data]);

  const doMStep = useCallback(() => {
    setParams(prev => {
      const newLam = [0, 1].map(j => {
        const nj = prev.g.reduce((s, gi) => s + gi[j], 0);
        return data.reduce((s, xi, i) => s + prev.g[i][j] * xi, 0) / Math.max(nj, 1e-10);
      });
      const newW = [0, 1].map(j => prev.g.reduce((s, gi) => s + gi[j], 0) / n);
      setIteration(i => i + 1);
      return { ...prev, lambda: newLam, w: newW };
    });
  }, [data, n]);

  const runEM = useCallback(() => {
    if (running) { runRef.current = false; setRunning(false); return; }
    runRef.current = true; setRunning(true);
    let isE = true;
    const tick = () => {
      if (!runRef.current) return;
      if (isE) doEStep(); else doMStep();
      isE = !isE;
      setTimeout(tick, isE ? 150 : 400);
    };
    tick();
  }, [running, doEStep, doMStep]);

  const reset = useCallback(() => {
    runRef.current = false; setRunning(false);
    const rng = makeRng(Date.now() % 100000);
    setParams({ lambda: [1 + rng() * 4, 4 + rng() * 8], w: [0.5, 0.5], g: data.map(() => [0.5, 0.5]) });
    setIteration(0);
  }, [data]);

  useEffect(() => () => { runRef.current = false; }, []);

  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = 350;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const pad = { l: 50, r: 20, t: 20, b: 40 };
    const pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    // Histogram of data
    const bins = new Array(maxVal + 1).fill(0);
    data.forEach(v => bins[v]++);
    const maxBin = Math.max(...bins);
    const barW = pw / (maxVal + 1);

    bins.forEach((cnt, k) => {
      // Color by average cluster assignment for this value
      const pointsAtK = data.map((v, i) => v === k ? params.g[i] : null).filter(Boolean);
      let avgG0 = 0.5;
      if (pointsAtK.length > 0) avgG0 = pointsAtK.reduce((s, g) => s + g[0], 0) / pointsAtK.length;

      const r = Math.round(218 * avgG0 + 88 * (1 - avgG0));
      const g = Math.round(119 * avgG0 + 129 * (1 - avgG0));
      const b = Math.round(86 * avgG0 + 87 * (1 - avgG0));
      ctx.fillStyle = `rgb(${r},${g},${b})`;

      const bh = (cnt / maxBin) * ph;
      ctx.fillRect(pad.l + k * barW + 2, pad.t + ph - bh, barW - 4, bh);
    });

    // Poisson curves
    [['#da7756', 0], ['#588157', 1]].forEach(([color, j]) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      for (let k = 0; k <= maxVal; k++) {
        const y = poissonPMF(k, params.lambda[j]) * params.w[j] * n;
        const yPx = pad.t + ph - (y / maxBin) * ph;
        const xPx = pad.l + (k + 0.5) * barW;
        if (k === 0) ctx.moveTo(xPx, yPx);
        else ctx.lineTo(xPx, yPx);
      }
      ctx.stroke();
    });

    // Axes
    ctx.strokeStyle = '#e8e6dc';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.l, pad.t);
    ctx.lineTo(pad.l, pad.t + ph);
    ctx.lineTo(pad.l + pw, pad.t + ph);
    ctx.stroke();

    ctx.fillStyle = '#6b6b66';
    ctx.font = '11px Fira Sans, sans-serif';
    ctx.textAlign = 'center';
    for (let k = 0; k <= maxVal; k += Math.ceil((maxVal + 1) / 15)) {
      ctx.fillText(k.toString(), pad.l + (k + 0.5) * barW, H - 5);
    }
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const v = Math.round(maxBin * i / 4);
      ctx.fillText(v.toString(), pad.l - 5, pad.t + ph - (i / 4) * ph + 4);
    }
  }, [data, params, maxVal, n]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <button onClick={doEStep} disabled={running} className="px-4 py-2 rounded-lg bg-accent text-white font-medium hover:opacity-90 disabled:opacity-40 w-full sm:w-auto">E-шаг</button>
        <button onClick={doMStep} disabled={running} className="px-4 py-2 rounded-lg bg-green text-white font-medium hover:opacity-90 disabled:opacity-40 w-full sm:w-auto">M-шаг</button>
        <button onClick={runEM} className={`px-4 py-2 rounded-lg font-medium w-full sm:w-auto ${running ? 'bg-red text-white' : 'bg-text text-white hover:opacity-90'}`}>{running ? 'Стоп' : 'Запустить'}</button>
        <button onClick={reset} className="px-4 py-2 rounded-lg border border-border text-text font-medium hover:bg-bg w-full sm:w-auto">Сброс</button>
        <span className="text-sm text-text-dim self-center">
          Итерация: <strong>{iteration}</strong> |
          <K m={`\\lambda_1=${params.lambda[0].toFixed(1)}`} />,
          <K m={`\\lambda_2=${params.lambda[1].toFixed(1)}`} />
        </span>
      </div>

      <div className="bg-card rounded-xl border border-border p-4">
        <canvas ref={canvasRef} className="w-full rounded" />
      </div>

      <div className="bg-card rounded-xl border border-border p-5 space-y-3">
        <h2 className="text-lg font-bold">Смесь Пуассона — данные-счётчики</h2>
        <p>Данные — целые числа (0, 1, 2, 3...). Каждый кластер — свой Пуассон с параметром λ (среднее число событий).</p>
        <p><strong>Применение:</strong> количество покупок за день (2 группы клиентов), частота слов в текстах, число кликов.</p>
        <p>M-шаг для Пуассона:</p>
        <div className="overflow-x-auto py-2">
          <K d m={`\\lambda_j = \\frac{\\sum_i g_{ij} \\cdot x_i}{\\sum_i g_{ij}}`} />
        </div>
        <p className="text-sm text-text-dim">Цветные кривые — плотности компонент Пуассона × их вес × n. Цвет столбиков — мягкое присвоение.</p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Gaussian Mixture Page (original)
// ══════════════════════════════════════════════════════════════

// ── Gaussian page ──
function GaussianEMPage() {
  const [, setInitSeed] = useState(137);
  const [points] = useState(() => generateData(42));
  const [params, setParams] = useState(() => randomInit(generateData(42), 137));
  const [iteration, setIteration] = useState(0);
  const [ll, setLl] = useState(() => {
    const p = randomInit(generateData(42), 137);
    return logLikelihood(generateData(42), p.mu, p.sigma, p.w);
  });
  const [running, setRunning] = useState(false);
  const [lastStep, setLastStep] = useState(null); // 'e' | 'm' | null
  const runRef = useRef(false);

  const reset = useCallback(() => {
    runRef.current = false;
    setRunning(false);
    const newSeed = Date.now() % 100000;
    setInitSeed(newSeed);
    const p = randomInit(points, newSeed);
    setParams(p);
    setIteration(0);
    setLl(logLikelihood(points, p.mu, p.sigma, p.w));
    setLastStep(null);
  }, [points]);

  const doEStep = useCallback(() => {
    setParams((prev) => {
      const g = eStep(points, prev.mu, prev.sigma, prev.w);
      return { ...prev, g };
    });
    setLastStep('e');
  }, [points]);

  const doMStep = useCallback(() => {
    setParams((prev) => {
      const { mu, sigma, w } = mStep(points, prev.g);
      const newLL = logLikelihood(points, mu, sigma, w);
      setLl(newLL);
      setIteration((i) => i + 1);
      return { ...prev, mu, sigma, w };
    });
    setLastStep('m');
  }, [points]);

  const runEM = useCallback(() => {
    if (running) {
      runRef.current = false;
      setRunning(false);
      return;
    }
    runRef.current = true;
    setRunning(true);
    let stepIsE = true;
    const tick = () => {
      if (!runRef.current) return;
      if (stepIsE) {
        doEStep();
      } else {
        doMStep();
      }
      stepIsE = !stepIsE;
      setTimeout(tick, stepIsE ? 200 : 500);
    };
    tick();
  }, [running, doEStep, doMStep]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { runRef.current = false; };
  }, []);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={doEStep}
          disabled={running}
          className="px-4 py-2 rounded-lg bg-accent text-white font-medium
            hover:opacity-90 disabled:opacity-40 transition w-full sm:w-auto"
        >
          E-шаг
        </button>
        <button
          onClick={doMStep}
          disabled={running}
          className="px-4 py-2 rounded-lg bg-green text-white font-medium
            hover:opacity-90 disabled:opacity-40 transition w-full sm:w-auto"
        >
          M-шаг
        </button>
        <button
          onClick={runEM}
          className={`px-4 py-2 rounded-lg font-medium transition w-full sm:w-auto ${
            running
              ? 'bg-red text-white'
              : 'bg-text text-white hover:opacity-90'
          }`}
        >
          {running ? 'Стоп' : 'Запустить'}
        </button>
        <button
          onClick={reset}
          className="px-4 py-2 rounded-lg border border-border text-text font-medium
            hover:bg-bg transition w-full sm:w-auto"
        >
          Сброс
        </button>
      </div>

      {/* Stats bar */}
      <div className="flex flex-wrap gap-4 text-sm text-text-dim">
        <span>Итерация: <strong className="text-text">{iteration}</strong></span>
        <span>Log-likelihood: <strong className="text-text">{ll.toFixed(2)}</strong></span>
        <span>
          <K m={`w_1 = ${params.w[0].toFixed(2)}`} />,{' '}
          <K m={`w_2 = ${params.w[1].toFixed(2)}`} />
        </span>
        {lastStep && (
          <span className={lastStep === 'e' ? 'text-accent font-semibold' : 'text-green font-semibold'}>
            {lastStep === 'e' ? 'Выполнен E-шаг' : 'Выполнен M-шаг'}
          </span>
        )}
      </div>

      {/* Canvas */}
      <GMMCanvas points={points} params={params} />

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <span className="flex items-center gap-2">
          <span className="inline-block w-4 h-4 rounded-full" style={{ background: '#da7756' }} />
          Кластер 1
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block w-4 h-4 rounded-full" style={{ background: '#588157' }} />
          Кластер 2
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block w-3 h-0.5 border-t-2 border-dashed" style={{ borderColor: '#da7756' }} />
          Эллипс ковариации (1&sigma; и 2&sigma;)
        </span>
      </div>

      {/* Explanation - ALWAYS below the viz */}
      <div className="space-y-6 text-text leading-relaxed">
        <div className="bg-card rounded-xl border border-border p-5 space-y-3">
          <h2 className="text-lg font-bold">Что делает EM-алгоритм?</h2>
          <p>
            Представьте: у вас есть облако точек, и вы подозреваете, что оно состоит из двух
            перемешанных групп (кластеров). Каждая группа имеет свой центр и форму (описывается
            гауссовым распределением). <strong>EM-алгоритм</strong> находит параметры этих групп,
            чередуя два шага.
          </p>
        </div>

        <div className="bg-card rounded-xl border border-border p-5 space-y-3">
          <h2 className="text-lg font-bold text-accent">E-шаг (Expectation)</h2>
          <p>
            Для каждой точки считаем: <em>с какой вероятностью она принадлежит каждому кластеру?</em>{' '}
            Это мягкое (soft) присвоение по формуле Байеса:
          </p>
          <div className="overflow-x-auto py-2">
            <K d m={`g_{ij} = \\frac{w_j \\cdot \\varphi(x_i \\mid \\mu_j, \\Sigma_j)}{\\displaystyle\\sum_{s=1}^{K} w_s \\cdot \\varphi(x_i \\mid \\mu_s, \\Sigma_s)}`} />
          </div>
          <p className="text-text-dim text-sm">
            Здесь <K m={`\\varphi`} /> — плотность гауссова распределения, <K m="w_j" /> — вес
            кластера, <K m={`g_{ij}`} /> — «ответственность» кластера <K m="j" /> за точку <K m="i" />.
            Цвет точки на графике отражает это мягкое присвоение.
          </p>
        </div>

        <div className="bg-card rounded-xl border border-border p-5 space-y-3">
          <h2 className="text-lg font-bold text-green">M-шаг (Maximization)</h2>
          <p>
            Пересчитываем параметры каждого кластера, используя мягкие веса <K m={`g_{ij}`} /> как «массы» точек:
          </p>
          <div className="overflow-x-auto py-2 space-y-2">
            <div><K d m={`\\mu_j = \\frac{\\sum_i g_{ij} \\cdot x_i}{\\sum_i g_{ij}}`} /></div>
            <div><K d m={`\\Sigma_j = \\frac{\\sum_i g_{ij} \\cdot (x_i - \\mu_j)(x_i - \\mu_j)^T}{\\sum_i g_{ij}}`} /></div>
            <div><K d m={`w_j = \\frac{1}{n} \\sum_i g_{ij}`} /></div>
          </div>
          <p className="text-text-dim text-sm">
            Это взвешенный MLE: чем больше <K m={`g_{ij}`} />, тем сильнее точка <K m="i" /> влияет на параметры кластера <K m="j" />.
          </p>
        </div>

        <div className="bg-card rounded-xl border border-border p-5 space-y-3">
          <h2 className="text-lg font-bold">Почему сходится?</h2>
          <p>
            На каждой итерации (E + M) log-правдоподобие <strong>не убывает</strong>:
          </p>
          <div className="overflow-x-auto py-2">
            <K d m={`\\mathcal{L}(\\theta) = \\sum_{i=1}^{n} \\ln \\left( \\sum_{j=1}^{K} w_j \\cdot \\varphi(x_i \\mid \\mu_j, \\Sigma_j) \\right)`} />
          </div>
          <p className="text-text-dim text-sm">
            Следите за значением log-likelihood в панели выше — оно монотонно растёт (или остаётся
            на месте, когда алгоритм сошёлся). EM может сойтись к локальному максимуму — поэтому
            кнопка «Сброс» даёт новые начальные параметры.
          </p>
        </div>

        <div className="bg-card rounded-xl border border-border p-5 space-y-3">
          <h2 className="text-lg font-bold">Как пользоваться</h2>
          <ul className="list-disc ml-5 space-y-1 text-sm">
            <li><strong>E-шаг</strong> — пересчитать мягкие присвоения (цвета точек изменятся)</li>
            <li><strong>M-шаг</strong> — обновить центры и эллипсы кластеров</li>
            <li><strong>Запустить</strong> — автоматически чередовать E и M с анимацией</li>
            <li><strong>Сброс</strong> — новые случайные начальные параметры</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Router wrapper with tabs
// ══════════════════════════════════════════════════════════════

const pages = [
  { path: 'gaussian', label: 'Гауссиан (2D)', component: GaussianEMPage },
  { path: 'bernoulli', label: 'Бернулли (бинарные)', component: BernoulliEMPage },
  { path: 'poisson', label: 'Пуассон (счётчики)', component: PoissonEMPage },
];

export default function EMAlgorithm() {
  const tabCls = ({ isActive }) =>
    `px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
      isActive ? 'bg-accent text-white' : 'bg-card border border-border text-text hover:bg-bg'
    }`;

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold text-text">EM-алгоритм</h1>
      <p className="text-text-dim">Разделение смеси распределений. Один метод — разные распределения:</p>

      <nav className="flex flex-wrap gap-2">
        {pages.map(p => (
          <NavLink key={p.path} to={p.path} className={tabCls}>{p.label}</NavLink>
        ))}
      </nav>

      <Routes>
        {pages.map(p => (
          <Route key={p.path} path={p.path} element={<p.component />} />
        ))}
        <Route path="*" element={<Navigate to="gaussian" replace />} />
      </Routes>
    </div>
  );
}
