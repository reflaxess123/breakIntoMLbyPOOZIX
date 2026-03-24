import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { K } from '../../components/Latex';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// ══════════════════════════════════════════════════════════════
// Math helpers: Beta distribution
// ══════════════════════════════════════════════════════════════

function lnGamma(z) {
  // Lanczos approximation (g=7, n=9)
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - lnGamma(1 - z);
  }
  z -= 1;
  let x = c[0];
  for (let i = 1; i < 9; i++) x += c[i] / (z + i);
  const t = z + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

function betaPDF(x, a, b) {
  if (x <= 0 || x >= 1) return 0;
  if (a <= 0 || b <= 0) return 0;
  const lnB = lnGamma(a) + lnGamma(b) - lnGamma(a + b);
  return Math.exp((a - 1) * Math.log(x) + (b - 1) * Math.log(1 - x) - lnB);
}

function betaCDF(x, a, b, steps = 500) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  // Trapezoidal rule
  let sum = 0;
  const dx = x / steps;
  for (let i = 0; i <= steps; i++) {
    const t = i * dx;
    const w = i === 0 || i === steps ? 0.5 : 1;
    sum += w * betaPDF(t, a, b);
  }
  return sum * dx;
}

function betaQuantile(p, a, b, tol = 1e-8, maxIter = 100) {
  // Bisection
  let lo = 0, hi = 1;
  for (let i = 0; i < maxIter; i++) {
    const mid = (lo + hi) / 2;
    const cdf = betaCDF(mid, a, b);
    if (Math.abs(cdf - p) < tol) return mid;
    if (cdf < p) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

function betaMode(a, b) {
  if (a <= 1 && b <= 1) return 0.5; // uniform or U-shape
  if (a <= 1) return 0;
  if (b <= 1) return 1;
  return (a - 1) / (a + b - 2);
}

function betaMean(a, b) {
  return a / (a + b);
}

// ══════════════════════════════════════════════════════════════
// Shared canvas drawing utilities
// ══════════════════════════════════════════════════════════════

const COLORS = {
  prior: '#588157',
  likelihood: '#6b9bd2',
  posterior: '#da7756',
  map: '#c0392b',
  mean: '#b8860b',
  credible: 'rgba(218,119,86,0.15)',
  grid: '#e8e6dc',
  text: '#1a1a19',
  textDim: '#6b6b66',
};

function useCanvasSize(containerRef) {
  const [w, setW] = useState(0);
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) setW(e.contentRect.width);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [containerRef]);
  return w;
}

function setupCanvas(canvasRef, w, h) {
  const c = canvasRef.current;
  if (!c) return null;
  const dpr = window.devicePixelRatio || 1;
  c.width = w * dpr;
  c.height = h * dpr;
  const ctx = c.getContext('2d');
  ctx.scale(dpr, dpr);
  return ctx;
}

function drawAxes(ctx, W, H, pad, xLabel = 'θ', yLabel = 'p(θ)') {
  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 1;
  // x axis
  ctx.beginPath();
  ctx.moveTo(pad.l, H - pad.b);
  ctx.lineTo(W - pad.r, H - pad.b);
  ctx.stroke();
  // y axis
  ctx.beginPath();
  ctx.moveTo(pad.l, pad.t);
  ctx.lineTo(pad.l, H - pad.b);
  ctx.stroke();
  // x ticks
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '11px Fira Sans, sans-serif';
  ctx.textAlign = 'center';
  for (let v = 0; v <= 1; v += 0.2) {
    const x = pad.l + v * (W - pad.l - pad.r);
    ctx.fillText(v.toFixed(1), x, H - pad.b + 16);
    if (v > 0 && v < 1) {
      ctx.strokeStyle = '#f0efe8';
      ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, H - pad.b); ctx.stroke();
      ctx.strokeStyle = COLORS.grid;
    }
  }
  // label
  ctx.fillStyle = COLORS.textDim;
  ctx.textAlign = 'center';
  ctx.fillText(xLabel, (pad.l + W - pad.r) / 2, H - 2);
}

