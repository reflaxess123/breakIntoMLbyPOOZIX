import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { K } from '../../components/Latex';

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
    </Routes>
  );
}