function drawCurve(ctx, W, H, pad, fn, color, lineWidth = 2, dash = []) {
  const pw = W - pad.l - pad.r;
  const ph = H - pad.t - pad.b;
  // Find max for scaling
  let maxY = 0;
  const steps = Math.min(pw, 400);
  const vals = [];
  for (let i = 0; i <= steps; i++) {
    const x = i / steps;
    const y = fn(x);
    vals.push(y);
    if (isFinite(y) && y > maxY) maxY = y;
  }
  if (maxY === 0) return 0;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.setLineDash(dash);
  ctx.beginPath();
  let started = false;
  for (let i = 0; i <= steps; i++) {
    const px = pad.l + (i / steps) * pw;
    const py = H - pad.b - (vals[i] / maxY) * ph * 0.92;
    if (!started) { ctx.moveTo(px, py); started = true; } else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.restore();
  return maxY;
}

// Draw curve with shared maxY for multiple curves on same scale
function drawCurveScaled(ctx, W, H, pad, fn, color, maxY, lineWidth = 2, dash = []) {
  const pw = W - pad.l - pad.r;
  const ph = H - pad.t - pad.b;
  if (maxY === 0) return;
  const steps = Math.min(pw, 400);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.setLineDash(dash);
  ctx.beginPath();
  let started = false;
  for (let i = 0; i <= steps; i++) {
    const x = i / steps;
    const y = fn(x);
    const px = pad.l + (i / steps) * pw;
    const py = H - pad.b - (Math.min(y, maxY) / maxY) * ph * 0.92;
    if (!started) { ctx.moveTo(px, py); started = true; } else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.restore();
}

function drawShadedRegion(ctx, W, H, pad, fn, maxY, lo, hi, color) {
  const pw = W - pad.l - pad.r;
  const ph = H - pad.t - pad.b;
  if (maxY === 0) return;
  const steps = Math.min(pw, 400);
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  const xLo = pad.l + lo * pw;
  ctx.moveTo(xLo, H - pad.b);
  for (let i = 0; i <= steps; i++) {
    const t = lo + (i / steps) * (hi - lo);
    const px = pad.l + t * pw;
    const y = fn(t);
    const py = H - pad.b - (Math.min(y, maxY) / maxY) * ph * 0.92;
    ctx.lineTo(px, py);
  }
  ctx.lineTo(pad.l + hi * pw, H - pad.b);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawVerticalLine(ctx, W, H, pad, xVal, color, label, labelSide = 'left') {
  const pw = W - pad.l - pad.r;
  const px = pad.l + xVal * pw;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(px, pad.t);
  ctx.lineTo(px, H - pad.b);
  ctx.stroke();
  ctx.setLineDash([]);
  if (label) {
    ctx.fillStyle = color;
    ctx.font = 'bold 11px Fira Sans, sans-serif';
    ctx.textAlign = labelSide === 'left' ? 'right' : 'left';
    const offset = labelSide === 'left' ? -6 : 6;
    ctx.fillText(label, px + offset, pad.t + 14);
  }
  ctx.restore();
}

// ══════════════════════════════════════════════════════════════
// Sub-page 1: Intuition
// ══════════════════════════════════════════════════════════════

function IntuitionPage() {
  const [flips, setFlips] = useState([]);
  const [trueTheta] = useState(() => 0.3 + Math.random() * 0.4); // hidden θ between 0.3 and 0.7
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const w = useCanvasSize(containerRef);
  const H = 350;

  const heads = flips.filter(f => f === 1).length;
  const tails = flips.length - heads;

  const flipCoin = useCallback(() => {
    setFlips(prev => [...prev, Math.random() < trueTheta ? 1 : 0]);
  }, [trueTheta]);

  const flip10 = useCallback(() => {
    setFlips(prev => {
      const newFlips = [];
      for (let i = 0; i < 10; i++) newFlips.push(Math.random() < trueTheta ? 1 : 0);
      return [...prev, ...newFlips];
    });
  }, [trueTheta]);

  const reset = useCallback(() => setFlips([]), []);

  useEffect(() => {
    if (!w) return;
    const ctx = setupCanvas(canvasRef, w, H);
    if (!ctx) return;
    const pad = { l: 45, r: 20, t: 30, b: 35 };
    ctx.clearRect(0, 0, w, H);

    // Compute global max for consistent scaling
    const priorFn = x => betaPDF(x, 1, 1);
    const postA = 1 + heads, postB = 1 + tails;
    const posteriorFn = x => betaPDF(x, postA, postB);

    // Likelihood: θ^k * (1-θ)^(n-k), normalized for display
    const n = flips.length;
    let likelihoodFn = () => 1;
    if (n > 0) {
      // Compute likelihood values and normalize
      const likVals = [];
      let likMax = 0;
      for (let i = 0; i <= 200; i++) {
        const x = i / 200;
        const v = x <= 0 || x >= 1 ? 0 : Math.exp(heads * Math.log(x) + tails * Math.log(1 - x));
        likVals.push(v);
        if (v > likMax) likMax = v;
      }
      likelihoodFn = x => {
        const idx = Math.round(x * 200);
        return likMax > 0 ? (likVals[Math.min(idx, 200)] / likMax) : 0;
      };
    }

    // Find global max across all curves
    let globalMax = 0;
    const steps = 400;
    for (let i = 0; i <= steps; i++) {
      const x = i / steps;
      const pv = priorFn(x);
      const postV = posteriorFn(x);
      // Scale likelihood to roughly same range as posterior
      let postMax = 0;
      for (let j = 0; j <= steps; j++) { const v = posteriorFn(j / steps); if (v > postMax) postMax = v; }
      const lv = n > 0 ? likelihoodFn(x) * postMax : 0;
      if (pv > globalMax) globalMax = pv;
      if (postV > globalMax) globalMax = postV;
      if (lv > globalMax) globalMax = lv;
    }

    // Get posterior max for likelihood scaling
    let postMax = 0;
    for (let i = 0; i <= steps; i++) { const v = posteriorFn(i / steps); if (v > postMax) postMax = v; }

    drawAxes(ctx, w, H, pad);

    // Prior (gray dashed)
    drawCurveScaled(ctx, w, H, pad, priorFn, '#999', globalMax, 2, [6, 4]);

    // Likelihood (blue, light)
    if (n > 0) {
      const scaledLik = x => likelihoodFn(x) * postMax;
      drawCurveScaled(ctx, w, H, pad, scaledLik, COLORS.likelihood, globalMax, 2, []);
    }

    // Posterior (terracotta, bold)
    drawCurveScaled(ctx, w, H, pad, posteriorFn, COLORS.posterior, globalMax, 3, []);

    // Legend
    ctx.font = '12px Fira Sans, sans-serif';
    const legendX = w - pad.r - 180;
    const legendY = pad.t + 10;
    // Prior
    ctx.strokeStyle = '#999'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.moveTo(legendX, legendY); ctx.lineTo(legendX + 24, legendY); ctx.stroke();
    ctx.setLineDash([]); ctx.fillStyle = COLORS.textDim; ctx.textAlign = 'left';
    ctx.fillText('Prior Beta(1,1)', legendX + 30, legendY + 4);
    // Likelihood
    if (n > 0) {
      ctx.strokeStyle = COLORS.likelihood; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(legendX, legendY + 18); ctx.lineTo(legendX + 24, legendY + 18); ctx.stroke();
      ctx.fillStyle = COLORS.likelihood; ctx.fillText('Likelihood', legendX + 30, legendY + 22);
    }
    // Posterior
    ctx.strokeStyle = COLORS.posterior; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(legendX, legendY + 36); ctx.lineTo(legendX + 24, legendY + 36); ctx.stroke();
    ctx.fillStyle = COLORS.posterior; ctx.fillText(`Posterior Beta(${postA},${postB})`, legendX + 30, legendY + 40);

  }, [w, flips, heads, tails]);

  return (
    <div className="space-y-8">
      {/* Section A: Car analogy */}
      <div className="bg-card rounded-2xl p-6 border border-border">
        <h2 className="text-xl font-bold text-accent mb-4">Аналогия: покупка машины</h2>
        <div className="space-y-3 text-text leading-relaxed">
          <p>
            Представь: ты покупаешь б/у машину. Продавец говорит: <em>«расход 8 литров на 100 км»</em>.
            Но ты знаешь, что такие машины обычно жрут 10-12 литров. Это твоё <strong>априорное убеждение</strong> (prior).
          </p>
          <p>
            Потом ты проехал 500 км и посчитал реальный расход: 9.2 л/100км.
            Теперь твоё убеждение <strong>обновилось</strong> — ты больше не думаешь что 12, но и не веришь что 8.
            Это <strong>апостериорное убеждение</strong> (posterior).
          </p>
          <p>
            Формула Байеса делает ровно это: берёт твоё начальное мнение, умножает на данные,
            и получает обновлённое мнение. Чем больше данных — тем точнее результат.
          </p>
          <div className="bg-bg rounded-xl p-4 text-center">
            <K m="\underbrace{p(\theta | \text{данные})}_{\text{posterior}} \propto \underbrace{p(\text{данные} | \theta)}_{\text{likelihood}} \cdot \underbrace{p(\theta)}_{\text{prior}}" d />
          </div>
        </div>
      </div>

      {/* Section B: Coin flip demo */}
      <div className="bg-card rounded-2xl p-6 border border-border">
        <h2 className="text-xl font-bold text-accent mb-4">Подбрасываем монетку</h2>
        <p className="text-text-dim mb-4">
          У монетки скрытая вероятность орла <K m="\theta" />. Мы начинаем с полного незнания — плоский prior <K m="\text{Beta}(1,1)" />.
          С каждым подбрасыванием posterior сужается и смещается к истинному <K m="\theta" />.
        </p>

        <div className="flex flex-wrap gap-3 mb-4">
          <button onClick={flipCoin}
            className="px-4 py-2 bg-accent text-white rounded-lg hover:opacity-90 transition-opacity w-full sm:w-auto">
            Подбросить монетку
          </button>
          <button onClick={flip10}
            className="px-4 py-2 bg-accent/80 text-white rounded-lg hover:opacity-90 transition-opacity w-full sm:w-auto">
            Подбросить 10 раз
          </button>
          <button onClick={reset}
            className="px-4 py-2 border border-border text-text-dim rounded-lg hover:bg-bg transition-colors w-full sm:w-auto">
            Сбросить
          </button>
        </div>

        <div className="flex flex-wrap gap-4 mb-4 text-sm">
          <span className="px-3 py-1 bg-bg rounded-lg">Орёл: <strong>{heads}</strong></span>
          <span className="px-3 py-1 bg-bg rounded-lg">Решка: <strong>{tails}</strong></span>
          <span className="px-3 py-1 bg-bg rounded-lg">Всего: <strong>{flips.length}</strong></span>
          {flips.length >= 20 && (
            <span className="px-3 py-1 bg-accent/10 text-accent rounded-lg">
              Истинное θ = {trueTheta.toFixed(3)}
            </span>
          )}
        </div>

        <div ref={containerRef} className="w-full">
          {w > 0 && (
            <canvas ref={canvasRef} style={{ width: w, height: H }}
              className="rounded-lg block border border-border" />
          )}
        </div>

        {flips.length >= 5 && (
          <p className="mt-3 text-text-dim text-sm">
            Posterior среднее: <strong>{(betaMean(1 + heads, 1 + tails)).toFixed(3)}</strong>.
            {flips.length >= 20 && <> Истинное θ: <strong>{trueTheta.toFixed(3)}</strong> — видишь, как posterior стягивается к правде?</>}
          </p>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Sub-page 2: Beta distribution
// ══════════════════════════════════════════════════════════════

function BetaPage() {
  const [alpha, setAlpha] = useState(2);
  const [beta_, setBeta] = useState(5);
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const w = useCanvasSize(containerRef);
  const H = 350;

  const presets = [
    { a: 1, b: 1, label: 'Beta(1,1) — ничего не знаем' },
    { a: 10, b: 10, label: 'Beta(10,10) — около 0.5' },
    { a: 2, b: 8, label: 'Beta(2,8) — скорее малое' },
    { a: 8, b: 2, label: 'Beta(8,2) — скорее большое' },
    { a: 0.5, b: 0.5, label: 'Beta(0.5,0.5) — крайности' },
  ];

  useEffect(() => {
    if (!w) return;
    const ctx = setupCanvas(canvasRef, w, H);
    if (!ctx) return;
    const pad = { l: 45, r: 20, t: 25, b: 35 };
    ctx.clearRect(0, 0, w, H);
    drawAxes(ctx, w, H, pad);

    const fn = x => betaPDF(x, alpha, beta_);
    const maxY = drawCurve(ctx, w, H, pad, fn, COLORS.posterior, 3);

    // Show mode and mean
    const m = betaMean(alpha, beta_);
    const mode = alpha > 1 && beta_ > 1 ? betaMode(alpha, beta_) : null;
    drawVerticalLine(ctx, w, H, pad, m, COLORS.mean, `μ=${m.toFixed(2)}`, 'right');
    if (mode !== null && Math.abs(mode - m) > 0.02) {
      drawVerticalLine(ctx, w, H, pad, mode, COLORS.map, `mode=${mode.toFixed(2)}`, 'left');
    }

    // Y-axis label
    ctx.fillStyle = COLORS.textDim;
    ctx.font = '11px Fira Sans, sans-serif';
    ctx.textAlign = 'center';
    ctx.save();
    ctx.translate(12, (pad.t + H - pad.b) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('p(θ)', 0, 0);
    ctx.restore();

  }, [w, alpha, beta_]);

  return (
    <div className="space-y-8">
      <div className="bg-card rounded-2xl p-6 border border-border">
        <h2 className="text-xl font-bold text-accent mb-4">Бета-распределение: два рычага</h2>
        <p className="text-text-dim mb-4">
          Бета-распределение — это просто «горка» на отрезке [0, 1].
          Два параметра <K m="\alpha" /> и <K m="\beta" /> управляют её формой.
          Это идеальный способ описать неуверенность в вероятности.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-sm text-text-dim block mb-1">
              α = {alpha.toFixed(1)}
            </label>
            <input type="range" min="0.5" max="20" step="0.1" value={alpha}
              onChange={e => setAlpha(+e.target.value)}
              className="w-full accent-accent" />
          </div>
          <div>
            <label className="text-sm text-text-dim block mb-1">
              β = {beta_.toFixed(1)}
            </label>
            <input type="range" min="0.5" max="20" step="0.1" value={beta_}
              onChange={e => setBeta(+e.target.value)}
              className="w-full accent-accent" />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {presets.map((p, i) => (
            <button key={i}
              onClick={() => { setAlpha(p.a); setBeta(p.b); }}
              className="px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-bg transition-colors">
              {p.label}
            </button>
          ))}
        </div>

        <div ref={containerRef} className="w-full">
          {w > 0 && (
            <canvas ref={canvasRef} style={{ width: w, height: H }}
              className="rounded-lg block border border-border" />
          )}
        </div>

        <div className="mt-4 bg-bg rounded-xl p-4 text-sm space-y-1">
          <p>Среднее: <K m={`\\mu = \\frac{\\alpha}{\\alpha+\\beta} = \\frac{${alpha.toFixed(1)}}{${(alpha + beta_).toFixed(1)}} = ${betaMean(alpha, beta_).toFixed(3)}`} /></p>
          {alpha > 1 && beta_ > 1 && (
            <p>Мода: <K m={`\\frac{\\alpha-1}{\\alpha+\\beta-2} = ${betaMode(alpha, beta_).toFixed(3)}`} /></p>
          )}
        </div>
      </div>

      {/* Section B: Conjugacy */}
      <div className="bg-card rounded-2xl p-6 border border-border">
        <h2 className="text-xl font-bold text-accent mb-4">Почему именно Бета?</h2>
        <div className="space-y-3 text-text leading-relaxed">
          <p>
            Бета-распределение — <strong>сопряжённый prior</strong> для биномиальных данных.
            Это значит: если prior — Бета, и данные — орлы/решки, то posterior тоже будет Бета.
          </p>
          <div className="bg-bg rounded-xl p-4 text-center">
            <K m="\text{Prior } \text{Beta}(\alpha, \beta) + k \text{ успехов}, \; (n-k) \text{ неудач}" d />
            <div className="my-2 text-2xl text-accent">↓</div>
            <K m="\text{Posterior } \text{Beta}(\alpha + k, \; \beta + n - k)" d />
          </div>
          <p>
            Просто <strong>прибавь количество успехов к α</strong> и <strong>количество неудач к β</strong>.
            Вот и весь байесовский апдейт!
          </p>
          <p className="text-text-dim text-sm">
            Например: prior <K m="\text{Beta}(2, 2)" />, увидели 7 орлов и 3 решки →
            posterior <K m="\text{Beta}(2+7, 2+3) = \text{Beta}(9, 5)" />.
          </p>
        </div>
      </div>

      {/* Section C: Connection to Gamma function */}
      <div className="bg-card rounded-2xl p-6 border border-border">
        <h2 className="text-xl font-bold text-accent mb-4">Связь с Гамма-функцией</h2>
        <div className="space-y-3 text-text leading-relaxed">
          <p>
            Плотность бета-распределения содержит <strong>нормировочную константу</strong> — чтобы площадь под кривой = 1.
            Эта константа выражается через <strong>Гамма-функцию</strong> <K m="\Gamma" /> из матанализа:
          </p>
          <div className="bg-bg rounded-xl p-4 text-center space-y-2">
            <K m="p(\theta) = \frac{\Gamma(\alpha + \beta)}{\Gamma(\alpha) \cdot \Gamma(\beta)} \cdot \theta^{\alpha-1}(1-\theta)^{\beta-1}" d />
          </div>
          <p>
            <strong>Что такое Гамма-функция?</strong> Это обобщение факториала на нецелые числа:
          </p>
          <div className="bg-bg rounded-xl p-4 text-center space-y-2">
            <K m="\Gamma(n) = (n-1)! \quad \text{для целых } n" d />
            <K m="\Gamma(z) = \int_0^\infty t^{z-1} e^{-t} \, dt \quad \text{для любых } z > 0" d />
          </div>
          <p className="text-text-dim text-sm">
            Примеры: <K m="\Gamma(1) = 1" />, <K m="\Gamma(2) = 1" />, <K m="\Gamma(3) = 2" />,
            <K m="\Gamma(4) = 6" />, <K m="\Gamma(5) = 24" />.
            А ещё <K m="\Gamma(1/2) = \sqrt{\pi}" /> — вот почему √π возникает в формуле нормального распределения.
          </p>
        </div>

        <div className="mt-4 space-y-3">
          <p className="text-text leading-relaxed">
            <strong>Бета-функция</strong> <K m="B(\alpha, \beta)" /> — это тот самый нормировочный множитель:
          </p>
          <div className="bg-bg rounded-xl p-4 text-center space-y-2">
            <K m="B(\alpha, \beta) = \int_0^1 \theta^{\alpha-1}(1-\theta)^{\beta-1} d\theta = \frac{\Gamma(\alpha) \cdot \Gamma(\beta)}{\Gamma(\alpha + \beta)}" d />
          </div>
          <p className="text-text-dim text-sm leading-relaxed">
            То есть <K m="B(\alpha, \beta)" /> — это <em>площадь под ненормированной горкой</em> <K m="\theta^{\alpha-1}(1-\theta)^{\beta-1}" />.
            Делим горку на эту площадь — получаем плотность с площадью = 1.
          </p>
        </div>

        <GammaViz />
      </div>
    </div>
  );
}

// ── Gamma function visualization ──
function GammaViz() {
  const ref = useRef(null);
  const canvasRef = useRef(null);
  const [w, setW] = useState(0);
  const H = 300;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setW(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!w) return;
    const c = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    c.width = w * dpr;
    c.height = H * dpr;
    const ctx = c.getContext('2d');
    ctx.scale(dpr, dpr);

    const pad = { l: 50, r: 20, t: 25, b: 40 };
    const pw = w - pad.l - pad.r;
    const ph = H - pad.t - pad.b;

    ctx.clearRect(0, 0, w, H);

    const xMin = 0.01, xMax = 5.5;
    const yMin = 0, yMax = 7;
    const toX = v => pad.l + (v - xMin) / (xMax - xMin) * pw;
    const toY = v => pad.t + (1 - (v - yMin) / (yMax - yMin)) * ph;

    // Grid
    ctx.strokeStyle = '#e8e6dc';
    ctx.lineWidth = 0.5;
    for (let y = 0; y <= yMax; y++) {
      ctx.beginPath(); ctx.moveTo(pad.l, toY(y)); ctx.lineTo(pad.l + pw, toY(y)); ctx.stroke();
    }
    for (let x = 1; x <= 5; x++) {
      ctx.beginPath(); ctx.moveTo(toX(x), pad.t); ctx.lineTo(toX(x), pad.t + ph); ctx.stroke();
    }

    // Draw Γ(z)
    ctx.strokeStyle = '#da7756';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    let started = false;
    for (let px = 0; px <= pw; px++) {
      const z = xMin + (px / pw) * (xMax - xMin);
      const val = Math.exp(lnGamma(z));
      if (val > yMax * 2 || isNaN(val) || !isFinite(val)) { started = false; continue; }
      const sy = toY(val);
      if (!started) { ctx.moveTo(pad.l + px, sy); started = true; }
      else ctx.lineTo(pad.l + px, sy);
    }
    ctx.stroke();

    // Draw factorial points
    const factorials = [
      { z: 1, label: 'Γ(1)=1' },
      { z: 2, label: 'Γ(2)=1' },
      { z: 3, label: 'Γ(3)=2' },
      { z: 4, label: 'Γ(4)=6' },
    ];
    for (const { z, label } of factorials) {
      const val = Math.exp(lnGamma(z));
      const px = toX(z);
      const py = toY(val);
      ctx.fillStyle = '#da7756';
      ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1a1a19';
      ctx.font = 'bold 11px Fira Sans, system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(label, px, py - 10);
    }

    // Draw Γ(1/2) = √π
    const halfVal = Math.exp(lnGamma(0.5));
    ctx.fillStyle = '#588157';
    ctx.beginPath(); ctx.arc(toX(0.5), toY(halfVal), 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#588157';
    ctx.font = 'bold 11px Fira Sans, system-ui';
    ctx.textAlign = 'left';
    ctx.fillText('Γ(½)=√π≈1.77', toX(0.5) + 8, toY(halfVal) + 4);

    // Axes
    ctx.strokeStyle = '#1a1a19';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.l, pad.t); ctx.lineTo(pad.l, pad.t + ph); ctx.lineTo(pad.l + pw, pad.t + ph);
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#6b6b66';
    ctx.font = '11px Fira Sans, system-ui';
    ctx.textAlign = 'center';
    for (let x = 1; x <= 5; x++) ctx.fillText(x.toString(), toX(x), pad.t + ph + 16);
    ctx.fillText('z', pad.l + pw / 2, H - 3);

    ctx.textAlign = 'right';
    for (let y = 0; y <= yMax; y += 2) ctx.fillText(y.toString(), pad.l - 5, toY(y) + 4);

    // Title
    ctx.textAlign = 'left';
    ctx.fillStyle = '#da7756';
    ctx.font = 'bold 13px Fira Sans, system-ui';
    ctx.fillText('Γ(z) — обобщённый факториал', pad.l + 10, pad.t + 15);
  }, [w]);

  return (
    <div className="mt-4">
      <div ref={ref} className="w-full">
        {w > 0 && <canvas ref={canvasRef} style={{ width: w, height: H }} className="rounded-lg block border border-border" />}
      </div>
      <p className="text-text-dim text-xs mt-2 leading-relaxed">
        Гамма-функция совпадает с факториалом в целых точках: <K m="\Gamma(n) = (n-1)!" />.
        Между ними — гладкая кривая. Именно она стоит в формуле бета-распределения как нормировочный множитель.
      </p>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Sub-page 3: Posterior in action
// ══════════════════════════════════════════════════════════════

function PosteriorPage() {
  const [trueTheta, setTrueTheta] = useState(0.6);
  const [alphaPrior, setAlphaPrior] = useState(2);
  const [betaPrior, setBetaPrior] = useState(2);
  const [nObs, setNObs] = useState(30);
  const [data, setData] = useState(null); // { k, n }
  const [mapAlpha, setMapAlpha] = useState(2);
  const [mapBeta, setMapBeta] = useState(5);

  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const w = useCanvasSize(containerRef);
  const H = 380;

  // Section B: integral animation
  const integralRef = useRef(null);
  const integralCanvasRef = useRef(null);
  const integralW = useCanvasSize(integralRef);
  const INTEGRAL_H = 300;
  const [sliceCount, setSliceCount] = useState(0);
  const [animating, setAnimating] = useState(false);

  // Section: Model Averaging
  const [spikePos, setSpikePos] = useState(0.6);
  const avgRef = useRef(null);
  const avgCanvasRef = useRef(null);
  const avgW = useCanvasSize(avgRef);
  const AVG_H = 340;

  // Section: Odds calculator
  const [oddsPreset, setOddsPreset] = useState(true);
  const [pH0, setPH0] = useState(0.999);
  const [pH1, setPH1] = useState(0.001);
  const [pDataH0, setPDataH0] = useState(0.01);
  const [pDataH1, setPDataH1] = useState(0.99);

  // Section C: MAP vs Mean
  const [cAlpha, setCAlpha] = useState(2);
  const [cBeta, setCBeta] = useState(8);
  const compRef = useRef(null);
  const compCanvasRef = useRef(null);
  const compW = useCanvasSize(compRef);
  const COMP_H = 300;

  const generate = useCallback(() => {
    let k = 0;
    for (let i = 0; i < nObs; i++) {
      if (Math.random() < trueTheta) k++;
    }
    setData({ k, n: nObs });
  }, [trueTheta, nObs]);

  // Main posterior canvas
  useEffect(() => {
    if (!w || !data) return;
    const ctx = setupCanvas(canvasRef, w, H);
    if (!ctx) return;
    const pad = { l: 45, r: 20, t: 30, b: 35 };
    ctx.clearRect(0, 0, w, H);

    const { k, n } = data;
    const postA = alphaPrior + k;
    const postB = betaPrior + (n - k);

    const priorFn = x => betaPDF(x, alphaPrior, betaPrior);
    const posteriorFn = x => betaPDF(x, postA, postB);

    // Likelihood (normalized)
    let likMax = 0;
    const likSteps = 400;
    const likVals = [];
    for (let i = 0; i <= likSteps; i++) {
      const x = i / likSteps;
      const v = x <= 0 || x >= 1 ? 0 : Math.exp(k * Math.log(x) + (n - k) * Math.log(1 - x));
      likVals.push(v);
      if (v > likMax) likMax = v;
    }
    // Scale likelihood to posterior max
    let postMaxVal = 0;
    for (let i = 0; i <= likSteps; i++) { const v = posteriorFn(i / likSteps); if (v > postMaxVal) postMaxVal = v; }
    const likelihoodFn = x => {
      const idx = Math.round(x * likSteps);
      return postMaxVal > 0 && likMax > 0 ? (likVals[Math.min(idx, likSteps)] / likMax) * postMaxVal : 0;
    };

    // Global max
    let globalMax = 0;
    for (let i = 0; i <= likSteps; i++) {
      const x = i / likSteps;
      const vals = [priorFn(x), posteriorFn(x), likelihoodFn(x)];
      for (const v of vals) if (isFinite(v) && v > globalMax) globalMax = v;
    }

    drawAxes(ctx, w, H, pad);

    // Credible interval
    const ci95Lo = betaQuantile(0.025, postA, postB);
    const ci95Hi = betaQuantile(0.975, postA, postB);
    drawShadedRegion(ctx, w, H, pad, posteriorFn, globalMax, ci95Lo, ci95Hi, COLORS.credible);

    // Curves
    drawCurveScaled(ctx, w, H, pad, priorFn, COLORS.prior, globalMax, 2, [6, 4]);
    drawCurveScaled(ctx, w, H, pad, likelihoodFn, COLORS.likelihood, globalMax, 2, []);
    drawCurveScaled(ctx, w, H, pad, posteriorFn, COLORS.posterior, globalMax, 3, []);

    // MAP and mean lines
    const mapVal = betaMode(postA, postB);
    const meanVal = betaMean(postA, postB);
    drawVerticalLine(ctx, w, H, pad, mapVal, COLORS.map, `MAP=${mapVal.toFixed(3)}`, 'left');
    drawVerticalLine(ctx, w, H, pad, meanVal, COLORS.mean, `Mean=${meanVal.toFixed(3)}`, 'right');

    // True theta
    const pw = w - pad.l - pad.r;
    const truePx = pad.l + trueTheta * pw;
    ctx.save();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.moveTo(truePx, pad.t); ctx.lineTo(truePx, H - pad.b); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#333';
    ctx.font = 'bold 11px Fira Sans, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`θ*=${trueTheta.toFixed(2)}`, truePx, H - pad.b + 28);
    ctx.restore();

    // Legend
    ctx.font = '11px Fira Sans, sans-serif';
    const lx = w - pad.r - 175, ly = pad.t + 5;
    ctx.strokeStyle = COLORS.prior; ctx.lineWidth = 2; ctx.setLineDash([6,4]);
    ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + 20, ly); ctx.stroke();
    ctx.setLineDash([]); ctx.fillStyle = COLORS.prior; ctx.textAlign = 'left';
    ctx.fillText('Prior', lx + 26, ly + 4);

    ctx.strokeStyle = COLORS.likelihood; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(lx, ly + 16); ctx.lineTo(lx + 20, ly + 16); ctx.stroke();
    ctx.fillStyle = COLORS.likelihood; ctx.fillText('Likelihood', lx + 26, ly + 20);

    ctx.strokeStyle = COLORS.posterior; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(lx, ly + 32); ctx.lineTo(lx + 20, ly + 32); ctx.stroke();
    ctx.fillStyle = COLORS.posterior; ctx.fillText('Posterior', lx + 26, ly + 36);

    // formula text
    ctx.fillStyle = COLORS.textDim; ctx.font = '12px Fira Sans, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('posterior ∝ prior × likelihood', pad.l + 5, pad.t + 14);

  }, [w, data, alphaPrior, betaPrior, trueTheta]);

  const postA = data ? alphaPrior + data.k : alphaPrior;
  const postB = data ? betaPrior + (data.n - data.k) : betaPrior;

  // Section B: Integral visualization
  useEffect(() => {
    if (!integralW) return;
    const ctx = setupCanvas(integralCanvasRef, integralW, INTEGRAL_H);
    if (!ctx) return;
    const pad = { l: 45, r: 20, t: 25, b: 35 };
    ctx.clearRect(0, 0, integralW, INTEGRAL_H);

    const a = 3, b = 7; // fixed example
    const fn = x => betaPDF(x, a, b);
    drawAxes(ctx, integralW, INTEGRAL_H, pad);

    // Find max
    let maxY = 0;
    for (let i = 0; i <= 400; i++) { const v = fn(i / 400); if (v > maxY) maxY = v; }

    const pw = integralW - pad.l - pad.r;
    const ph = INTEGRAL_H - pad.t - pad.b;
    const totalSlices = 30;
    const shown = Math.min(sliceCount, totalSlices);

    // Draw slices
    let runningSum = 0;
    for (let s = 0; s < shown; s++) {
      const thetaVal = (s + 0.5) / totalSlices;
      const dx = 1.0 / totalSlices;
      const height = fn(thetaVal);
      const contribution = thetaVal * height * dx;
      runningSum += contribution;

      const px = pad.l + thetaVal * pw;
      const sliceW = pw / totalSlices;
      const sliceH = (height / maxY) * ph * 0.92;

      // Color intensity by θ*p(θ)
      const intensity = Math.min(contribution * 15, 1);
      ctx.fillStyle = `rgba(218,119,86,${0.15 + intensity * 0.5})`;
      ctx.fillRect(px - sliceW / 2, INTEGRAL_H - pad.b - sliceH, sliceW - 1, sliceH);
    }

    // Draw curve on top
    drawCurveScaled(ctx, integralW, INTEGRAL_H, pad, fn, COLORS.posterior, maxY, 3, []);

    // Mean line
    const mean = betaMean(a, b);
    if (shown >= totalSlices) {
      drawVerticalLine(ctx, integralW, INTEGRAL_H, pad, mean, COLORS.mean, `E[θ]=${mean.toFixed(3)}`, 'right');
    }

    // Sum display
    if (shown > 0) {
      ctx.fillStyle = COLORS.text;
      ctx.font = '13px Fira Sans, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`Сумма θ·p(θ)·dθ ≈ ${runningSum.toFixed(4)}`, pad.l + 5, pad.t + 14);
    }

  }, [integralW, sliceCount]);

  const startAnimation = useCallback(() => {
    setSliceCount(0);
    setAnimating(true);
  }, []);

  useEffect(() => {
    if (!animating) return;
    if (sliceCount >= 30) { setAnimating(false); return; }
    const timer = setTimeout(() => setSliceCount(s => s + 1), 120);
    return () => clearTimeout(timer);
  }, [animating, sliceCount]);

  // Section: Model Averaging canvas
  useEffect(() => {
    if (!avgW) return;
    const ctx = setupCanvas(avgCanvasRef, avgW, AVG_H);
    if (!ctx) return;
    const pad = { l: 50, r: 20, t: 25, b: 40 };
    ctx.clearRect(0, 0, avgW, AVG_H);
    drawAxes(ctx, avgW, AVG_H, pad);

    const pw = avgW - pad.l - pad.r;
    const ph = AVG_H - pad.t - pad.b;

    // Posterior: Beta(8, 5)
    const pA = 8, pB = 5;
    const posteriorFn = x => betaPDF(x, pA, pB);
    const mapTheta = betaMode(pA, pB);

    // f(θ) — wavy function with a sharp spike at spikePos
    const fTheta = x => {
      const base = 0.4 + 0.15 * Math.sin(x * 12) + 0.1 * Math.cos(x * 7);
      const spike = 1.8 * Math.exp(-((x - spikePos) ** 2) / (2 * 0.003 ** 2));
      return base + spike;
    };

    // Product f(θ) · p(θ|d) (unnormalized)
    const productFn = x => fTheta(x) * posteriorFn(x);

    // Compute integral ∫ f(θ) · p(θ|d) dθ numerically
    const steps = 1000;
    let integral = 0;
    let normalization = 0;
    for (let i = 0; i <= steps; i++) {
      const x = i / steps;
      const w_trap = (i === 0 || i === steps) ? 0.5 : 1;
      integral += w_trap * productFn(x) * (1 / steps);
      normalization += w_trap * posteriorFn(x) * (1 / steps);
    }
    const posteriorAvg = normalization > 0 ? integral / normalization : 0;
    const fAtMAP = fTheta(mapTheta);

    // Find max values for scaling
    let maxF = 0, maxPost = 0, maxProd = 0;
    for (let i = 0; i <= 400; i++) {
      const x = i / 400;
      const vf = fTheta(x);
      const vp = posteriorFn(x);
      const vprod = productFn(x);
      if (vf > maxF) maxF = vf;
      if (vp > maxPost) maxPost = vp;
      if (vprod > maxProd) maxProd = vprod;
    }

    // We'll scale everything to a common vertical space
    // Draw f(θ) scaled to top half, posterior scaled to bottom context
    const globalMax = Math.max(maxF, maxPost * 0.5, maxProd * 0.3);

    // Draw product as shaded area
    ctx.fillStyle = 'rgba(218,119,86,0.15)';
    ctx.beginPath();
    ctx.moveTo(pad.l, AVG_H - pad.b);
    for (let i = 0; i <= 400; i++) {
      const x = i / 400;
      const v = productFn(x) / (maxProd || 1);
      const px = pad.l + x * pw;
      const py = AVG_H - pad.b - v * ph * 0.4;
      ctx.lineTo(px, py);
    }
    ctx.lineTo(pad.l + pw, AVG_H - pad.b);
    ctx.closePath();
    ctx.fill();

    // Draw f(θ) — blue
    ctx.strokeStyle = '#6b9bd2';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i <= 400; i++) {
      const x = i / 400;
      const v = fTheta(x) / (maxF || 1);
      const px = pad.l + x * pw;
      const py = AVG_H - pad.b - v * ph * 0.85;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Draw posterior p(θ|d) — terracotta, dashed
    ctx.strokeStyle = COLORS.posterior;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    for (let i = 0; i <= 400; i++) {
      const x = i / 400;
      const v = posteriorFn(x) / (maxPost || 1);
      const px = pad.l + x * pw;
      const py = AVG_H - pad.b - v * ph * 0.6;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw product f(θ)·p(θ|d) — green
    ctx.strokeStyle = '#588157';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 400; i++) {
      const x = i / 400;
      const v = productFn(x) / (maxProd || 1);
      const px = pad.l + x * pw;
      const py = AVG_H - pad.b - v * ph * 0.4;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Horizontal line: f(θ_MAP)
    const fMapY = AVG_H - pad.b - (fAtMAP / (maxF || 1)) * ph * 0.85;
    ctx.strokeStyle = COLORS.map;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(pad.l, fMapY);
    ctx.lineTo(pad.l + pw, fMapY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Horizontal line: posterior average
    const avgY = AVG_H - pad.b - (posteriorAvg / (maxF || 1)) * ph * 0.85;
    ctx.strokeStyle = COLORS.mean;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 3]);
    ctx.beginPath();
    ctx.moveTo(pad.l, avgY);
    ctx.lineTo(pad.l + pw, avgY);
    ctx.stroke();
    ctx.setLineDash([]);

    // MAP vertical marker
    const mapPx = pad.l + mapTheta * pw;
    ctx.strokeStyle = COLORS.map;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(mapPx, pad.t);
    ctx.lineTo(mapPx, AVG_H - pad.b);
    ctx.stroke();
    ctx.setLineDash([]);

    // Spike position marker
    const spikePx = pad.l + spikePos * pw;
    ctx.fillStyle = '#c0392b';
    ctx.font = '11px Fira Sans, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`spike: ${spikePos.toFixed(2)}`, spikePx, AVG_H - pad.b + 30);

    // Labels
    ctx.font = '11px Fira Sans, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.map;
    ctx.fillText(`f(θ_MAP) = ${fAtMAP.toFixed(3)}`, pad.l + pw - 5, fMapY - 5);
    ctx.fillStyle = COLORS.mean;
    ctx.fillText(`E[f(θ)] = ${posteriorAvg.toFixed(3)}`, pad.l + pw - 5, avgY - 5);

    // Legend
    const lx = pad.l + 5, ly = pad.t + 5;
    ctx.textAlign = 'left';
    ctx.font = '11px Fira Sans, sans-serif';

    ctx.strokeStyle = '#6b9bd2'; ctx.lineWidth = 2.5; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + 18, ly); ctx.stroke();
    ctx.fillStyle = '#6b9bd2'; ctx.fillText('f(θ)', lx + 22, ly + 4);

    ctx.strokeStyle = COLORS.posterior; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.moveTo(lx, ly + 16); ctx.lineTo(lx + 18, ly + 16); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = COLORS.posterior; ctx.fillText('p(θ|d)', lx + 22, ly + 20);

    ctx.strokeStyle = '#588157'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(lx, ly + 32); ctx.lineTo(lx + 18, ly + 32); ctx.stroke();
    ctx.fillStyle = '#588157'; ctx.fillText('f(θ)·p(θ|d)', lx + 22, ly + 36);

  }, [avgW, spikePos]);

  // Odds derived values
  const priorOdds = pH1 > 0 && pH0 > 0 ? pH1 / pH0 : 0;
  const likelihoodRatio = pDataH0 > 0 ? pDataH1 / pDataH0 : 0;
  const posteriorOdds = priorOdds * likelihoodRatio;
  const posteriorProb = posteriorOdds / (1 + posteriorOdds);

  // Section C: MAP vs Mean comparison
  useEffect(() => {
    if (!compW) return;
    const ctx = setupCanvas(compCanvasRef, compW, COMP_H);
    if (!ctx) return;
    const pad = { l: 45, r: 20, t: 25, b: 35 };
    ctx.clearRect(0, 0, compW, COMP_H);
    drawAxes(ctx, compW, COMP_H, pad);

    const fn = x => betaPDF(x, cAlpha, cBeta);
    let maxY = 0;
    for (let i = 0; i <= 400; i++) { const v = fn(i / 400); if (v > maxY) maxY = v; }
    drawCurveScaled(ctx, compW, COMP_H, pad, fn, COLORS.posterior, maxY, 3, []);

    const mode = betaMode(cAlpha, cBeta);
    const mean = betaMean(cAlpha, cBeta);
    drawVerticalLine(ctx, compW, COMP_H, pad, mode, COLORS.map, `MAP=${mode.toFixed(3)}`, 'left');
    drawVerticalLine(ctx, compW, COMP_H, pad, mean, COLORS.mean, `Mean=${mean.toFixed(3)}`, 'right');

  }, [compW, cAlpha, cBeta]);

  return (
    <div className="space-y-8">
      {/* Section A: Full Bayesian update */}
      <div className="bg-card rounded-2xl p-6 border border-border">
        <h2 className="text-xl font-bold text-accent mb-4">Полный байесовский апдейт</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-sm text-text-dim block mb-1">Истинное θ = {trueTheta.toFixed(2)}</label>
            <input type="range" min="0.01" max="0.99" step="0.01" value={trueTheta}
              onChange={e => setTrueTheta(+e.target.value)} className="w-full accent-accent" />
          </div>
          <div>
            <label className="text-sm text-text-dim block mb-1">n (наблюдений) = {nObs}</label>
            <input type="range" min="1" max="200" step="1" value={nObs}
              onChange={e => setNObs(+e.target.value)} className="w-full accent-accent" />
          </div>
          <div>
            <label className="text-sm text-text-dim block mb-1">α prior = {alphaPrior.toFixed(1)}</label>
            <input type="range" min="0.5" max="20" step="0.1" value={alphaPrior}
              onChange={e => setAlphaPrior(+e.target.value)} className="w-full accent-accent" />
          </div>
          <div>
            <label className="text-sm text-text-dim block mb-1">β prior = {betaPrior.toFixed(1)}</label>
            <input type="range" min="0.5" max="20" step="0.1" value={betaPrior}
              onChange={e => setBetaPrior(+e.target.value)} className="w-full accent-accent" />
          </div>
        </div>

        <button onClick={generate}
          className="px-5 py-2 bg-accent text-white rounded-lg hover:opacity-90 transition-opacity mb-4 w-full sm:w-auto">
          Сгенерировать данные
        </button>

        <div ref={containerRef} className="w-full">
          {w > 0 && (
            <canvas ref={canvasRef} style={{ width: w, height: H }}
              className="rounded-lg block border border-border" />
          )}
        </div>

        {data && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            <div className="bg-bg rounded-xl p-3 text-center">
              <div className="text-xs text-text-dim">MAP</div>
              <div className="text-lg font-bold" style={{ color: COLORS.map }}>{betaMode(postA, postB).toFixed(3)}</div>
            </div>
            <div className="bg-bg rounded-xl p-3 text-center">
              <div className="text-xs text-text-dim">Среднее</div>
              <div className="text-lg font-bold" style={{ color: COLORS.mean }}>{betaMean(postA, postB).toFixed(3)}</div>
            </div>
            <div className="bg-bg rounded-xl p-3 text-center">
              <div className="text-xs text-text-dim">95% интервал</div>
              <div className="text-lg font-bold text-accent">
                [{betaQuantile(0.025, postA, postB).toFixed(2)}, {betaQuantile(0.975, postA, postB).toFixed(2)}]
              </div>
            </div>
            <div className="bg-bg rounded-xl p-3 text-center">
              <div className="text-xs text-text-dim">Истинное θ</div>
              <div className="text-lg font-bold">{trueTheta.toFixed(2)}</div>
            </div>
            <div className="bg-bg rounded-xl p-3 text-center col-span-2 sm:col-span-4">
              <div className="text-xs text-text-dim">Данные</div>
              <div className="text-sm">
                {data.k} успехов из {data.n} наблюдений (доля: {(data.k / data.n).toFixed(3)})
              </div>
            </div>
          </div>
        )}

        {!data && (
          <p className="text-text-dim text-sm mt-3">Нажми кнопку, чтобы сгенерировать данные и увидеть posterior.</p>
        )}
      </div>

      {/* Section B: The integral explained */}
      <div className="bg-card rounded-2xl p-6 border border-border">
        <h2 className="text-xl font-bold text-accent mb-4">Что такое «posterior среднее» — интеграл</h2>
        <div className="space-y-3 text-text leading-relaxed mb-4">
          <p>
            Posterior среднее — это <strong>взвешенное среднее</strong> всех возможных значений θ,
            где вес каждого θ — его апостериорная вероятность:
          </p>
          <div className="bg-bg rounded-xl p-4 text-center">
            <K m="E[\theta | \text{data}] = \int_0^1 \theta \cdot p(\theta | \text{data}) \, d\theta" d />
          </div>
          <p>
            Это просто сумма Римана: разбиваем [0, 1] на полоски, каждую полоску умножаем на θ и складываем.
            Вот пример для <K m="\text{Beta}(3, 7)" />:
          </p>
        </div>

        <button onClick={startAnimation}
          className="px-4 py-2 bg-accent text-white rounded-lg hover:opacity-90 transition-opacity mb-4 w-full sm:w-auto">
          Показать по полоскам
        </button>

        <div ref={integralRef} className="w-full">
          {integralW > 0 && (
            <canvas ref={integralCanvasRef} style={{ width: integralW, height: INTEGRAL_H }}
              className="rounded-lg block border border-border" />
          )}
        </div>

        <p className="text-text-dim text-sm mt-3">
          Каждая полоска: высота = <K m="p(\theta|\text{data})" />, ширина = <K m="d\theta" />,
          и мы умножаем на <K m="\theta" />. Сумма всех полосок = интеграл = posterior среднее.
          Для <K m="\text{Beta}(3,7)" />: <K m="E[\theta] = 3/(3+7) = 0.3" />.
        </p>
      </div>

      {/* Section: Model Averaging */}
      <div className="bg-card rounded-2xl p-6 border border-border">
        <h2 className="text-xl font-bold text-accent mb-4">Усреднение моделей — зачем нужен posterior</h2>
        <div className="space-y-3 text-text leading-relaxed mb-4">
          <p>
            Представь: ты выбрал <K m="\theta = 0.6" /> (MAP) и подставил в модель <K m="f(\theta)" />.
            Но что если <K m="f" /> резко скачет именно в этой точке? Ты получишь бред.
          </p>
          <p>
            <strong>Усреднение:</strong> вместо одной точки мы берём <strong>ВСЕ</strong> <K m="\theta" />,
            каждое с весом = posterior. Шпильки сглаживаются, результат стабильнее.
          </p>
          <div className="bg-bg rounded-xl p-4 text-center">
            <K m="E[f(\theta)|\text{данные}] = \int f(\theta) \cdot p(\theta|\text{данные}) \, d\theta" d />
          </div>
        </div>

        <div className="mb-4">
          <label className="text-sm text-text-dim block mb-1">Позиция шпильки = {spikePos.toFixed(2)}</label>
          <input type="range" min="0.1" max="0.9" step="0.01" value={spikePos}
            onChange={e => setSpikePos(+e.target.value)} className="w-full accent-accent" />
        </div>

        <div ref={avgRef} className="w-full">
          {avgW > 0 && (
            <canvas ref={avgCanvasRef} style={{ width: avgW, height: AVG_H }}
              className="rounded-lg block border border-border" />
          )}
        </div>

        <div className="mt-4 space-y-2 text-sm text-text-dim">
          <p>
            <span style={{ color: COLORS.map }}>■</span> Красная горизонталь — <K m="f(\theta_\text{MAP})" />: значение в одной точке (может попасть на шпильку).
          </p>
          <p>
            <span style={{ color: COLORS.mean }}>■</span> Жёлтая горизонталь — <K m="E[f(\theta)]" />: усреднение по posterior (стабильное).
          </p>
          <p>
            Двигай шпильку: MAP-оценка скачет, а среднее — почти не меняется.
          </p>
        </div>
      </div>

      {/* Section: Odds Calculator */}
      <div className="bg-card rounded-2xl p-6 border border-border">
        <h2 className="text-xl font-bold text-accent mb-4">Проверка гипотез через шансы</h2>
        <div className="space-y-3 text-text leading-relaxed mb-4">
          <p>
            Байесовский подход к проверке гипотез: вместо p-value считаем <strong>апостериорные шансы</strong>.
          </p>
          <div className="bg-bg rounded-xl p-4 text-center">
            <K m="\underbrace{\frac{P(H_1|d)}{P(H_0|d)}}_{\text{апост. шансы}} = \underbrace{\frac{P(H_1)}{P(H_0)}}_{\text{априор. шансы}} \times \underbrace{\frac{P(d|H_1)}{P(d|H_0)}}_{\text{отн. правдоподобий}}" d />
          </div>
        </div>

        <div className="mb-4">
          <button
            onClick={() => {
              setOddsPreset(true);
              setPH0(0.999); setPH1(0.001);
              setPDataH0(0.01); setPDataH1(0.99);
            }}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors mr-2 ${
              oddsPreset ? 'bg-accent text-white border-accent' : 'border-border text-text-dim hover:bg-bg'
            }`}>
            Пример: редкая болезнь
          </button>
          <button
            onClick={() => {
              setOddsPreset(false);
              setPH0(0.5); setPH1(0.5);
              setPDataH0(0.3); setPDataH1(0.7);
            }}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              !oddsPreset ? 'bg-accent text-white border-accent' : 'border-border text-text-dim hover:bg-bg'
            }`}>
            Свои значения
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-sm text-text-dim block mb-1">P(H₀) = {pH0.toFixed(4)}</label>
            <input type="range" min="0.001" max="0.999" step="0.001" value={pH0}
              onChange={e => { setPH0(+e.target.value); setPH1(1 - +e.target.value); }}
              className="w-full accent-accent" />
          </div>
          <div>
            <label className="text-sm text-text-dim block mb-1">P(H₁) = {pH1.toFixed(4)}</label>
            <input type="range" min="0.001" max="0.999" step="0.001" value={pH1}
              onChange={e => { setPH1(+e.target.value); setPH0(1 - +e.target.value); }}
              className="w-full accent-accent" />
          </div>
          <div>
            <label className="text-sm text-text-dim block mb-1">P(data|H₀) = {pDataH0.toFixed(3)}</label>
            <input type="range" min="0.001" max="0.999" step="0.001" value={pDataH0}
              onChange={e => setPDataH0(+e.target.value)} className="w-full accent-accent" />
          </div>
          <div>
            <label className="text-sm text-text-dim block mb-1">P(data|H₁) = {pDataH1.toFixed(3)}</label>
            <input type="range" min="0.001" max="0.999" step="0.001" value={pDataH1}
              onChange={e => setPDataH1(+e.target.value)} className="w-full accent-accent" />
          </div>
        </div>

        {/* Visual multiplication boxes */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 mb-4">
          <div className="bg-bg rounded-xl p-4 text-center min-w-[120px]">
            <div className="text-xs text-text-dim mb-1">Априорные шансы</div>
            <div className="text-lg font-bold text-text">
              {pH1 >= pH0
                ? `${(pH1 / pH0).toFixed(1)} : 1`
                : `1 : ${(pH0 / pH1).toFixed(0)}`}
            </div>
          </div>
          <div className="text-2xl font-bold text-text-dim">×</div>
          <div className="bg-bg rounded-xl p-4 text-center min-w-[120px]">
            <div className="text-xs text-text-dim mb-1">Отн. правдоподобий</div>
            <div className="text-lg font-bold text-text">
              {pDataH1 >= pDataH0
                ? `${(pDataH1 / pDataH0).toFixed(1)} : 1`
                : `1 : ${(pDataH0 / pDataH1).toFixed(1)}`}
            </div>
          </div>
          <div className="text-2xl font-bold text-text-dim">=</div>
          <div className="bg-bg rounded-xl p-4 text-center min-w-[120px] border-2 border-accent">
            <div className="text-xs text-text-dim mb-1">Апост. шансы</div>
            <div className="text-lg font-bold text-accent">
              {posteriorOdds >= 1
                ? `${posteriorOdds.toFixed(1)} : 1`
                : `1 : ${(1 / posteriorOdds).toFixed(1)}`}
            </div>
          </div>
        </div>

        <div className="bg-bg rounded-xl p-4 text-center">
          <div className="text-sm text-text-dim mb-1">Апостериорная вероятность P(H₁|data)</div>
          <div className="text-2xl font-bold text-accent">{(posteriorProb * 100).toFixed(1)}%</div>
        </div>

        {oddsPreset && (
          <div className="mt-4 text-sm text-text-dim space-y-1">
            <p>
              <strong>Пример:</strong> болезнь встречается у 1 из 1000 (P(болен) = 0.001).
              Тест: чувствительность 99%, ложноположительный 1%.
            </p>
            <p>
              Априорные шансы: <strong>1 : 999</strong> × отношение правдоподобий: <strong>99 : 1</strong> = апостериорные шансы: <strong>99 : 999 ≈ 1 : 10</strong>
            </p>
            <p>
              → <K m="P(\text{болен} | +) \approx 9\%" />. Даже при положительном тесте, вероятность болезни всего ~9%!
            </p>
          </div>
        )}
      </div>

      {/* Section C: MAP vs Mean */}
      <div className="bg-card rounded-2xl p-6 border border-border">
        <h2 className="text-xl font-bold text-accent mb-4">MAP vs Среднее: в чём разница?</h2>
        <div className="space-y-3 text-text leading-relaxed mb-4">
          <p>
            <strong style={{ color: COLORS.map }}>MAP</strong> (Maximum A Posteriori) — это <em>пик</em> распределения.
            Самое вероятное значение θ.
          </p>
          <p>
            <strong style={{ color: COLORS.mean }}>Среднее</strong> — это <em>центр масс</em> распределения.
            Взвешенное среднее всех θ.
          </p>
          <p>
            Для симметричных распределений они совпадают. Для асимметричных — нет!
            Попробуй потянуть α и β:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-sm text-text-dim block mb-1">α = {cAlpha.toFixed(1)}</label>
            <input type="range" min="1.1" max="20" step="0.1" value={cAlpha}
              onChange={e => setCAlpha(+e.target.value)} className="w-full accent-accent" />
          </div>
          <div>
            <label className="text-sm text-text-dim block mb-1">β = {cBeta.toFixed(1)}</label>
            <input type="range" min="1.1" max="20" step="0.1" value={cBeta}
              onChange={e => setCBeta(+e.target.value)} className="w-full accent-accent" />
          </div>
        </div>

        <div ref={compRef} className="w-full">
          {compW > 0 && (
            <canvas ref={compCanvasRef} style={{ width: compW, height: COMP_H }}
              className="rounded-lg block border border-border" />
          )}
        </div>

        <div className="mt-3 bg-bg rounded-xl p-4 text-sm space-y-1">
          <p><K m={`\\text{MAP} = \\frac{\\alpha-1}{\\alpha+\\beta-2} = ${betaMode(cAlpha, cBeta).toFixed(4)}`} /></p>
          <p><K m={`\\text{Mean} = \\frac{\\alpha}{\\alpha+\\beta} = ${betaMean(cAlpha, cBeta).toFixed(4)}`} /></p>
          <p className="text-text-dim">
            Разница: {Math.abs(betaMode(cAlpha, cBeta) - betaMean(cAlpha, cBeta)).toFixed(4)}.
            {Math.abs(cAlpha - cBeta) > 3 ? ' Чем асимметричнее распределение, тем больше разница.' : ' При симметричном распределении они почти совпадают.'}
          </p>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Sub-page 4: Credible interval
// ══════════════════════════════════════════════════════════════

function CredibleIntervalPage() {
  const [confLevel, setConfLevel] = useState(0.95);
  const [ciAlpha, setCiAlpha] = useState(5);
  const [ciBeta, setCiBeta] = useState(15);
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const w = useCanvasSize(containerRef);
  const H = 350;

  // n comparison
  const compRef = useRef(null);
  const compCanvasRef = useRef(null);
  const compW = useCanvasSize(compRef);
  const COMP_H = 300;
  const [compN, setCompN] = useState(20);

  const levels = [
    { value: 0.5, label: '50%' },
    { value: 0.8, label: '80%' },
    { value: 0.9, label: '90%' },
    { value: 0.95, label: '95%' },
    { value: 0.99, label: '99%' },
  ];

  useEffect(() => {
    if (!w) return;
    const ctx = setupCanvas(canvasRef, w, H);
    if (!ctx) return;
    const pad = { l: 45, r: 20, t: 25, b: 35 };
    ctx.clearRect(0, 0, w, H);
    drawAxes(ctx, w, H, pad);

    const fn = x => betaPDF(x, ciAlpha, ciBeta);
    let maxY = 0;
    for (let i = 0; i <= 400; i++) { const v = fn(i / 400); if (v > maxY) maxY = v; }

    const tail = (1 - confLevel) / 2;
    const lo = betaQuantile(tail, ciAlpha, ciBeta);
    const hi = betaQuantile(1 - tail, ciAlpha, ciBeta);

    drawShadedRegion(ctx, w, H, pad, fn, maxY, lo, hi, COLORS.credible);
    drawCurveScaled(ctx, w, H, pad, fn, COLORS.posterior, maxY, 3, []);
    drawVerticalLine(ctx, w, H, pad, lo, COLORS.posterior, lo.toFixed(3), 'left');
    drawVerticalLine(ctx, w, H, pad, hi, COLORS.posterior, hi.toFixed(3), 'right');

    // Width annotation
    ctx.fillStyle = COLORS.text;
    ctx.font = '13px Fira Sans, sans-serif';
    ctx.textAlign = 'center';
    const pw = w - pad.l - pad.r;
    const midPx = pad.l + ((lo + hi) / 2) * pw;
    ctx.fillText(`${(confLevel * 100).toFixed(0)}% интервал: [${lo.toFixed(3)}, ${hi.toFixed(3)}]`, midPx, pad.t + 14);
    ctx.fillText(`Ширина: ${(hi - lo).toFixed(3)}`, midPx, pad.t + 30);

  }, [w, confLevel, ciAlpha, ciBeta]);

  // N comparison canvas
  useEffect(() => {
    if (!compW) return;
    const ctx = setupCanvas(compCanvasRef, compW, COMP_H);
    if (!ctx) return;
    const pad = { l: 45, r: 20, t: 25, b: 35 };
    ctx.clearRect(0, 0, compW, COMP_H);
    drawAxes(ctx, compW, COMP_H, pad);

    // Simulate: prior Beta(1,1), observe k out of n with θ=0.3
    const theta = 0.3;
    const k5 = Math.round(5 * theta);
    const k_n = Math.round(compN * theta);

    const fn5 = x => betaPDF(x, 1 + k5, 1 + 5 - k5);
    const fnN = x => betaPDF(x, 1 + k_n, 1 + compN - k_n);

    let maxY = 0;
    for (let i = 0; i <= 400; i++) {
      const x = i / 400;
      const v5 = fn5(x), vn = fnN(x);
      if (v5 > maxY) maxY = v5;
      if (vn > maxY) maxY = vn;
    }

    drawCurveScaled(ctx, compW, COMP_H, pad, fn5, '#aaa', maxY, 2, [6, 4]);
    drawCurveScaled(ctx, compW, COMP_H, pad, fnN, COLORS.posterior, maxY, 3, []);

    // 95% intervals
    const lo5 = betaQuantile(0.025, 1 + k5, 1 + 5 - k5);
    const hi5 = betaQuantile(0.975, 1 + k5, 1 + 5 - k5);
    const loN = betaQuantile(0.025, 1 + k_n, 1 + compN - k_n);
    const hiN = betaQuantile(0.975, 1 + k_n, 1 + compN - k_n);

    drawShadedRegion(ctx, compW, COMP_H, pad, fnN, maxY, loN, hiN, COLORS.credible);

    // Legend
    ctx.font = '11px Fira Sans, sans-serif';
    ctx.fillStyle = '#aaa'; ctx.textAlign = 'left';
    ctx.fillText(`n=5: интервал [${lo5.toFixed(2)}, ${hi5.toFixed(2)}], ширина ${(hi5 - lo5).toFixed(2)}`, pad.l + 5, pad.t + 14);
    ctx.fillStyle = COLORS.posterior;
    ctx.fillText(`n=${compN}: интервал [${loN.toFixed(2)}, ${hiN.toFixed(2)}], ширина ${(hiN - loN).toFixed(2)}`, pad.l + 5, pad.t + 30);

  }, [compW, compN]);

  return (
    <div className="space-y-8">
      {/* Section A: What is credible interval */}
      <div className="bg-card rounded-2xl p-6 border border-border">
        <h2 className="text-xl font-bold text-accent mb-4">Достоверный интервал</h2>
        <p className="text-text-dim mb-4">
          Достоверный интервал (credible interval) — это диапазон значений θ, в котором
          лежит заданная доля апостериорной вероятности.
          Если мы закрасим {(confLevel * 100).toFixed(0)}% площади под posterior — получим интервал.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-sm text-text-dim block mb-1">α = {ciAlpha.toFixed(1)}</label>
            <input type="range" min="0.5" max="20" step="0.1" value={ciAlpha}
              onChange={e => setCiAlpha(+e.target.value)} className="w-full accent-accent" />
          </div>
          <div>
            <label className="text-sm text-text-dim block mb-1">β = {ciBeta.toFixed(1)}</label>
            <input type="range" min="0.5" max="20" step="0.1" value={ciBeta}
              onChange={e => setCiBeta(+e.target.value)} className="w-full accent-accent" />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {levels.map(l => (
            <button key={l.value}
              onClick={() => setConfLevel(l.value)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                confLevel === l.value
                  ? 'bg-accent text-white border-accent'
                  : 'border-border text-text-dim hover:bg-bg'
              }`}>
              {l.label}
            </button>
          ))}
        </div>

        <div ref={containerRef} className="w-full">
          {w > 0 && (
            <canvas ref={canvasRef} style={{ width: w, height: H }}
              className="rounded-lg block border border-border" />
          )}
        </div>
      </div>

      {/* N comparison */}
      <div className="bg-card rounded-2xl p-6 border border-border">
        <h2 className="text-xl font-bold text-accent mb-4">Больше данных — уже интервал</h2>
        <p className="text-text-dim mb-4">
          Серый пунктир — posterior после 5 наблюдений. Терракотовая кривая — после n наблюдений.
          Истинное θ = 0.3. Попробуй увеличить n:
        </p>

        <div className="mb-4">
          <label className="text-sm text-text-dim block mb-1">n = {compN}</label>
          <input type="range" min="5" max="200" step="1" value={compN}
            onChange={e => setCompN(+e.target.value)} className="w-full accent-accent" />
        </div>

        <div ref={compRef} className="w-full">
          {compW > 0 && (
            <canvas ref={compCanvasRef} style={{ width: compW, height: COMP_H }}
              className="rounded-lg block border border-border" />
          )}
        </div>
      </div>

      {/* Section B: Credible vs Confidence */}
      <div className="bg-card rounded-2xl p-6 border border-border">
        <h2 className="text-xl font-bold text-accent mb-4">Достоверный vs доверительный интервал</h2>
        <div className="space-y-4 text-text leading-relaxed">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-bg rounded-xl p-4">
              <h3 className="font-bold text-accent mb-2">Байесовский (credible)</h3>
              <p className="text-sm">
                «θ лежит в этом интервале с вероятностью 95%»
              </p>
              <p className="text-xs text-text-dim mt-2">
                Буквальная интерпретация. θ — случайная величина, интервал фиксирован.
                Это то, что обычно хотят люди.
              </p>
            </div>
            <div className="bg-bg rounded-xl p-4">
              <h3 className="font-bold text-accent mb-2">Частотный (confidence)</h3>
              <p className="text-sm">
                «Если повторить эксперимент 100 раз, ~95 интервалов накроют θ»
              </p>
              <p className="text-xs text-text-dim mt-2">
                Непрямая интерпретация. θ — фиксировано, интервал — случайный.
                Конкретный интервал либо содержит θ, либо нет — нельзя сказать «с вероятностью 95%».
              </p>
            </div>
          </div>
          <p className="text-text-dim text-sm">
            На практике при больших выборках оба интервала почти совпадают.
            Но байесовский проще интерпретировать и он работает с маленькими выборками через prior.
          </p>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════
// Sub-page 5: History — loaded from MD file via Gemini
// ══════════════════════════════════════════════════════════════
function HistoryPage() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const base = import.meta.env.BASE_URL || '/';
    fetch(`${base}bayesian-history.md`)
      .then(r => r.ok ? r.text() : Promise.reject('not found'))
      .then(text => { setContent(text); setLoading(false); })
      .catch(() => { setContent('Не удалось загрузить статью.'); setLoading(false); });
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-0 pb-12">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-accent mb-2">
          История и контекст байесовской статистики
        </h1>
        <p className="text-text-dim text-sm">
          Откуда взялся Байес, зачем это нужно, и чем отличается от частотного подхода.
          Текст сгенерирован Gemini 3.1 Pro.
        </p>
      </div>
      {loading ? (
        <div className="text-text-dim text-center py-12">Загрузка...</div>
      ) : (
        <article className="bg-card rounded-2xl p-6 border border-border prose prose-sm max-w-none
          prose-headings:text-accent prose-strong:text-text prose-a:text-accent
          prose-li:text-text prose-p:text-text prose-p:leading-relaxed">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </article>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MLE vs MAP page
// ══════════════════════════════════════════════════════════════

function likelihood(theta, k, n) {
  if (theta <= 0 || theta >= 1) return 0;
  return Math.pow(theta, k) * Math.pow(1 - theta, n - k);
}

function MLEvsMapPage() {
  // ── Section 2: Interactive coin comparison ──
  const [heads, setHeads] = useState(0);
  const [tails, setTails] = useState(0);
  const [priorStrength, setPriorStrength] = useState(3);
  const trueTheta = 0.6;

  const total = heads + tails;
  const mle = total > 0 ? heads / total : 0.5;
  const postAlpha = priorStrength + heads;
  const postBeta = priorStrength + tails;
  const mapVal = postAlpha > 1 && postBeta > 1
    ? (postAlpha - 1) / (postAlpha + postBeta - 2)
    : postAlpha / (postAlpha + postBeta);
  const postMean = postAlpha / (postAlpha + postBeta);

  const flipCoin = () => {
    if (Math.random() < trueTheta) setHeads(h => h + 1);
    else setTails(t => t + 1);
  };
  const resetCoins = () => { setHeads(0); setTails(0); };

  // Canvas refs for section 2
  const mleContainerRef = useRef(null);
  const mleCanvasRef = useRef(null);
  const mleW = useCanvasSize(mleContainerRef);

  const mapContainerRef = useRef(null);
  const mapCanvasRef = useRef(null);
  const mapW = useCanvasSize(mapContainerRef);

  const H2 = 260;

  // Draw MLE canvas
  useEffect(() => {
    if (mleW === 0) return;
    const ctx = setupCanvas(mleCanvasRef, mleW, H2);
    if (!ctx) return;
    const pad = { t: 20, r: 15, b: 32, l: 40 };
    ctx.clearRect(0, 0, mleW, H2);
    drawAxes(ctx, mleW, H2, pad, 'θ', 'L(θ)');

    if (total > 0) {
      const maxY = drawCurve(ctx, mleW, H2, pad, x => likelihood(x, heads, total), COLORS.likelihood, 2.5);
      // MLE vertical line
      if (maxY > 0) {
        const px = pad.l + mle * (mleW - pad.l - pad.r);
        ctx.save();
        ctx.strokeStyle = COLORS.map;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(px, pad.t);
        ctx.lineTo(px, H2 - pad.b);
        ctx.stroke();
        ctx.restore();
        ctx.fillStyle = COLORS.map;
        ctx.font = 'bold 12px Fira Sans, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`MLE = ${mle.toFixed(3)}`, px, pad.t - 4);
      }
    } else {
      ctx.fillStyle = COLORS.textDim;
      ctx.font = '13px Fira Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Подбросьте монетку', mleW / 2, H2 / 2);
    }
  }, [mleW, heads, tails, total, mle]);

  // Draw MAP canvas
  useEffect(() => {
    if (mapW === 0) return;
    const ctx = setupCanvas(mapCanvasRef, mapW, H2);
    if (!ctx) return;
    const pad = { t: 20, r: 15, b: 32, l: 40 };
    ctx.clearRect(0, 0, mapW, H2);
    drawAxes(ctx, mapW, H2, pad, 'θ', 'p(θ|d)');

    // find global max for scaling all three curves together
    const steps = 300;
    let gMax = 0;
    for (let i = 0; i <= steps; i++) {
      const x = i / steps;
      const pv = betaPDF(x, priorStrength, priorStrength);
      const lv = total > 0 ? likelihood(x, heads, total) : 0;
      const postV = betaPDF(x, postAlpha, postBeta);
      if (isFinite(pv) && pv > gMax) gMax = pv;
      if (isFinite(lv) && lv > gMax) gMax = lv;
      if (isFinite(postV) && postV > gMax) gMax = postV;
    }
    if (gMax === 0) gMax = 1;

    // Prior (gray dashed)
    drawCurveScaled(ctx, mapW, H2, pad, x => betaPDF(x, priorStrength, priorStrength), '#999', gMax, 1.5, [5, 4]);
    // Likelihood (light blue)
    if (total > 0) {
      drawCurveScaled(ctx, mapW, H2, pad, x => likelihood(x, heads, total), COLORS.likelihood, gMax, 1.5);
    }
    // Posterior (bold terracotta)
    drawCurveScaled(ctx, mapW, H2, pad, x => betaPDF(x, postAlpha, postBeta), COLORS.posterior, gMax, 3);

    // MAP vertical line
    const pw = mapW - pad.l - pad.r;
    const ph = H2 - pad.t - pad.b;
    const mapPx = pad.l + mapVal * pw;
    ctx.save();
    ctx.strokeStyle = COLORS.map;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(mapPx, pad.t);
    ctx.lineTo(mapPx, H2 - pad.b);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = COLORS.map;
    ctx.font = 'bold 11px Fira Sans, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`MAP = ${mapVal.toFixed(3)}`, mapPx, pad.t - 4);

    // Posterior mean vertical line
    const meanPx = pad.l + postMean * pw;
    ctx.save();
    ctx.strokeStyle = COLORS.mean;
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(meanPx, pad.t + 10);
    ctx.lineTo(meanPx, H2 - pad.b);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = COLORS.mean;
    ctx.font = '11px Fira Sans, sans-serif';
    ctx.textAlign = 'center';
    const meanLabelY = pad.t + 22;
    ctx.fillText(`Mean = ${postMean.toFixed(3)}`, meanPx, meanLabelY > pad.t ? meanLabelY : pad.t + 22);
  }, [mapW, heads, tails, total, priorStrength, postAlpha, postBeta, mapVal, postMean]);

  // ── Section 3: Convergence chart ──
  const [flipSeq, setFlipSeq] = useState(() => Array.from({ length: 100 }, () => Math.random() < 0.6 ? 1 : 0));
  const convContainerRef = useRef(null);
  const convCanvasRef = useRef(null);
  const convW = useCanvasSize(convContainerRef);
  const H3 = 300;

  const regenerateFlips = useCallback(() => {
    setFlipSeq(Array.from({ length: 100 }, () => Math.random() < trueTheta ? 1 : 0));
  }, []);

  useEffect(() => {
    if (convW === 0) return;
    const ctx = setupCanvas(convCanvasRef, convW, H3);
    if (!ctx) return;
    const pad = { t: 25, r: 15, b: 35, l: 50 };
    ctx.clearRect(0, 0, convW, H3);

    const pw = convW - pad.l - pad.r;
    const ph = H3 - pad.t - pad.b;

    // Axes
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.l, H3 - pad.b);
    ctx.lineTo(convW - pad.r, H3 - pad.b);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pad.l, pad.t);
    ctx.lineTo(pad.l, H3 - pad.b);
    ctx.stroke();

    // X ticks
    ctx.fillStyle = COLORS.textDim;
    ctx.font = '11px Fira Sans, sans-serif';
    ctx.textAlign = 'center';
    for (const v of [1, 20, 40, 60, 80, 100]) {
      const x = pad.l + ((v - 1) / 99) * pw;
      ctx.fillText(v.toString(), x, H3 - pad.b + 16);
    }
    ctx.fillText('Количество бросков', (pad.l + convW - pad.r) / 2, H3 - 2);

    // Y ticks
    ctx.textAlign = 'right';
    for (const v of [0, 0.2, 0.4, 0.6, 0.8, 1.0]) {
      const y = H3 - pad.b - v * ph;
      ctx.fillText(v.toFixed(1), pad.l - 6, y + 4);
      if (v > 0 && v < 1) {
        ctx.strokeStyle = '#f0efe8';
        ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(convW - pad.r, y); ctx.stroke();
        ctx.strokeStyle = COLORS.grid;
      }
    }

    // True theta dashed line
    const trueY = H3 - pad.b - trueTheta * ph;
    ctx.save();
    ctx.strokeStyle = COLORS.textDim;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.moveTo(pad.l, trueY);
    ctx.lineTo(convW - pad.r, trueY);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = COLORS.textDim;
    ctx.font = '11px Fira Sans, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Истинное θ = ${trueTheta}`, convW - pad.r - 110, trueY - 6);

    // Compute cumulative estimates
    const alpha0 = priorStrength, beta0 = priorStrength;
    const mleArr = [], mapArr = [], meanArr = [];
    let cumH = 0;
    for (let i = 0; i < 100; i++) {
      cumH += flipSeq[i];
      const n = i + 1;
      const cumT = n - cumH;
      mleArr.push(cumH / n);
      const pa = alpha0 + cumH, pb = beta0 + cumT;
      mapArr.push(pa > 1 && pb > 1 ? (pa - 1) / (pa + pb - 2) : pa / (pa + pb));
      meanArr.push(pa / (pa + pb));
    }

    // Draw lines
    const drawLine = (arr, color, lw, dash = []) => {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = lw;
      ctx.setLineDash(dash);
      ctx.beginPath();
      for (let i = 0; i < 100; i++) {
        const x = pad.l + (i / 99) * pw;
        const y = H3 - pad.b - arr[i] * ph;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    };

    drawLine(mleArr, COLORS.map, 2);
    drawLine(mapArr, COLORS.posterior, 2.5);
    drawLine(meanArr, COLORS.mean, 2, [4, 3]);

    // Legend
    const lx = pad.l + 10, ly = pad.t + 8;
    const items = [
      { label: 'MLE', color: COLORS.map, dash: [] },
      { label: 'MAP', color: COLORS.posterior, dash: [] },
      { label: 'Post. mean', color: COLORS.mean, dash: [4, 3] },
    ];
    ctx.font = '12px Fira Sans, sans-serif';
    items.forEach((it, idx) => {
      const yy = ly + idx * 18;
      ctx.save();
      ctx.strokeStyle = it.color;
      ctx.lineWidth = 2;
      ctx.setLineDash(it.dash);
      ctx.beginPath(); ctx.moveTo(lx, yy); ctx.lineTo(lx + 24, yy); ctx.stroke();
      ctx.restore();
      ctx.fillStyle = COLORS.text;
      ctx.textAlign = 'left';
      ctx.fillText(it.label, lx + 30, yy + 4);
    });
  }, [convW, flipSeq, priorStrength]);

  // ── Section 4: Convergence slider ──
  const [convN, setConvN] = useState(10);
  const [convSeq] = useState(() => Array.from({ length: 500 }, () => Math.random() < 0.6 ? 1 : 0));
  const convLineContainerRef = useRef(null);
  const convLineCanvasRef = useRef(null);
  const convLineW = useCanvasSize(convLineContainerRef);
  const H4 = 100;

  useEffect(() => {
    if (convLineW === 0) return;
    const ctx = setupCanvas(convLineCanvasRef, convLineW, H4);
    if (!ctx) return;
    const pad = { t: 30, r: 20, b: 25, l: 20 };
    ctx.clearRect(0, 0, convLineW, H4);

    const pw = convLineW - pad.l - pad.r;
    const midY = H4 / 2 + 5;

    // Number line from 0 to 1
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pad.l, midY);
    ctx.lineTo(convLineW - pad.r, midY);
    ctx.stroke();

    ctx.fillStyle = COLORS.textDim;
    ctx.font = '11px Fira Sans, sans-serif';
    ctx.textAlign = 'center';
    for (const v of [0, 0.2, 0.4, 0.6, 0.8, 1.0]) {
      const x = pad.l + v * pw;
      ctx.beginPath(); ctx.moveTo(x, midY - 4); ctx.lineTo(x, midY + 4); ctx.stroke();
      ctx.fillText(v.toFixed(1), x, midY + 18);
    }

    // Compute estimates for convN flips
    let cumH = 0;
    for (let i = 0; i < convN; i++) cumH += convSeq[i];
    const cumT = convN - cumH;
    const mleEst = cumH / convN;
    const pa = priorStrength + cumH, pb = priorStrength + cumT;
    const mapEst = pa > 1 && pb > 1 ? (pa - 1) / (pa + pb - 2) : pa / (pa + pb);
    const meanEst = pa / (pa + pb);

    // True theta marker
    const trueX = pad.l + trueTheta * pw;
    ctx.fillStyle = COLORS.textDim;
    ctx.font = 'bold 12px Fira Sans, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`θ* = ${trueTheta}`, trueX, pad.t - 8);
    ctx.beginPath();
    ctx.moveTo(trueX, pad.t); ctx.lineTo(trueX - 5, pad.t - 4); ctx.lineTo(trueX + 5, pad.t - 4);
    ctx.closePath();
    ctx.fill();

    // Marker function
    const drawMarker = (val, color, label, yOff) => {
      const x = pad.l + Math.max(0, Math.min(1, val)) * pw;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, midY, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.font = 'bold 11px Fira Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${label} = ${val.toFixed(3)}`, x, midY + yOff);
    };

    drawMarker(mleEst, COLORS.map, 'MLE', -14);
    drawMarker(mapEst, COLORS.posterior, 'MAP', 34);
    drawMarker(meanEst, COLORS.mean, 'Mean', 46);

    // Gap line
    const gap = Math.abs(mleEst - mapEst);
    if (gap > 0.005) {
      const x1 = pad.l + Math.min(mleEst, mapEst) * pw;
      const x2 = pad.l + Math.max(mleEst, mapEst) * pw;
      ctx.save();
      ctx.strokeStyle = COLORS.textDim;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(x1, midY - 10);
      ctx.lineTo(x2, midY - 10);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = COLORS.textDim;
      ctx.font = '10px Fira Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Δ = ${gap.toFixed(3)}`, (x1 + x2) / 2, midY - 14);
    }
  }, [convLineW, convN, convSeq, priorStrength]);

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-0 pb-12 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-accent mb-2">
          MLE vs MAP: две философии оценки параметров
        </h1>
        <p className="text-text-dim text-sm">
          Частотный и байесовский подходы к одной и той же задаче.
        </p>
      </div>

      {/* Section 1: Two philosophies */}
      <section className="bg-card rounded-2xl p-6 border border-border space-y-4">
        <h2 className="text-xl font-bold text-text">Две философии оценки параметров</h2>
        <p className="text-text leading-relaxed">
          Предположим, мы подбросили монетку 3 раза и получили 3 орла. Какова вероятность орла{' '}
          <K m="\theta" />? Два подхода дают разные ответы:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="border border-border rounded-xl p-4 bg-bg">
            <h3 className="font-bold text-[#c0392b] mb-1">Частотный подход (MLE)</h3>
            <p className="text-sm text-text leading-relaxed mb-2">
              «При каких параметрах вероятность увидеть наши данные максимальна?»
            </p>
            <p className="text-sm text-text">
              Ответ: <K m={`\\hat{\\theta}_{MLE} = \\frac{k}{n} = \\frac{3}{3} = 1.0`} />
            </p>
            <p className="text-xs text-text-dim mt-1">
              Монетка всегда падает орлом? Серьёзно?
            </p>
          </div>
          <div className="border border-border rounded-xl p-4 bg-bg">
            <h3 className="font-bold text-accent mb-1">Байесовский подход (MAP)</h3>
            <p className="text-sm text-text leading-relaxed mb-2">
              «Каковы наиболее вероятные параметры с учётом данных И априорного знания?»
            </p>
            <p className="text-sm text-text">
              Ответ: <K m={`\\hat{\\theta}_{MAP} \\approx 0.65`} /> (при умеренном prior)
            </p>
            <p className="text-xs text-text-dim mt-1">
              Скорее всего монетка чуть смещена, но не безумно.
            </p>
          </div>
        </div>
        <p className="text-sm text-text-dim">
          Формально: MLE = <K m={`\\arg\\max_{\\theta} L(\\theta | d)`} />, а MAP = <K m={`\\arg\\max_{\\theta} p(\\theta) \\cdot L(\\theta | d)`} />, где <K m="p(\theta)" /> — априорное распределение.
        </p>
      </section>

      {/* Section 2: Interactive coin comparison */}
      <section className="bg-card rounded-2xl p-6 border border-border space-y-4">
        <h2 className="text-xl font-bold text-text">Интерактивное сравнение: монетка</h2>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={flipCoin}
            className="px-4 py-2 rounded-lg bg-accent text-white font-medium hover:opacity-90 w-full sm:w-auto">
            Подбросить монетку
          </button>
          <button onClick={resetCoins}
            className="px-4 py-2 rounded-lg border border-border text-text font-medium hover:bg-bg w-full sm:w-auto">
            Сбросить
          </button>
          <span className="text-sm text-text">
            Орёл: <strong>{heads}</strong>, Решка: <strong>{tails}</strong>, Всего: <strong>{total}</strong>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-text">
            Сила prior <K m={`\\alpha_0 = \\beta_0`} /> = <strong>{priorStrength}</strong>
          </label>
          <input type="range" min={1} max={20} step={1} value={priorStrength}
            onChange={e => setPriorStrength(Number(e.target.value))}
            className="flex-1 min-w-[120px] max-w-xs" />
        </div>

        {/* Two canvases side by side */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-bold text-[#c0392b] mb-2 text-center">Частотный (MLE)</h3>
            <div ref={mleContainerRef} className="w-full">
              {mleW > 0 && <canvas ref={mleCanvasRef} style={{ width: mleW, height: H2 }}
                className="rounded-lg block border border-border" />}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-bold text-accent mb-2 text-center">Байесовский (MAP)</h3>
            <div ref={mapContainerRef} className="w-full">
              {mapW > 0 && <canvas ref={mapCanvasRef} style={{ width: mapW, height: H2 }}
                className="rounded-lg block border border-border" />}
            </div>
          </div>
        </div>

        {/* Computed values */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-sm">
          <div className="bg-bg rounded-lg p-2 border border-border">
            <div className="text-text-dim">MLE</div>
            <div className="font-bold text-[#c0392b]">{total > 0 ? mle.toFixed(3) : '—'}</div>
          </div>
          <div className="bg-bg rounded-lg p-2 border border-border">
            <div className="text-text-dim">MAP</div>
            <div className="font-bold text-accent">{mapVal.toFixed(3)}</div>
          </div>
          <div className="bg-bg rounded-lg p-2 border border-border">
            <div className="text-text-dim">Post. Mean</div>
            <div className="font-bold text-[#b8860b]">{postMean.toFixed(3)}</div>
          </div>
          <div className="bg-bg rounded-lg p-2 border border-border">
            <div className="text-text-dim">Истинное θ</div>
            <div className="font-bold text-text">{trueTheta}</div>
          </div>
        </div>

        {/* Legend for MAP canvas */}
        <div className="flex flex-wrap gap-4 text-xs text-text-dim">
          <span><span className="inline-block w-4 h-0.5 bg-[#999] mr-1 align-middle" style={{ borderTop: '2px dashed #999' }} /> Prior</span>
          <span><span className="inline-block w-4 h-0.5 bg-[#6b9bd2] mr-1 align-middle" /> Likelihood</span>
          <span><span className="inline-block w-4 h-0.5 mr-1 align-middle" style={{ borderTop: '3px solid #da7756' }} /> Posterior</span>
        </div>
      </section>

      {/* Section 3: Small data behaviour */}
      <section className="bg-card rounded-2xl p-6 border border-border space-y-4">
        <h2 className="text-xl font-bold text-text">Что происходит при малом количестве данных</h2>
        <p className="text-sm text-text leading-relaxed">
          При малом числе бросков MLE «прыгает» — он полностью зависит от данных. Байесовские оценки (MAP и среднее) более стабильны благодаря prior.
        </p>
        <button onClick={regenerateFlips}
          className="px-4 py-2 rounded-lg bg-accent text-white font-medium hover:opacity-90 w-full sm:w-auto">
          Новый эксперимент
        </button>
        <div ref={convContainerRef} className="w-full">
          {convW > 0 && <canvas ref={convCanvasRef} style={{ width: convW, height: H3 }}
            className="rounded-lg block border border-border" />}
        </div>
      </section>

      {/* Section 4: When MLE and MAP converge */}
      <section className="bg-card rounded-2xl p-6 border border-border space-y-4">
        <h2 className="text-xl font-bold text-text">Когда MLE и MAP совпадают</h2>
        <p className="text-sm text-text leading-relaxed">
          С ростом данных (<K m="n \to \infty" />) влияние prior исчезает, и MLE ≈ MAP. Также при плоском prior (<K m={`\\alpha = \\beta = 1`} />) MAP = MLE всегда.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <label className="text-sm text-text">
            Количество бросков: <strong>{convN}</strong>
          </label>
          <input type="range" min={1} max={500} step={1} value={convN}
            onChange={e => setConvN(Number(e.target.value))}
            className="flex-1 min-w-[120px] max-w-sm" />
        </div>
        <div ref={convLineContainerRef} className="w-full">
          {convLineW > 0 && <canvas ref={convLineCanvasRef} style={{ width: convLineW, height: H4 }}
            className="rounded-lg block border border-border" />}
        </div>
        <p className="text-xs text-text-dim">
          Двигайте слайдер — при большом n точки MLE и MAP сливаются.
        </p>
      </section>

      {/* Section 5: Comparison table */}
      <section className="bg-card rounded-2xl p-6 border border-border space-y-4">
        <h2 className="text-xl font-bold text-text">Таблица сравнения</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="p-2 text-text-dim font-medium" />
                <th className="p-2 text-[#c0392b] font-bold">Частотный (MLE)</th>
                <th className="p-2 text-accent font-bold">Байесовский (MAP)</th>
                <th className="p-2 text-[#b8860b] font-bold">Байесовское среднее</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border">
                <td className="p-2 text-text-dim font-medium">Формула</td>
                <td className="p-2"><K m={`\\arg\\max L(\\theta)`} /></td>
                <td className="p-2"><K m={`\\arg\\max p(\\theta) \\cdot L(\\theta)`} /></td>
                <td className="p-2"><K m={`\\int \\theta \\cdot p(\\theta|d)\\,d\\theta`} /></td>
              </tr>
              <tr className="border-b border-border">
                <td className="p-2 text-text-dim font-medium">Prior нужен?</td>
                <td className="p-2 text-text">Нет</td>
                <td className="p-2 text-text">Да</td>
                <td className="p-2 text-text">Да</td>
              </tr>
              <tr className="border-b border-border">
                <td className="p-2 text-text-dim font-medium">Мало данных</td>
                <td className="p-2 text-text">Ненадёжен</td>
                <td className="p-2 text-text">Стабилен</td>
                <td className="p-2 text-text">Стабилен</td>
              </tr>
              <tr className="border-b border-border">
                <td className="p-2 text-text-dim font-medium">Много данных</td>
                <td className="p-2 text-text">Совпадают</td>
                <td className="p-2 text-text">Совпадают</td>
                <td className="p-2 text-text">Совпадают</td>
              </tr>
              <tr className="border-b border-border">
                <td className="p-2 text-text-dim font-medium">3/3 орла</td>
                <td className="p-2"><K m={`\\theta = 1.0`} /></td>
                <td className="p-2"><K m={`\\theta \\approx 0.65`} /></td>
                <td className="p-2"><K m={`\\theta \\approx 0.57`} /></td>
              </tr>
              <tr>
                <td className="p-2 text-text-dim font-medium">Аналогия</td>
                <td className="p-2 text-text">«Верю только данным»</td>
                <td className="p-2 text-text">«Данные + здравый смысл»</td>
                <td className="p-2 text-text">«Средневзвешенное мнение»</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 6: Regularization = hidden prior */}
      <section className="bg-card rounded-2xl p-6 border border-border space-y-4">
        <h2 className="text-xl font-bold text-text">Регуляризация = скрытый prior</h2>
        <p className="text-text leading-relaxed">
          В машинном обучении байесовский подход прячется внутри хорошо знакомых техник:
        </p>
        <ul className="list-disc list-inside space-y-2 text-text text-sm">
          <li>
            <strong>L2-регуляризация (Ridge)</strong> — эквивалентна гауссовскому prior на веса:
            <K m={`\\; p(w) = \\mathcal{N}(0, \\sigma^2)`} />.
            Штраф <K m={`\\lambda \\|w\\|^2`} /> = отрицательный лог-prior.
          </li>
          <li>
            <strong>L1-регуляризация (Lasso)</strong> — эквивалентна prior Лапласа:
            <K m={`\\; p(w) = \\text{Laplace}(0, b)`} />.
            Поощряет разреженные веса (обнуляет ненужные).
          </li>
          <li>
            <strong>Dropout</strong> — приближённый байесовский вывод.
            Каждая маска dropout ≈ семплирование из posterior по архитектурам.
          </li>
        </ul>
        <div className="bg-bg rounded-xl p-4 border border-border">
          <p className="text-sm text-text font-medium">
            Каждый раз когда ты добавляешь регуляризацию — ты неявно используешь Байеса.
          </p>
          <p className="text-xs text-text-dim mt-1">
            Формально: минимизация <K m={`-\\log L(\\theta) + \\lambda R(\\theta)`} /> = максимизация <K m={`\\log p(d|\\theta) + \\log p(\\theta)`} /> = MAP.
          </p>
        </div>
      </section>

      {/* Integrated article with visualizations inline */}
      <IntegratedArticle />
    </div>
  );
}

// ── Integrated article: markdown sections interleaved with vizualizations ──
function IntegratedArticle() {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const base = import.meta.env.BASE_URL || '/';
    fetch(`${base}mle-map-mean.md`)
      .then(r => r.ok ? r.text() : '')
      .then(text => {
        // Split by ## headers (keep headers with their content)
        const parts = text.split(/(?=^## )/m).filter(s => s.trim());
        setSections(parts);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-text-dim text-center py-8">Загрузка статьи...</div>;
  if (!sections.length) return null;

  // Map section indices to visualizations
  // sections[0] = Введение, [1] = MLE, [2] = MAP, [3] = Posterior Mean, [4] = Связи, [5] = Таблица
  return (
    <>
      {sections.map((sec, i) => (
        <div key={i}>
          {/* Article section */}
          <section className="bg-card rounded-2xl p-6 border border-border">
            <article className="prose prose-sm max-w-none prose-headings:text-accent prose-strong:text-text prose-p:text-text prose-p:leading-relaxed prose-li:text-text prose-table:text-sm">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{sec}</ReactMarkdown>
            </article>
          </section>

          {/* Insert visualization AFTER the relevant section */}
          {i === 1 && (
            <section className="bg-card rounded-2xl p-6 border border-border border-accent/30">
              <h3 className="text-lg font-bold text-accent mb-3">Визуализация: Likelihood и MLE</h3>
              <p className="text-text-dim text-sm mb-4">
                Двигайте слайдер — при малом n MLE скачет дико. Синяя кривая — likelihood, красная линия — MLE (пик).
              </p>
              <AllThreeSection />
            </section>
          )}

          {i === 2 && (
            <section className="bg-card rounded-2xl p-6 border border-border border-accent/30">
              <h3 className="text-lg font-bold text-accent mb-3">Визуализация: MAP vs Posterior Mean</h3>
              <p className="text-text-dim text-sm mb-4">
                Попробуйте скошенные пресеты — увидите как MAP (пик) и Mean (центр тяжести) расходятся.
              </p>
              <MapVsMeanSection />
            </section>
          )}

          {i === 4 && (
            <section className="bg-card rounded-2xl p-6 border border-border border-accent/30">
              <h3 className="text-lg font-bold text-accent mb-3">Визуализация: Все три оценки сходятся</h3>
              <p className="text-text-dim text-sm mb-4">
                При n=1 оценки сильно расходятся. При n=100 — почти совпадают. Именно об этом секция выше.
              </p>
              <AllThreeSection />
            </section>
          )}
        </div>
      ))}
    </>
  );
}

// ── Section 7 component: MAP vs Posterior Mean ──
function MapVsMeanSection() {
  const [alpha, setAlpha] = useState(3);
  const [beta_, setBeta] = useState(10);

  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const w = useCanvasSize(containerRef);
  const H = 300;

  const mode = alpha > 1 && beta_ > 1 ? (alpha - 1) / (alpha + beta_ - 2) : null;
  const mean = alpha / (alpha + beta_);

  useEffect(() => {
    if (w === 0) return;
    const ctx = setupCanvas(canvasRef, w, H);
    if (!ctx) return;
    const pad = { t: 30, r: 15, b: 32, l: 40 };
    ctx.clearRect(0, 0, w, H);
    drawAxes(ctx, w, H, pad, 'θ', 'p(θ)');

    const fn = x => betaPDF(x, alpha, beta_);
    // find max for scaling
    const pw = w - pad.l - pad.r;
    const ph = H - pad.t - pad.b;
    const steps = Math.min(pw, 400);
    let maxY = 0;
    const vals = [];
    for (let i = 0; i <= steps; i++) {
      const x = i / steps;
      const y = fn(x);
      vals.push(y);
      if (isFinite(y) && y > maxY) maxY = y;
    }

    if (maxY > 0 && mode !== null) {
      // Shade area between MAP and Mean
      const xLeft = Math.min(mode, mean);
      const xRight = Math.max(mode, mean);
      ctx.save();
      ctx.fillStyle = 'rgba(184,134,11,0.15)';
      ctx.beginPath();
      const iStart = Math.floor(xLeft * steps);
      const iEnd = Math.ceil(xRight * steps);
      const baseY = H - pad.b;
      ctx.moveTo(pad.l + (iStart / steps) * pw, baseY);
      for (let i = iStart; i <= iEnd; i++) {
        const px = pad.l + (i / steps) * pw;
        const py = H - pad.b - (vals[i] / maxY) * ph * 0.92;
        ctx.lineTo(px, py);
      }
      ctx.lineTo(pad.l + (iEnd / steps) * pw, baseY);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Draw curve
    drawCurve(ctx, w, H, pad, fn, COLORS.posterior, 3);

    // Vertical lines
    if (mode !== null) {
      drawVerticalLine(ctx, w, H, pad, mode, COLORS.map, `MAP = ${mode.toFixed(3)}`, 'left');
    }
    drawVerticalLine(ctx, w, H, pad, mean, COLORS.mean, `Mean = ${mean.toFixed(3)}`, 'right');
  }, [w, alpha, beta_]);

  const presets = [
    { label: 'Симметричное Beta(10,10)', a: 10, b: 10 },
    { label: 'Скошенное Beta(3,10)', a: 3, b: 10 },
    { label: 'Сильно скошенное Beta(2,20)', a: 2, b: 20 },
  ];

  return (
    <section className="bg-card rounded-2xl p-6 border border-border space-y-4">
      <h2 className="text-xl font-bold text-text">MAP vs Posterior Mean — в чём разница?</h2>

      <div className="flex flex-wrap gap-2">
        {presets.map(p => (
          <button key={p.label} onClick={() => { setAlpha(p.a); setBeta(p.b); }}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-bg border border-border hover:border-accent hover:text-accent transition-colors">
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex items-center gap-3 text-sm text-text">
          <span className="w-16 shrink-0">α = {alpha}</span>
          <input type="range" min={1} max={30} value={alpha}
            onChange={e => setAlpha(+e.target.value)}
            className="flex-1 accent-accent" />
        </label>
        <label className="flex items-center gap-3 text-sm text-text">
          <span className="w-16 shrink-0">β = {beta_}</span>
          <input type="range" min={1} max={30} value={beta_}
            onChange={e => setBeta(+e.target.value)}
            className="flex-1 accent-accent" />
        </label>
      </div>

      <div ref={containerRef} className="w-full">
        <canvas ref={canvasRef} style={{ width: '100%', height: H }} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div className="bg-bg rounded-xl p-3 border border-border">
          <span className="font-bold" style={{ color: COLORS.map }}>MAP (mode)</span>
          <span className="ml-2 text-text">{mode !== null ? mode.toFixed(4) : '—'}</span>
        </div>
        <div className="bg-bg rounded-xl p-3 border border-border">
          <span className="font-bold" style={{ color: COLORS.mean }}>Mean</span>
          <span className="ml-2 text-text">{mean.toFixed(4)}</span>
        </div>
      </div>

      <div className="bg-bg rounded-xl p-4 border border-border text-sm text-text leading-relaxed space-y-2">
        <p><strong style={{ color: COLORS.map }}>MAP</strong> — вершина горки (самое вероятное значение).</p>
        <p><strong style={{ color: COLORS.mean }}>Mean</strong> — центр тяжести горки (средневзвешенное).</p>
        <p>Для симметричных распределений они совпадают.
          Для скошенных — отличаются: длинный хвост тянет Mean в свою сторону,
          а MAP остаётся на пике.</p>
      </div>
    </section>
  );
}

// ── Section 8 component: All three estimates ──
function AllThreeSection() {
  const [n, setN] = useState(5);
  const priorA = 3, priorB = 3;
  const trueTheta = 0.6;

  // Deterministic "random" flips using seed
  const k = useMemo(() => {
    let heads = 0;
    let seed = 42;
    for (let i = 0; i < n; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      if ((seed / 0x7fffffff) < trueTheta) heads++;
    }
    return heads;
  }, [n]);

  const mle = n > 0 ? k / n : 0.5;
  const mapVal = (k + priorA - 1) / (n + priorA + priorB - 2);
  const meanVal = (k + priorA) / (n + priorA + priorB);

  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const w = useCanvasSize(containerRef);
  const H = 320;

  useEffect(() => {
    if (w === 0) return;
    const ctx = setupCanvas(canvasRef, w, H);
    if (!ctx) return;
    const pad = { t: 30, r: 15, b: 32, l: 40 };
    ctx.clearRect(0, 0, w, H);
    drawAxes(ctx, w, H, pad, 'θ', 'плотность');

    const pw = w - pad.l - pad.r;
    const ph = H - pad.t - pad.b;
    const steps = Math.min(pw, 400);

    // Compute all curves and find global max
    const priorFn = x => betaPDF(x, priorA, priorB);
    const postA = priorA + k, postB = priorB + n - k;
    const posteriorFn = x => betaPDF(x, postA, postB);

    // Likelihood (unnormalized) — normalize for display
    const likVals = [];
    let likMax = 0;
    for (let i = 0; i <= steps; i++) {
      const x = i / steps;
      const v = likelihood(x, k, n);
      likVals.push(v);
      if (v > likMax) likMax = v;
    }

    // Find global max across prior and posterior
    let globalMax = 0;
    for (let i = 0; i <= steps; i++) {
      const x = i / steps;
      const pv = priorFn(x);
      const postV = posteriorFn(x);
      if (pv > globalMax) globalMax = pv;
      if (postV > globalMax) globalMax = postV;
    }
    // Scale likelihood to same visual range
    const likScale = likMax > 0 ? globalMax / likMax : 0;
    const scaledLik = x => {
      const idx = Math.round(x * steps);
      return (likVals[Math.min(idx, steps)] || 0) * likScale;
    };

    // Draw: prior (gray dashed), likelihood (blue), posterior (terracotta bold)
    drawCurveScaled(ctx, w, H, pad, priorFn, '#999', globalMax, 2, [6, 4]);
    if (n > 0) {
      drawCurveScaled(ctx, w, H, pad, scaledLik, COLORS.likelihood, globalMax, 2, []);
    }
    drawCurveScaled(ctx, w, H, pad, posteriorFn, COLORS.posterior, globalMax, 3, []);

    // Vertical lines: MLE, MAP, Mean
    if (n > 0) {
      drawVerticalLine(ctx, w, H, pad, mle, COLORS.map, `MLE = ${mle.toFixed(3)}`, 'left');
    }
    drawVerticalLine(ctx, w, H, pad, mapVal, COLORS.posterior, `MAP = ${mapVal.toFixed(3)}`, 'left');
    drawVerticalLine(ctx, w, H, pad, meanVal, COLORS.mean, `Mean = ${meanVal.toFixed(3)}`, 'right');

    // True theta line
    const truePx = pad.l + trueTheta * pw;
    ctx.save();
    ctx.strokeStyle = COLORS.prior;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(truePx, pad.t);
    ctx.lineTo(truePx, H - pad.b);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = COLORS.prior;
    ctx.font = '11px Fira Sans, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`θ* = ${trueTheta}`, truePx, H - pad.b + 28);
    ctx.restore();

    // Legend
    const lx = pad.l + 8, ly = pad.t + 6;
    ctx.font = '11px Fira Sans, sans-serif';
    ctx.setLineDash([6, 4]); ctx.strokeStyle = '#999'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + 22, ly); ctx.stroke();
    ctx.setLineDash([]); ctx.fillStyle = '#999'; ctx.fillText(`Prior Beta(${priorA},${priorB})`, lx + 26, ly + 4);

    if (n > 0) {
      ctx.strokeStyle = COLORS.likelihood; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(lx, ly + 16); ctx.lineTo(lx + 22, ly + 16); ctx.stroke();
      ctx.fillStyle = COLORS.likelihood; ctx.fillText('Likelihood', lx + 26, ly + 20);
    }

    ctx.strokeStyle = COLORS.posterior; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(lx, ly + 32); ctx.lineTo(lx + 22, ly + 32); ctx.stroke();
    ctx.fillStyle = COLORS.posterior; ctx.fillText(`Posterior Beta(${postA},${postB})`, lx + 26, ly + 36);
  }, [w, n, k]);

  return (
    <section className="bg-card rounded-2xl p-6 border border-border space-y-4">
      <h2 className="text-xl font-bold text-text">Визуальное сравнение MLE, MAP, Mean</h2>

      <p className="text-sm text-text-dim">
        Истинная монета: <K m={`\\theta^* = ${trueTheta}`} />. Prior: <K m={`\\text{Beta}(${priorA}, ${priorB})`} /> (мягкий, центрирован на 0.5).
      </p>

      <label className="flex items-center gap-3 text-sm text-text">
        <span className="w-32 shrink-0">Бросков: <strong>{n}</strong> (орлов: {k})</span>
        <input type="range" min={1} max={100} value={n}
          onChange={e => setN(+e.target.value)}
          className="flex-1 accent-accent" />
      </label>

      <div ref={containerRef} className="w-full">
        <canvas ref={canvasRef} style={{ width: '100%', height: H }} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        <div className="bg-bg rounded-xl p-3 border-l-4" style={{ borderColor: COLORS.map }}>
          <div className="font-bold" style={{ color: COLORS.map }}>MLE</div>
          <div className="text-text text-lg font-mono">{mle.toFixed(4)}</div>
          <div className="text-text-dim text-xs"><K m={`k/n = ${k}/${n}`} /></div>
        </div>
        <div className="bg-bg rounded-xl p-3 border-l-4" style={{ borderColor: COLORS.posterior }}>
          <div className="font-bold" style={{ color: COLORS.posterior }}>MAP</div>
          <div className="text-text text-lg font-mono">{mapVal.toFixed(4)}</div>
          <div className="text-text-dim text-xs"><K m={`(k+\\alpha-1)/(n+\\alpha+\\beta-2)`} /></div>
        </div>
        <div className="bg-bg rounded-xl p-3 border-l-4" style={{ borderColor: COLORS.mean }}>
          <div className="font-bold" style={{ color: COLORS.mean }}>Mean</div>
          <div className="text-text text-lg font-mono">{meanVal.toFixed(4)}</div>
          <div className="text-text-dim text-xs"><K m={`(k+\\alpha)/(n+\\alpha+\\beta)`} /></div>
        </div>
      </div>

      <div className="bg-bg rounded-xl p-4 border border-border text-sm text-text leading-relaxed">
        При <K m="n=1" />: MLE может быть 0 или 1 (безумие). MAP ≈ 0.5 (prior доминирует). Mean ≈ 0.5.
        При <K m="n=100" />: все три ≈ 0.6 (данные доминируют).
      </div>
    </section>
  );
}

// ── Section 9 component: Markdown article ──
// ══════════════════════════════════════════════════════════════
// Router
// ══════════════════════════════════════════════════════════════

export default function BayesianEstimation() {
  return (
    <Routes>
      <Route index element={<Navigate to="intuition" replace />} />
      <Route path="intuition" element={<IntuitionPage />} />
      <Route path="beta" element={<BetaPage />} />
      <Route path="posterior" element={<PosteriorPage />} />
      <Route path="credible-interval" element={<CredibleIntervalPage />} />
      <Route path="mle-vs-map" element={<MLEvsMapPage />} />
      <Route path="history" element={<HistoryPage />} />
    </Routes>
  );
}
