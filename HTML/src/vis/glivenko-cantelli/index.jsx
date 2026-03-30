import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { K } from '../../components/Latex';

// ── Box-Muller: generate N(0,1) samples ──
function boxMuller(n, seed = 42) {
  let s = seed;
  const rand = () => { s = (s * 16807 + 1) % 2147483647; return s / 2147483647; };
  const out = [];
  for (let i = 0; i < n; i += 2) {
    const u1 = rand() || 1e-10;
    const u2 = rand();
    const r = Math.sqrt(-2 * Math.log(u1));
    out.push(r * Math.cos(2 * Math.PI * u2));
    if (i + 1 < n) out.push(r * Math.sin(2 * Math.PI * u2));
  }
  return out.slice(0, n);
}

// ── Seeded uniform random ──
function seededRand(seed) {
  let s = seed;
  return () => { s = (s * 16807 + 1) % 2147483647; return s / 2147483647; };
}

// ── Generate samples from a distribution ──
function generateSamples(dist, n, seed) {
  const rand = seededRand(seed);
  if (dist === 'normal') {
    const out = [];
    for (let i = 0; i < n; i += 2) {
      const u1 = rand() || 1e-10;
      const u2 = rand();
      const r = Math.sqrt(-2 * Math.log(u1));
      out.push(r * Math.cos(2 * Math.PI * u2));
      if (i + 1 < n) out.push(r * Math.sin(2 * Math.PI * u2));
    }
    return out.slice(0, n);
  }
  if (dist === 'uniform') {
    const out = [];
    for (let i = 0; i < n; i++) out.push(rand());
    return out;
  }
  if (dist === 'exponential') {
    const out = [];
    for (let i = 0; i < n; i++) out.push(-Math.log(rand() || 1e-10));
    return out;
  }
  return boxMuller(n, seed);
}

// ── CDF functions for distributions ──
function normalCDF(x) {
  // Abramowitz & Stegun 7.1.26 via erfc
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const z = Math.abs(x) / Math.SQRT2; // erfc approximation needs x/√2
  const t = 1 / (1 + p * z);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);
  return 0.5 * (1 + sign * y);
}

function uniformCDF(x) {
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function exponentialCDF(x) {
  if (x < 0) return 0;
  return 1 - Math.exp(-x);
}

function getCDF(dist) {
  if (dist === 'normal') return normalCDF;
  if (dist === 'uniform') return uniformCDF;
  if (dist === 'exponential') return exponentialCDF;
  return normalCDF;
}

// ── Empirical CDF from sorted array ──
function empiricalCDF(sorted, x) {
  let lo = 0, hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] < x) lo = mid + 1; else hi = mid;
  }
  return lo / sorted.length;
}

// ── Compute sup|F_n - F| ──
function supGap(sorted, cdfFn) {
  const fn = cdfFn || normalCDF;
  const n = sorted.length;
  let maxGap = 0, maxX = 0;
  for (let i = 0; i < n; i++) {
    const x = sorted[i];
    const fnBelow = i / n;
    const fnAt = (i + 1) / n;
    const fx = fn(x);
    const g1 = Math.abs(fnAt - fx);
    const g2 = Math.abs(fnBelow - fx);
    const g = Math.max(g1, g2);
    if (g > maxGap) { maxGap = g; maxX = x; }
  }
  return { gap: maxGap, x: maxX };
}

// ── Kolmogorov distribution CDF: K(x) = 1 - 2*sum((-1)^(k-1)*exp(-2k^2*x^2)) ──
function kolmogorovCDF(x) {
  if (x <= 0) return 0;
  let sum = 0;
  for (let k = 1; k <= 100; k++) {
    sum += Math.pow(-1, k - 1) * Math.exp(-2 * k * k * x * x);
  }
  return 1 - 2 * sum;
}

// ── Kolmogorov distribution PDF: k(x) = 8x * sum((-1)^(j+1) * j^2 * exp(-2j^2*x^2)) ──
function kolmogorovPDF(x) {
  if (x <= 0) return 0;
  let sum = 0;
  for (let j = 1; j <= 100; j++) {
    sum += Math.pow(-1, j + 1) * j * j * Math.exp(-2 * j * j * x * x);
  }
  return Math.max(0, 8 * x * sum); // clamp to 0 — series can be negative near 0
}

// ── Generate N(0,1) samples using Math.random (true random, no seed) ──
function randomNormal(n) {
  const out = [];
  for (let i = 0; i < n; i += 2) {
    const u1 = Math.random() || 1e-10;
    const u2 = Math.random();
    const r = Math.sqrt(-2 * Math.log(u1));
    out.push(r * Math.cos(2 * Math.PI * u2));
    if (i + 1 < n) out.push(r * Math.sin(2 * Math.PI * u2));
  }
  return out.slice(0, n);
}

// ── Responsive canvas hook ──
function useResponsiveCanvas(canvasRef, containerRef, height, drawFn, deps) {
  const [w, setW] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
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
    c.height = height * dpr;
    const ctx = c.getContext('2d');
    ctx.scale(dpr, dpr);
    drawFn(ctx, w, height);
  }, [w, ...deps]);

  return w;
}

// ═══════════════════════════════════════════════
// Section 1: What is the empirical CDF
// ═══════════════════════════════════════════════
function EmpiricalExplainer() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [dragX, setDragX] = useState(0.5); // 0..1 fraction

  const points = useMemo(() => [0.8, 1.5, 2.1, 3.0, 3.4, 4.2, 5.1, 6.0, 7.3, 8.5], []);
  const xMin = 0, xMax = 10;

  const drawFn = useCallback((ctx, W, H) => {
    const pad = { l: 40, r: 20, t: 30, b: 40 };
    const pw = W - pad.l - pad.r;
    const ph = H - pad.t - pad.b;

    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = '#faf9f5';
    ctx.fillRect(0, 0, W, H);

    const toCanvasX = (v) => pad.l + ((v - xMin) / (xMax - xMin)) * pw;
    const toCanvasY = (v) => pad.t + (1 - v) * ph;

    // Axes
    ctx.strokeStyle = '#e8e6dc';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.l, pad.t + ph);
    ctx.lineTo(pad.l + pw, pad.t + ph);
    ctx.stroke();

    // Y-axis labels
    ctx.fillStyle = '#6b6b66';
    ctx.font = '11px Fira Sans, system-ui';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let v = 0; v <= 1; v += 0.25) {
      const y = toCanvasY(v);
      ctx.fillText(v.toFixed(2), pad.l - 6, y);
      ctx.strokeStyle = '#e8e6dc';
      ctx.beginPath();
      ctx.moveTo(pad.l, y);
      ctx.lineTo(pad.l + pw, y);
      ctx.stroke();
    }

    // Draw points on number line
    ctx.fillStyle = '#1a1a19';
    for (const p of points) {
      const cx = toCanvasX(p);
      const cy = pad.t + ph;
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // X labels
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#6b6b66';
    ctx.font = '10px Fira Sans, system-ui';
    for (const p of points) {
      ctx.fillText(p.toFixed(1), toCanvasX(p), pad.t + ph + 8);
    }

    // Draw step function F*_n(x)
    const sorted = [...points].sort((a, b) => a - b);
    const n = sorted.length;
    ctx.strokeStyle = '#da7756';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    // Before first point
    ctx.moveTo(pad.l, toCanvasY(0));
    ctx.lineTo(toCanvasX(sorted[0]), toCanvasY(0));
    for (let i = 0; i < n; i++) {
      const yPrev = i / n;
      const yNext = (i + 1) / n;
      const cx = toCanvasX(sorted[i]);
      // Step up
      ctx.lineTo(cx, toCanvasY(yPrev));
      ctx.lineTo(cx, toCanvasY(yNext));
      // Horizontal to next point or end
      const nextX = i < n - 1 ? toCanvasX(sorted[i + 1]) : pad.l + pw;
      ctx.lineTo(nextX, toCanvasY(yNext));
    }
    ctx.stroke();

    // Drag line
    const xVal = xMin + dragX * (xMax - xMin);
    const lineX = toCanvasX(xVal);
    const fnVal = empiricalCDF(sorted, xVal);

    // Vertical dashed line
    ctx.strokeStyle = '#588157';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(lineX, pad.t);
    ctx.lineTo(lineX, pad.t + ph);
    ctx.stroke();
    ctx.setLineDash([]);

    // Dot at F_n(x)
    ctx.fillStyle = '#588157';
    ctx.beginPath();
    ctx.arc(lineX, toCanvasY(fnVal), 6, 0, Math.PI * 2);
    ctx.fill();

    // Label
    ctx.fillStyle = '#1a1a19';
    ctx.font = 'bold 13px Fira Sans, system-ui';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    const countBelow = sorted.filter(v => v < xVal).length;
    ctx.fillText(
      `x = ${xVal.toFixed(1)}  |  F*_n(x) = ${countBelow}/${n} = ${fnVal.toFixed(2)}`,
      pad.l + 8, pad.t + 20
    );

    // Hint text
    ctx.fillStyle = '#6b6b66';
    ctx.font = '11px Fira Sans, system-ui';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'center';
    ctx.fillText('← перетащите линию →', W / 2, pad.t + ph + 24);

    // Highlight points less than x
    ctx.fillStyle = '#588157';
    for (const p of sorted) {
      if (p < xVal) {
        ctx.beginPath();
        ctx.arc(toCanvasX(p), pad.t + ph, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [points, dragX]);

  const H = 280;
  const w = useResponsiveCanvas(canvasRef, containerRef, H, drawFn, [dragX]);

  const handlePointer = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const pad = 40;
    const pw = rect.width - pad - 20;
    const frac = Math.max(0, Math.min(1, (px - pad) / pw));
    setDragX(frac);
  }, []);

  return (
    <div ref={containerRef} className="w-full"
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); handlePointer(e); }}
      onPointerMove={(e) => { if (e.buttons > 0) handlePointer(e); }}
      style={{ touchAction: 'none' }}
    >
      {w > 0 && <canvas ref={canvasRef} style={{ width: w, height: H }} className="rounded-lg block border border-border cursor-ew-resize" />}
    </div>
  );
}

// ═══════════════════════════════════════════════
// Section 2: Main CDF comparison visualization
// ═══════════════════════════════════════════════
function CDFComparison() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [n, setN] = useState(50);
  const [seed, setSeed] = useState(1);

  const { sorted, gapInfo } = useMemo(() => {
    const samples = boxMuller(n, seed * 1000 + 7);
    const s = [...samples].sort((a, b) => a - b);
    return { sorted: s, gapInfo: supGap(s) };
  }, [n, seed]);

  const drawFn = useCallback((ctx, W, H) => {
    const pad = { l: 50, r: 20, t: 30, b: 40 };
    const pw = W - pad.l - pad.r;
    const ph = H - pad.t - pad.b;
    const xMin = -4, xMax = 4;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#faf9f5';
    ctx.fillRect(0, 0, W, H);

    const toX = (v) => pad.l + ((v - xMin) / (xMax - xMin)) * pw;
    const toY = (v) => pad.t + (1 - v) * ph;

    // Grid
    ctx.strokeStyle = '#e8e6dc';
    ctx.lineWidth = 0.5;
    for (let v = 0; v <= 1; v += 0.2) {
      ctx.beginPath();
      ctx.moveTo(pad.l, toY(v));
      ctx.lineTo(pad.l + pw, toY(v));
      ctx.stroke();
    }
    for (let v = xMin; v <= xMax; v += 1) {
      ctx.beginPath();
      ctx.moveTo(toX(v), pad.t);
      ctx.lineTo(toX(v), pad.t + ph);
      ctx.stroke();
    }

    // Axis labels
    ctx.fillStyle = '#6b6b66';
    ctx.font = '11px Fira Sans, system-ui';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let v = 0; v <= 1; v += 0.2) {
      ctx.fillText(v.toFixed(1), pad.l - 6, toY(v));
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let v = xMin; v <= xMax; v += 1) {
      ctx.fillText(v, toX(v), pad.t + ph + 6);
    }

    // True CDF: smooth green curve
    ctx.strokeStyle = '#588157';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let px = 0; px <= pw; px++) {
      const xv = xMin + (px / pw) * (xMax - xMin);
      const y = toY(normalCDF(xv));
      if (px === 0) ctx.moveTo(pad.l + px, y); else ctx.lineTo(pad.l + px, y);
    }
    ctx.stroke();

    // Empirical CDF: step function in terracotta
    const m = sorted.length;
    ctx.strokeStyle = '#da7756';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(toX(xMin), toY(0));
    ctx.lineTo(toX(sorted[0]), toY(0));
    for (let i = 0; i < m; i++) {
      const yPrev = i / m;
      const yNext = (i + 1) / m;
      const cx = toX(sorted[i]);
      ctx.lineTo(cx, toY(yPrev));
      ctx.lineTo(cx, toY(yNext));
      const nextCx = i < m - 1 ? toX(sorted[i + 1]) : toX(xMax);
      ctx.lineTo(nextCx, toY(yNext));
    }
    ctx.stroke();

    // Maximum gap segment
    const gx = toX(gapInfo.x);
    const fnVal = empiricalCDF(sorted, gapInfo.x);
    const fVal = normalCDF(gapInfo.x);
    ctx.strokeStyle = '#c0392b';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([5, 3]);
    ctx.beginPath();
    ctx.moveTo(gx, toY(fnVal));
    ctx.lineTo(gx, toY(fVal));
    ctx.stroke();
    ctx.setLineDash([]);

    // Gap label
    ctx.fillStyle = '#c0392b';
    ctx.font = 'bold 12px Fira Sans, system-ui';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const labelY = toY((fnVal + fVal) / 2);
    ctx.fillText(`sup = ${gapInfo.gap.toFixed(4)}`, gx + 6, labelY);

    // Legend
    const lx = pad.l + 12, ly = pad.t + 10;
    ctx.font = '12px Fira Sans, system-ui';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    ctx.strokeStyle = '#588157'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(lx, ly + 6); ctx.lineTo(lx + 24, ly + 6); ctx.stroke();
    ctx.fillStyle = '#588157'; ctx.fillText('F(x) — истинная CDF', lx + 30, ly);

    ctx.strokeStyle = '#da7756'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(lx, ly + 24); ctx.lineTo(lx + 24, ly + 24); ctx.stroke();
    ctx.fillStyle = '#da7756'; ctx.fillText(`F*_n(x) — эмпирическая (n=${n})`, lx + 30, ly + 18);

    ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 2;
    ctx.setLineDash([5, 3]);
    ctx.beginPath(); ctx.moveTo(lx, ly + 42); ctx.lineTo(lx + 24, ly + 42); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#c0392b'; ctx.fillText('sup|F*_n - F| — макс. отклонение', lx + 30, ly + 36);
  }, [sorted, gapInfo, n]);

  const H = 380;
  const w = useResponsiveCanvas(canvasRef, containerRef, H, drawFn, [sorted, gapInfo]);

  return (
    <div className="space-y-4">
      <div ref={containerRef} className="w-full">
        {w > 0 && <canvas ref={canvasRef} style={{ width: w, height: H }} className="rounded-lg block border border-border" />}
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <label className="flex items-center gap-3 flex-1 w-full">
          <span className="text-text-dim text-sm whitespace-nowrap">n =</span>
          <input
            type="range" min={5} max={5000} value={n}
            onChange={(e) => setN(+e.target.value)}
            className="flex-1 accent-accent"
          />
          <span className="font-mono text-accent font-bold w-16 text-right">{n}</span>
        </label>
        <button
          onClick={() => setSeed(s => s + 1)}
          className="px-4 py-1.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-coral transition-colors w-full sm:w-auto"
        >
          Новая выборка
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// Section 3: Convergence chart
// ═══════════════════════════════════════════════
function ConvergenceChart() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [seed, setSeed] = useState(1);

  const nValues = useMemo(() => {
    const vals = [];
    for (let e = Math.log10(5); e <= Math.log10(5000); e += (Math.log10(5000) - Math.log10(5)) / 24) {
      vals.push(Math.round(Math.pow(10, e)));
    }
    return [...new Set(vals)];
  }, []);

  const gapData = useMemo(() => {
    return nValues.map(nv => {
      const samples = boxMuller(nv, seed * 7919 + nv);
      const sorted = [...samples].sort((a, b) => a - b);
      return { n: nv, gap: supGap(sorted).gap };
    });
  }, [nValues, seed]);

  const drawFn = useCallback((ctx, W, H) => {
    const pad = { l: 55, r: 20, t: 25, b: 45 };
    const pw = W - pad.l - pad.r;
    const ph = H - pad.t - pad.b;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#faf9f5';
    ctx.fillRect(0, 0, W, H);

    const logMin = Math.log10(5), logMax = Math.log10(5000);
    const yMax = 0.7;
    const toX = (n) => pad.l + ((Math.log10(n) - logMin) / (logMax - logMin)) * pw;
    const toY = (g) => pad.t + (1 - g / yMax) * ph;

    // Grid
    ctx.strokeStyle = '#e8e6dc';
    ctx.lineWidth = 0.5;
    for (const nv of [5, 10, 50, 100, 500, 1000, 5000]) {
      if (nv < 5 || nv > 5000) continue;
      const x = toX(nv);
      ctx.beginPath();
      ctx.moveTo(x, pad.t);
      ctx.lineTo(x, pad.t + ph);
      ctx.stroke();
    }
    for (let g = 0; g <= yMax; g += 0.1) {
      ctx.beginPath();
      ctx.moveTo(pad.l, toY(g));
      ctx.lineTo(pad.l + pw, toY(g));
      ctx.stroke();
    }

    // Axis labels
    ctx.fillStyle = '#6b6b66';
    ctx.font = '11px Fira Sans, system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (const nv of [5, 10, 50, 100, 500, 1000, 5000]) {
      ctx.fillText(nv, toX(nv), pad.t + ph + 6);
    }
    ctx.fillText('n (лог. шкала)', pad.l + pw / 2, pad.t + ph + 25);

    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let g = 0; g <= yMax; g += 0.1) {
      ctx.fillText(g.toFixed(1), pad.l - 6, toY(g));
    }

    // Y axis label
    ctx.save();
    ctx.translate(12, pad.t + ph / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('sup|F*_n - F|', 0, 0);
    ctx.restore();

    // 1/sqrt(n) reference curve
    ctx.strokeStyle = '#b8860b';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    for (let px = 0; px <= pw; px += 2) {
      const logN = logMin + (px / pw) * (logMax - logMin);
      const nv = Math.pow(10, logN);
      const ref = 0.86 / Math.sqrt(nv); // ~DKW scale
      const y = toY(ref);
      if (px === 0) ctx.moveTo(pad.l + px, y); else ctx.lineTo(pad.l + px, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Data points + connecting line
    ctx.strokeStyle = '#da7756';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    gapData.forEach((d, i) => {
      const x = toX(d.n), y = toY(d.gap);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    ctx.fillStyle = '#da7756';
    gapData.forEach(d => {
      ctx.beginPath();
      ctx.arc(toX(d.n), toY(d.gap), 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // Legend
    const lx = pad.l + pw - 180, ly = pad.t + 8;
    ctx.font = '11px Fira Sans, system-ui';
    ctx.textAlign = 'left';

    ctx.fillStyle = '#da7756';
    ctx.beginPath(); ctx.arc(lx, ly + 5, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillText('sup|F*_n - F|', lx + 10, ly);

    ctx.strokeStyle = '#b8860b';
    ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.moveTo(lx - 5, ly + 22); ctx.lineTo(lx + 5, ly + 22); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#b8860b';
    ctx.fillText('~1/√n (масштаб)', lx + 10, ly + 16);
  }, [gapData]);

  const H = 320;
  const w = useResponsiveCanvas(canvasRef, containerRef, H, drawFn, [gapData]);

  return (
    <div className="space-y-3">
      <div ref={containerRef} className="w-full">
        {w > 0 && <canvas ref={canvasRef} style={{ width: w, height: H }} className="rounded-lg block border border-border" />}
      </div>
      <button
        onClick={() => setSeed(s => s + 1)}
        className="px-4 py-1.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-coral transition-colors w-full sm:w-auto"
      >
        Пересчитать
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════
// Section 4: DKW Inequality interactive
// ═══════════════════════════════════════════════
function DKWSection() {
  const [n, setN] = useState(100);
  const [eps, setEps] = useState(0.1);

  const bound = 2 * Math.exp(-2 * n * eps * eps);
  const confidence = Math.max(0, 1 - bound);

  return (
    <div className="space-y-5">
      <p className="text-text-dim text-sm leading-relaxed">
        Неравенство Дворецкого--Кифера--Вольфовица (DKW) даёт верхнюю оценку вероятности
        того, что эмпирическая CDF отклонится от истинной больше чем на <K m="\varepsilon" />:
      </p>

      <div className="text-center py-3">
        <K m="P\bigl(\sup_x |F^*_n(x) - F(x)| > \varepsilon\bigr) \le 2 \cdot e^{-2n\varepsilon^2}" d />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="space-y-1">
          <span className="text-text-dim text-sm">Размер выборки n = <span className="font-mono font-bold text-accent">{n}</span></span>
          <input
            type="range" min={10} max={5000} value={n}
            onChange={(e) => setN(+e.target.value)}
            className="w-full accent-accent"
          />
        </label>
        <label className="space-y-1">
          <span className="text-text-dim text-sm">Точность <K m="\varepsilon" /> = <span className="font-mono font-bold text-accent">{eps.toFixed(3)}</span></span>
          <input
            type="range" min={0.005} max={0.5} step={0.005} value={eps}
            onChange={(e) => setEps(+e.target.value)}
            className="w-full accent-accent"
          />
        </label>
      </div>

      <div className="bg-bg rounded-xl p-4 space-y-2">
        <p className="text-sm">
          <span className="text-text-dim">Верхняя граница: </span>
          <K m={`P(\\sup|F^*_n - F| > ${eps.toFixed(3)}) \\le`} />
          {' '}
          <span className="font-mono font-bold text-coral">
            {bound < 0.0001 ? bound.toExponential(2) : bound.toFixed(4)}
          </span>
        </p>
        <p className="text-sm">
          <span className="text-text-dim">Уверенность (1 - граница): </span>
          <span className="font-mono font-bold text-green">
            {(confidence * 100).toFixed(2)}%
          </span>
        </p>
        <p className="text-text-dim text-xs leading-relaxed mt-2">
          Это значит: с вероятностью не менее <strong>{(confidence * 100).toFixed(1)}%</strong> эмпирическая
          CDF по {n} наблюдениям будет отличаться от истинной не более чем
          на <strong>{eps.toFixed(3)}</strong> по всем точкам одновременно.
        </p>
      </div>

      {/* Concrete example */}
      <div className="bg-surface rounded-xl p-4 border border-border">
        <p className="text-sm font-medium mb-2">Конкретный пример:</p>
        <p className="text-text-dim text-sm leading-relaxed">
          При <K m="n = 100" /> и <K m="\varepsilon = 0.1" />:
        </p>
        <p className="text-sm mt-1">
          <K m={`2 \\cdot e^{-2 \\cdot 100 \\cdot 0.01} = 2 \\cdot e^{-2} \\approx 0.271`} />
        </p>
        <p className="text-text-dim text-sm mt-1">
          То есть с вероятностью <strong>~73%</strong> мы в пределах 0.1 от истинного распределения.
          При <K m="n = 500" /> та же точность даётся уже
          с <strong>{((1 - 2 * Math.exp(-2 * 500 * 0.01)) * 100).toFixed(1)}%</strong> уверенностью.
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// Kolmogorov: Histogram of √n·sup convergence
// ═══════════════════════════════════════════════
function KolmogorovHistogram() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [n, setN] = useState(100);
  const [revision, setRevision] = useState(0); // for re-randomize

  const REPS = 1000;

  const stats = useMemo(() => {
    void revision; // depend on revision to re-trigger
    const values = [];
    for (let r = 0; r < REPS; r++) {
      const samples = randomNormal(n);
      const sorted = [...samples].sort((a, b) => a - b);
      const gap = supGap(sorted).gap;
      values.push(Math.sqrt(n) * gap);
    }
    return values;
  }, [n, revision]);

  const drawFn = useCallback((ctx, W, H) => {
    const pad = { l: 50, r: 20, t: 25, b: 45 };
    const pw = W - pad.l - pad.r;
    const ph = H - pad.t - pad.b;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#faf9f5';
    ctx.fillRect(0, 0, W, H);

    const xMin = 0, xMax = 3.0;
    const numBins = 40;
    const binW = (xMax - xMin) / numBins;
    const bins = new Array(numBins).fill(0);
    for (const v of stats) {
      const idx = Math.floor((v - xMin) / binW);
      if (idx >= 0 && idx < numBins) bins[idx]++;
    }

    // Normalize to density
    const density = bins.map(b => b / (REPS * binW));
    const yMax = Math.max(...density, 2.0) * 1.1;

    const toX = (v) => pad.l + ((v - xMin) / (xMax - xMin)) * pw;
    const toY = (v) => pad.t + (1 - v / yMax) * ph;

    // Grid
    ctx.strokeStyle = '#e8e6dc';
    ctx.lineWidth = 0.5;
    for (let g = 0; g <= yMax; g += 0.5) {
      ctx.beginPath();
      ctx.moveTo(pad.l, toY(g));
      ctx.lineTo(pad.l + pw, toY(g));
      ctx.stroke();
    }

    // Histogram bars
    ctx.fillStyle = 'rgba(218, 119, 86, 0.4)';
    ctx.strokeStyle = '#da7756';
    ctx.lineWidth = 1;
    for (let i = 0; i < numBins; i++) {
      const x1 = toX(xMin + i * binW);
      const x2 = toX(xMin + (i + 1) * binW);
      const y = toY(density[i]);
      const yBot = toY(0);
      ctx.fillRect(x1, y, x2 - x1, yBot - y);
      ctx.strokeRect(x1, y, x2 - x1, yBot - y);
    }

    // Kolmogorov PDF overlay
    ctx.strokeStyle = '#588157';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let px = 0; px <= pw; px++) {
      const xv = xMin + (px / pw) * (xMax - xMin);
      const y = toY(kolmogorovPDF(xv));
      if (px === 0) ctx.moveTo(pad.l + px, y); else ctx.lineTo(pad.l + px, y);
    }
    ctx.stroke();

    // Axis labels
    ctx.fillStyle = '#6b6b66';
    ctx.font = '11px Fira Sans, system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let v = 0; v <= xMax; v += 0.5) {
      ctx.fillText(v.toFixed(1), toX(v), pad.t + ph + 6);
    }
    ctx.fillText('√n · sup|F*_n - F|', pad.l + pw / 2, pad.t + ph + 25);

    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let g = 0; g <= yMax; g += 0.5) {
      ctx.fillText(g.toFixed(1), pad.l - 6, toY(g));
    }

    // Legend
    const lx = pad.l + pw - 220, ly = pad.t + 8;
    ctx.font = '11px Fira Sans, system-ui';
    ctx.textAlign = 'left';

    ctx.fillStyle = 'rgba(218, 119, 86, 0.4)';
    ctx.fillRect(lx, ly, 16, 12);
    ctx.strokeStyle = '#da7756';
    ctx.strokeRect(lx, ly, 16, 12);
    ctx.fillStyle = '#da7756';
    ctx.fillText(`Гистограмма (${REPS} повторений, n=${n})`, lx + 22, ly);

    ctx.strokeStyle = '#588157'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(lx, ly + 22); ctx.lineTo(lx + 16, ly + 22); ctx.stroke();
    ctx.fillStyle = '#588157';
    ctx.fillText('PDF распределения Колмогорова', lx + 22, ly + 16);
  }, [stats, n]);

  const H = 360;
  const w = useResponsiveCanvas(canvasRef, containerRef, H, drawFn, [stats]);

  return (
    <div className="space-y-4">
      <div ref={containerRef} className="w-full">
        {w > 0 && <canvas ref={canvasRef} style={{ width: w, height: H }} className="rounded-lg block border border-border" />}
      </div>
      <div className="flex items-center gap-3 w-full">
        <span className="text-text-dim text-sm whitespace-nowrap">n =</span>
        <input
          type="range" min={10} max={2000} value={n}
          onChange={(e) => setN(+e.target.value)}
          className="flex-1 accent-accent"
        />
        <span className="font-mono text-accent font-bold w-16 text-right">{n}</span>
        <button
          onClick={() => setRevision(r => r + 1)}
          className="px-3 py-1 bg-accent text-white rounded-lg text-sm hover:opacity-90 whitespace-nowrap"
        >
          Пересчитать
        </button>
      </div>
      <p className="text-text-dim text-xs leading-relaxed">
        При малых n гистограмма далека от зелёной кривой. Увеличивайте n — и гистограмма
        всё точнее ложится на распределение Колмогорова. Это и есть сходимость по распределению.
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════
// Kolmogorov: KS-test interactive demo
// ═══════════════════════════════════════════════
function KSTestDemo() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [n, setN] = useState(50);
  const [seed, setSeed] = useState(1);
  const [trueDist, setTrueDist] = useState('normal');
  const [testDist, setTestDist] = useState('normal');

  const DIST_LABELS = { normal: 'N(0,1)', uniform: 'U(0,1)', exponential: 'Exp(1)' };
  const DIST_RANGES = {
    normal: [-4, 4],
    uniform: [-0.5, 1.5],
    exponential: [-0.5, 5],
  };

  const result = useMemo(() => {
    const samples = generateSamples(trueDist, n, seed * 3571 + 17);
    const sorted = [...samples].sort((a, b) => a - b);
    const testCDF = getCDF(testDist);
    const gap = supGap(sorted, testCDF);
    const scaledGap = Math.sqrt(n) * gap.gap;
    // Critical values: P(K > c) = alpha
    const c90 = 1.224, c95 = 1.358, c99 = 1.628;
    return {
      sorted, gap, scaledGap, testCDF,
      reject90: scaledGap > c90,
      reject95: scaledGap > c95,
      reject99: scaledGap > c99,
      c95,
    };
  }, [trueDist, testDist, n, seed]);

  const drawFn = useCallback((ctx, W, H) => {
    const pad = { l: 50, r: 20, t: 30, b: 40 };
    const pw = W - pad.l - pad.r;
    const ph = H - pad.t - pad.b;
    const range = DIST_RANGES[testDist];
    const xMin = range[0], xMax = range[1];

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#faf9f5';
    ctx.fillRect(0, 0, W, H);

    const toX = (v) => pad.l + ((v - xMin) / (xMax - xMin)) * pw;
    const toY = (v) => pad.t + (1 - v) * ph;

    // Grid
    ctx.strokeStyle = '#e8e6dc';
    ctx.lineWidth = 0.5;
    for (let v = 0; v <= 1; v += 0.2) {
      ctx.beginPath(); ctx.moveTo(pad.l, toY(v)); ctx.lineTo(pad.l + pw, toY(v)); ctx.stroke();
    }

    // H0 CDF
    ctx.strokeStyle = '#588157';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let px = 0; px <= pw; px++) {
      const xv = xMin + (px / pw) * (xMax - xMin);
      const y = toY(result.testCDF(xv));
      if (px === 0) ctx.moveTo(pad.l + px, y); else ctx.lineTo(pad.l + px, y);
    }
    ctx.stroke();

    // Empirical CDF
    const m = result.sorted.length;
    ctx.strokeStyle = '#da7756';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const firstX = Math.max(xMin, result.sorted[0]);
    ctx.moveTo(toX(xMin), toY(0));
    ctx.lineTo(toX(firstX), toY(0));
    for (let i = 0; i < m; i++) {
      const yPrev = i / m;
      const yNext = (i + 1) / m;
      const cx = toX(result.sorted[i]);
      ctx.lineTo(cx, toY(yPrev));
      ctx.lineTo(cx, toY(yNext));
      const nextCx = i < m - 1 ? toX(result.sorted[i + 1]) : toX(xMax);
      ctx.lineTo(nextCx, toY(yNext));
    }
    ctx.stroke();

    // Gap segment
    const gx = toX(result.gap.x);
    const fnVal = empiricalCDF(result.sorted, result.gap.x);
    const fVal = result.testCDF(result.gap.x);
    ctx.strokeStyle = '#c0392b';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([5, 3]);
    ctx.beginPath();
    ctx.moveTo(gx, toY(fnVal));
    ctx.lineTo(gx, toY(fVal));
    ctx.stroke();
    ctx.setLineDash([]);

    // Axis labels
    ctx.fillStyle = '#6b6b66';
    ctx.font = '11px Fira Sans, system-ui';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let v = 0; v <= 1; v += 0.2) ctx.fillText(v.toFixed(1), pad.l - 6, toY(v));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const step = (xMax - xMin) / 5;
    for (let v = xMin; v <= xMax + 0.001; v += step) {
      ctx.fillText(v.toFixed(1), toX(v), pad.t + ph + 6);
    }

    // Legend
    const lx = pad.l + 12, ly = pad.t + 8;
    ctx.font = '11px Fira Sans, system-ui';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    ctx.strokeStyle = '#588157'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(lx, ly + 6); ctx.lineTo(lx + 20, ly + 6); ctx.stroke();
    ctx.fillStyle = '#588157';
    ctx.fillText(`H₀: ${DIST_LABELS[testDist]}`, lx + 26, ly);

    ctx.strokeStyle = '#da7756'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(lx, ly + 22); ctx.lineTo(lx + 20, ly + 22); ctx.stroke();
    ctx.fillStyle = '#da7756';
    ctx.fillText(`Выборка из ${DIST_LABELS[trueDist]} (n=${n})`, lx + 26, ly + 16);
  }, [result, n, trueDist, testDist]);

  const H = 340;
  const w = useResponsiveCanvas(canvasRef, containerRef, H, drawFn, [result]);

  const rejectColor = result.reject95 ? 'text-coral' : 'text-green';
  const rejectText = result.reject95 ? 'ОТКЛОНЯЕМ H₀' : 'НЕ отклоняем H₀';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="space-y-1">
          <p className="text-text-dim text-xs font-medium">Истинное распределение:</p>
          <div className="flex gap-1.5">
            {['normal', 'uniform', 'exponential'].map(d => (
              <button key={d} onClick={() => { setTrueDist(d); setSeed(s => s + 1); }}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${trueDist === d ? 'bg-accent text-white' : 'bg-surface border border-border text-text-dim hover:border-accent'}`}>
                {DIST_LABELS[d]}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-text-dim text-xs font-medium">Гипотеза H₀:</p>
          <div className="flex gap-1.5">
            {['normal', 'uniform', 'exponential'].map(d => (
              <button key={d} onClick={() => setTestDist(d)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${testDist === d ? 'bg-[#588157] text-white' : 'bg-surface border border-border text-text-dim hover:border-[#588157]'}`}>
                {DIST_LABELS[d]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div ref={containerRef} className="w-full">
        {w > 0 && <canvas ref={canvasRef} style={{ width: w, height: H }} className="rounded-lg block border border-border" />}
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <label className="flex items-center gap-3 flex-1 w-full">
          <span className="text-text-dim text-sm whitespace-nowrap">n =</span>
          <input type="range" min={10} max={500} value={n}
            onChange={(e) => setN(+e.target.value)}
            className="flex-1 accent-accent" />
          <span className="font-mono text-accent font-bold w-12 text-right">{n}</span>
        </label>
        <button onClick={() => setSeed(s => s + 1)}
          className="px-4 py-1.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-coral transition-colors w-full sm:w-auto">
          Новая выборка
        </button>
      </div>

      <div className="bg-bg rounded-xl p-4 space-y-2">
        <p className="text-sm">
          <span className="text-text-dim">Статистика: </span>
          <K m={`\\sqrt{n}\\cdot\\sup|F^*_n - F_0| = \\sqrt{${n}}\\cdot${result.gap.gap.toFixed(4)} =`} />
          {' '}
          <span className="font-mono font-bold text-coral">{result.scaledGap.toFixed(3)}</span>
        </p>
        <p className="text-sm">
          <span className="text-text-dim">Критическое значение (5%): </span>
          <span className="font-mono font-bold">{result.c95}</span>
        </p>
        <p className={`text-sm font-bold ${rejectColor}`}>
          {rejectText} (уровень 5%)
        </p>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════
// Supremum explainer — interactive visualization
// ═══════════════════════════════════════════════
function SupremumExplainer() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [hoverIdx, setHoverIdx] = useState(-1);

  // Fixed 15 points, sorted
  const points = useMemo(() => {
    const raw = boxMuller(15, 777).sort((a, b) => a - b);
    return raw;
  }, []);

  // Compute gaps at every step boundary
  const gaps = useMemo(() => {
    const n = points.length;
    const result = [];
    for (let i = 0; i < n; i++) {
      const x = points[i];
      const fnBelow = i / n;
      const fnAt = (i + 1) / n;
      const fx = normalCDF(x);
      const g1 = Math.abs(fnAt - fx);
      const g2 = Math.abs(fnBelow - fx);
      result.push({ x, gap: Math.max(g1, g2), fnBelow, fnAt, fx });
    }
    return result;
  }, [points]);

  const supIdx = useMemo(() => {
    let best = 0;
    for (let i = 1; i < gaps.length; i++) {
      if (gaps[i].gap > gaps[best].gap) best = i;
    }
    return best;
  }, [gaps]);

  const drawFn = useCallback((ctx, W, H) => {
    const pad = { l: 50, r: 20, t: 30, b: 50 };
    const pw = W - pad.l - pad.r;
    const ph = H - pad.t - pad.b;
    const n = points.length;
    const xMin = -3.5, xMax = 3.5;
    const toX = v => pad.l + (v - xMin) / (xMax - xMin) * pw;
    const toY = v => pad.t + (1 - v) * ph;

    ctx.clearRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = '#e8e6dc';
    ctx.lineWidth = 0.5;
    for (let v = 0; v <= 1; v += 0.25) {
      ctx.beginPath(); ctx.moveTo(pad.l, toY(v)); ctx.lineTo(pad.l + pw, toY(v)); ctx.stroke();
    }

    // True CDF — green curve
    ctx.strokeStyle = '#588157';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let px = 0; px <= pw; px++) {
      const x = xMin + (px / pw) * (xMax - xMin);
      const y = normalCDF(x);
      if (px === 0) ctx.moveTo(pad.l + px, toY(y));
      else ctx.lineTo(pad.l + px, toY(y));
    }
    ctx.stroke();

    // Empirical CDF — terracotta steps
    ctx.strokeStyle = '#da7756';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(toX(xMin), toY(0));
    for (let i = 0; i < n; i++) {
      ctx.lineTo(toX(points[i]), toY(i / n));
      ctx.lineTo(toX(points[i]), toY((i + 1) / n));
    }
    ctx.lineTo(toX(xMax), toY(1));
    ctx.stroke();

    // Draw ALL gap lines (thin, grey)
    for (let i = 0; i < gaps.length; i++) {
      const g = gaps[i];
      const gx = toX(g.x);
      const isSup = i === supIdx;
      const isHover = i === hoverIdx;

      if (!isSup && !isHover) {
        ctx.strokeStyle = 'rgba(180,180,170,0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        const y1 = toY(g.fnAt);
        const y2 = toY(g.fx);
        ctx.beginPath(); ctx.moveTo(gx, y1); ctx.lineTo(gx, y2); ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Highlight hovered gap
    if (hoverIdx >= 0 && hoverIdx !== supIdx) {
      const g = gaps[hoverIdx];
      const gx = toX(g.x);
      ctx.strokeStyle = '#b8860b';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([]);
      const y1 = toY(g.fnAt);
      const y2 = toY(g.fx);
      ctx.beginPath(); ctx.moveTo(gx, y1); ctx.lineTo(gx, y2); ctx.stroke();

      // Label
      ctx.fillStyle = '#b8860b';
      ctx.font = 'bold 12px Fira Sans, system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(`|Δ| = ${g.gap.toFixed(3)}`, gx, Math.min(y1, y2) - 8);
    }

    // Highlight sup gap — always visible, red
    const sg = gaps[supIdx];
    const sgx = toX(sg.x);
    ctx.strokeStyle = '#c0392b';
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    const sy1 = toY(sg.fnAt);
    const sy2 = toY(sg.fx);
    ctx.beginPath(); ctx.moveTo(sgx, sy1); ctx.lineTo(sgx, sy2); ctx.stroke();

    // Arrows on sup gap
    const arrowSize = 6;
    const topY = Math.min(sy1, sy2);
    const botY = Math.max(sy1, sy2);
    ctx.fillStyle = '#c0392b';
    // Top arrow
    ctx.beginPath(); ctx.moveTo(sgx, topY); ctx.lineTo(sgx - arrowSize, topY + arrowSize); ctx.lineTo(sgx + arrowSize, topY + arrowSize); ctx.fill();
    // Bottom arrow
    ctx.beginPath(); ctx.moveTo(sgx, botY); ctx.lineTo(sgx - arrowSize, botY - arrowSize); ctx.lineTo(sgx + arrowSize, botY - arrowSize); ctx.fill();

    // Sup label
    ctx.fillStyle = '#c0392b';
    ctx.font = 'bold 13px Fira Sans, system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(`sup = ${sg.gap.toFixed(3)}`, sgx, topY - 12);

    // Data points on x-axis
    for (let i = 0; i < n; i++) {
      const px = toX(points[i]);
      const isActive = i === supIdx || i === hoverIdx;
      ctx.fillStyle = i === supIdx ? '#c0392b' : i === hoverIdx ? '#b8860b' : '#da7756';
      ctx.beginPath();
      ctx.arc(px, toY(0) + 15, isActive ? 5 : 3, 0, Math.PI * 2);
      ctx.fill();
    }

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
    for (let v = -3; v <= 3; v++) {
      ctx.fillText(v.toString(), toX(v), pad.t + ph + 14);
    }
    ctx.textAlign = 'right';
    for (let v = 0; v <= 1; v += 0.25) {
      ctx.fillText(v.toFixed(2), pad.l - 5, toY(v) + 4);
    }

    // Legend
    ctx.textAlign = 'left';
    ctx.fillStyle = '#588157';
    ctx.font = '12px Fira Sans, system-ui';
    ctx.fillText('— Истинная CDF', pad.l + 10, pad.t + 15);
    ctx.fillStyle = '#da7756';
    ctx.fillText('— Эмпирическая CDF', pad.l + 10, pad.t + 30);
  }, [points, gaps, supIdx, hoverIdx]);

  const H = 350;
  const w = useResponsiveCanvas(canvasRef, containerRef, H, drawFn, [hoverIdx]);

  const handleMouseMove = useCallback((e) => {
    if (!w) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const pad = { l: 50, r: 20 };
    const pw = w - pad.l - pad.r;
    const xMin = -3.5, xMax = 3.5;
    const xVal = xMin + ((mx - pad.l) / pw) * (xMax - xMin);

    // Find closest point
    let bestI = -1, bestDist = Infinity;
    for (let i = 0; i < points.length; i++) {
      const d = Math.abs(points[i] - xVal);
      if (d < bestDist) { bestDist = d; bestI = i; }
    }
    if (bestDist < 0.3) setHoverIdx(bestI);
    else setHoverIdx(-1);
  }, [w, points]);

  return (
    <div ref={containerRef}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: H }}
        className="cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIdx(-1)}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════
// Page: Empirical CDF
// ═══════════════════════════════════════════════
function EmpiricalPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 px-4 md:px-0 pb-12">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-accent mb-2">
          Эмпирическая функция распределения
        </h1>
        <p className="text-text-dim text-sm leading-relaxed">
          Что такое эмпирическая CDF и как она строится по данным.
        </p>
      </div>

      <section className="bg-card rounded-2xl p-6 space-y-4 border border-border">
        <h2 className="text-xl font-bold text-accent">
          Что такое эмпирическая функция распределения
        </h2>
        <p className="text-text-dim text-sm leading-relaxed">
          У нас есть набор чисел (наблюдений). <strong>Эмпирическая CDF</strong> в точке <K m="x" /> — это
          просто доля наших данных, которые меньше <K m="x" />:
        </p>
        <div className="text-center py-2">
          <K m="F^*_n(x) = \frac{1}{n} \sum_{i=1}^{n} \mathbf{1}[X_i < x] = \frac{\text{сколько точек} < x}{n}" d />
        </div>
        <p className="text-text-dim text-sm leading-relaxed">
          Человеческим языком: <em>«какая доля наших данных меньше x?»</em>
          Это ступенчатая функция — она прыгает на <K m="1/n" /> в каждой точке данных.
        </p>
        <p className="text-text-dim text-sm leading-relaxed">
          Перетащите зелёную линию, чтобы увидеть, как считается <K m="F^*_n(x)" />. Зелёные точки — это те,
          что попали в подсчёт (меньше <K m="x" />).
        </p>
        <EmpiricalExplainer />
      </section>
    </div>
  );
}

// ═══════════════════════════════════════════════
// Page: Supremum
// ═══════════════════════════════════════════════
function SupremumPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 px-4 md:px-0 pb-12">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-accent mb-2">
          Что такое супремум (sup)
        </h1>
        <p className="text-text-dim text-sm leading-relaxed">
          Ключевое понятие в теоремах о сходимости распределений.
        </p>
      </div>

      {/* Intuition */}
      <section className="bg-card rounded-2xl p-6 space-y-4 border border-border">
        <h2 className="text-xl font-bold text-accent">Интуиция</h2>
        <p className="text-text-dim text-sm leading-relaxed">
          Представь два графика — ступеньки (эмпирическая CDF) и гладкую кривую (истинная CDF).
          В каждой точке <K m="x" /> между ними есть вертикальный зазор — <K m="|F^*_n(x) - F_X(x)|" />.
        </p>
        <p className="text-text-dim text-sm leading-relaxed">
          <strong>Супремум</strong> — это <em>самый большой</em> из всех этих зазоров по всем возможным <K m="x" />:
        </p>
        <div className="text-center py-3">
          <K m="\sup_{x \in \mathbb{R}} |F^*_n(x) - F_X(x)| = \max_x \text{(вертикальный зазор в точке } x \text{)}" d />
        </div>
        <p className="text-text-dim text-sm leading-relaxed">
          Технически sup ≠ max (супремум может не достигаться), но для наших задач можно думать о нём как о максимуме.
        </p>
      </section>

      {/* Interactive visualization */}
      <section className="bg-card rounded-2xl p-6 space-y-4 border border-border">
        <h2 className="text-xl font-bold text-accent">Визуально: найди максимальный зазор</h2>
        <p className="text-text-dim text-sm leading-relaxed">
          <strong>Наведите мышь</strong> на разные точки данных (кружки внизу). Жёлтым подсветится зазор в этой точке.
          <span className="text-red font-semibold"> Красная линия</span> — это sup, максимальный зазор среди всех.
          Он определяет, насколько «плохо» выборка приближает истинное распределение.
        </p>
        <SupremumExplainer />
      </section>

      {/* Why sup not mean */}
      <section className="bg-card rounded-2xl p-6 space-y-4 border border-border">
        <h2 className="text-xl font-bold text-accent">Почему sup, а не среднее?</h2>
        <p className="text-text-dim text-sm leading-relaxed">
          Потому что нас интересует <strong>гарантия</strong>: даже в самом проблемном месте
          эмпирическая CDF не отклоняется больше чем на sup.
        </p>
        <div className="bg-bg rounded-xl p-4 space-y-3">
          <p className="text-sm leading-relaxed">
            <strong>Аналогия:</strong> ты проверяешь деталь на заводе. Допуск — ±0.1 мм.
            Средняя ошибка 0.02 мм — отлично! Но если в одном месте ошибка 0.5 мм — деталь в брак.
            Важен <strong>максимум</strong> (sup), а не среднее.
          </p>
          <p className="text-sm leading-relaxed">
            Так же и здесь: если в среднем CDF совпадают, но в одной точке зазор огромный —
            мы не можем сказать что хорошо знаем распределение. Супремум ловит худший случай.
          </p>
        </div>
      </section>

      {/* sup vs max */}
      <section className="bg-card rounded-2xl p-6 space-y-4 border border-border">
        <h2 className="text-xl font-bold text-accent">sup vs max: формальная разница</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-bg rounded-xl p-4">
            <p className="font-semibold text-accent mb-2">max (максимум)</p>
            <p className="text-sm text-text-dim leading-relaxed">
              Наибольшее значение, которое <strong>реально достигается</strong>.
              У множества {'{'}1, 2, 3{'}'} максимум = 3.
            </p>
          </div>
          <div className="bg-bg rounded-xl p-4">
            <p className="font-semibold text-accent mb-2">sup (супремум)</p>
            <p className="text-sm text-text-dim leading-relaxed">
              Наименьшая верхняя граница. Может <strong>не достигаться</strong>.
              У множества (0, 1) — открытый интервал — нет максимума (1 не входит), но sup = 1.
            </p>
          </div>
        </div>
        <p className="text-text-dim text-sm leading-relaxed">
          Для дискретных данных (конечная выборка) sup и max совпадают — максимальный зазор
          всегда достигается в одной из точек данных. Но в теории мы пишем sup, потому что
          ищем по всем <K m="x \in \mathbb{R}" /> (бесконечное множество).
        </p>
      </section>

      {/* Connection to theorems */}
      <section className="bg-card rounded-2xl p-6 space-y-4 border border-border">
        <h2 className="text-xl font-bold text-accent">Где sup появляется дальше</h2>
        <div className="space-y-3">
          <div className="bg-bg rounded-xl p-4">
            <p className="font-semibold text-sm mb-1">Теорема Гливенко–Кантелли</p>
            <div className="text-center py-1">
              <K m="\sup_{x}|F^*_n(x) - F_X(x)| \xrightarrow{\text{п.н.}} 0" d />
            </div>
            <p className="text-xs text-text-dim">Максимальный зазор → 0. Ступеньки прижимаются к кривой <strong>везде</strong>.</p>
          </div>
          <div className="bg-bg rounded-xl p-4">
            <p className="font-semibold text-sm mb-1">Теорема Колмогорова</p>
            <div className="text-center py-1">
              <K m="\sqrt{n}\,\sup_{x}|F^*_n(x) - F_X(x)| \xrightarrow{d} K" d />
            </div>
            <p className="text-xs text-text-dim">Масштабированный sup имеет конкретное распределение → можем считать p-value.</p>
          </div>
          <div className="bg-bg rounded-xl p-4">
            <p className="font-semibold text-sm mb-1">Неравенство DKW</p>
            <div className="text-center py-1">
              <K m="P\!\left(\sup_{x}|F^*_n(x) - F_X(x)| > \varepsilon\right) \le 2e^{-2n\varepsilon^2}" d />
            </div>
            <p className="text-xs text-text-dim">Вероятность того, что sup «слишком большой», экспоненциально мала.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

// ═══════════════════════════════════════════════
// Page: Glivenko-Cantelli theorem
// ═══════════════════════════════════════════════
function TheoremPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 px-4 md:px-0 pb-12">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-accent mb-2">
          Теорема Гливенко--Кантелли
        </h1>
        <p className="text-text-dim text-sm leading-relaxed">
          Эмпирическая функция распределения сходится к истинной равномерно.
          Чем больше данных — тем точнее мы знаем распределение.
        </p>
      </div>

      <section className="bg-card rounded-2xl p-6 space-y-4 border border-border">
        <h2 className="text-xl font-bold text-accent">
          Эмпирическая vs. истинная CDF
        </h2>
        <p className="text-text-dim text-sm leading-relaxed">
          Зелёная кривая — это «истинная» CDF нормального распределения <K m="N(0,1)" />.
          Мы её знаем, потому что сами генерируем данные. Терракотовые ступеньки — это эмпирическая CDF
          по <K m="n" /> случайным наблюдениям. Красный пунктир показывает максимальное отклонение.
        </p>
        <p className="text-text-dim text-sm leading-relaxed">
          Двигайте слайдер — при малых <K m="n" /> ступеньки грубые, при больших — прижимаются к зелёной кривой.
        </p>
        <CDFComparison />
      </section>

      <section className="bg-card rounded-2xl p-6 space-y-4 border border-border">
        <h2 className="text-xl font-bold text-accent">
          Что говорит теорема
        </h2>
        <p className="text-text-dim text-sm leading-relaxed">
          <strong>Теорема Гливенко--Кантелли:</strong> при <K m="n \to \infty" /> максимальное отклонение
          эмпирической CDF от истинной стремится к нулю <em>почти наверное</em>:
        </p>
        <div className="text-center py-2">
          <K m="\sup_x |F^*_n(x) - F(x)| \xrightarrow{\text{п.н.}} 0 \quad \text{при } n \to \infty" d />
        </div>
        <p className="text-text-dim text-sm leading-relaxed">
          Простыми словами: неважно какое распределение — если данных достаточно, эмпирическая CDF
          станет сколь угодно близкой к истинной. Ступеньки «обнимут» кривую.
        </p>
        <p className="text-text-dim text-sm leading-relaxed">
          Ниже — график зависимости <K m="\sup|F^*_n - F|" /> от размера выборки <K m="n" />.
          Пунктир показывает масштаб <K m="\sim 1/\sqrt{n}" /> — типичную скорость сходимости.
        </p>
        <ConvergenceChart />
      </section>
    </div>
  );
}

// ═══════════════════════════════════════════════
// Page: Kolmogorov theorem
// ═══════════════════════════════════════════════
// ═══════════════════════════════════════════════
// Comparison: with vs without √n
// ═══════════════════════════════════════════════
function ComparisonWithWithoutSqrtN() {
  const leftRef = useRef(null);
  const leftCanvas = useRef(null);
  const rightRef = useRef(null);
  const rightCanvas = useRef(null);
  const [n, setN] = useState(50);
  const [revision, setRevision] = useState(0);

  const REPS = 800;

  const data = useMemo(() => {
    void revision;
    const raw = [];
    const scaled = [];
    for (let r = 0; r < REPS; r++) {
      const samples = randomNormal(n);
      const sorted = [...samples].sort((a, b) => a - b);
      const gap = supGap(sorted).gap;
      raw.push(gap);
      scaled.push(Math.sqrt(n) * gap);
    }
    return { raw, scaled };
  }, [n, revision]);

  // Draw raw (without √n)
  const drawRaw = useCallback((ctx, W, H) => {
    drawCompHist(ctx, W, H, data.raw, 'sup|F*_n − F|', null, '#da7756');
  }, [data.raw]);

  // Draw scaled (with √n)
  const drawScaled = useCallback((ctx, W, H) => {
    drawCompHist(ctx, W, H, data.scaled, '√n · sup|F*_n − F|', kolmogorovPDF, '#da7756');
  }, [data.scaled]);

  const H = 280;
  useResponsiveCanvas(leftCanvas, leftRef, H, drawRaw, [data.raw]);
  useResponsiveCanvas(rightCanvas, rightRef, H, drawScaled, [data.scaled]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <p className="text-sm font-semibold text-coral mb-2 text-center">Без √n (сжимается → 0)</p>
          <div ref={leftRef} className="w-full">
            <canvas ref={leftCanvas} style={{ width: '100%', height: H }} className="rounded-lg border border-border block" />
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-green mb-2 text-center">С √n (стабильная форма)</p>
          <div ref={rightRef} className="w-full">
            <canvas ref={rightCanvas} style={{ width: '100%', height: H }} className="rounded-lg border border-border block" />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-text-dim text-sm whitespace-nowrap">n =</span>
        <input type="range" min={10} max={2000} value={n} onChange={e => setN(+e.target.value)} className="flex-1 accent-accent" />
        <span className="font-mono text-accent font-bold w-16 text-right">{n}</span>
        <button onClick={() => setRevision(r => r + 1)} className="px-3 py-1 bg-accent text-white rounded-lg text-sm hover:opacity-90 whitespace-nowrap">↻</button>
      </div>
      <p className="text-text-dim text-xs leading-relaxed">
        Двигайте слайдер: при увеличении n левая гистограмма <strong>схлопывается к нулю</strong>,
        а правая <strong>остаётся на месте</strong> — это и есть разница между сходимостью п.н. и сходимостью по распределению.
      </p>
    </div>
  );
}

// Helper: draw a comparison histogram
function drawCompHist(ctx, W, H, values, xlabel, pdfFn, barColor) {
  const pad = { l: 45, r: 10, t: 15, b: 40 };
  const pw = W - pad.l - pad.r;
  const ph = H - pad.t - pad.b;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#faf9f5';
  ctx.fillRect(0, 0, W, H);

  const xMin = 0;
  const xMax = pdfFn ? 3.0 : Math.max(0.5, Math.max(...values) * 1.2);
  const numBins = 30;
  const binW = (xMax - xMin) / numBins;
  const bins = new Array(numBins).fill(0);
  for (const v of values) {
    const idx = Math.floor((v - xMin) / binW);
    if (idx >= 0 && idx < numBins) bins[idx]++;
  }

  const density = bins.map(b => b / (values.length * binW));
  const yMax = Math.max(...density, pdfFn ? 2.0 : 1.0) * 1.15;

  const toX = v => pad.l + ((v - xMin) / (xMax - xMin)) * pw;
  const toY = v => pad.t + (1 - v / yMax) * ph;

  // Grid
  ctx.strokeStyle = '#e8e6dc';
  ctx.lineWidth = 0.5;
  for (let g = 0; g <= yMax; g += 0.5) {
    ctx.beginPath(); ctx.moveTo(pad.l, toY(g)); ctx.lineTo(pad.l + pw, toY(g)); ctx.stroke();
  }

  // Bars
  ctx.fillStyle = barColor + '55';
  ctx.strokeStyle = barColor;
  ctx.lineWidth = 1;
  for (let i = 0; i < numBins; i++) {
    const x1 = toX(xMin + i * binW);
    const x2 = toX(xMin + (i + 1) * binW);
    const y = toY(density[i]);
    const yBot = toY(0);
    ctx.fillRect(x1, y, x2 - x1, yBot - y);
    ctx.strokeRect(x1, y, x2 - x1, yBot - y);
  }

  // PDF overlay
  if (pdfFn) {
    ctx.strokeStyle = '#588157';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let px = 0; px <= pw; px++) {
      const x = xMin + (px / pw) * (xMax - xMin);
      const y = pdfFn(x);
      if (px === 0) ctx.moveTo(pad.l + px, toY(y));
      else ctx.lineTo(pad.l + px, toY(y));
    }
    ctx.stroke();
  }

  // Axes
  ctx.strokeStyle = '#1a1a19';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad.l, pad.t); ctx.lineTo(pad.l, pad.t + ph); ctx.lineTo(pad.l + pw, pad.t + ph);
  ctx.stroke();

  // X labels
  ctx.fillStyle = '#6b6b66';
  ctx.font = '10px Fira Sans, system-ui';
  ctx.textAlign = 'center';
  const step = xMax <= 1 ? 0.1 : xMax <= 3 ? 0.5 : 1;
  for (let v = 0; v <= xMax; v += step) {
    ctx.fillText(v.toFixed(1), toX(v), pad.t + ph + 14);
  }

  // X axis label
  ctx.font = '10px Fira Sans, system-ui';
  ctx.fillText(xlabel, pad.l + pw / 2, H - 3);

  // Y labels
  ctx.textAlign = 'right';
  for (let v = 0; v <= yMax; v += Math.max(0.5, Math.ceil(yMax / 4) * 0.5)) {
    ctx.fillText(v.toFixed(1), pad.l - 4, toY(v) + 3);
  }
}

function KolmogorovPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 px-4 md:px-0 pb-12">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-accent mb-2">
          Теорема Колмогорова
        </h1>
        <p className="text-text-dim text-sm leading-relaxed">
          Гливенко--Кантелли говорит, что разрыв стремится к нулю. Колмогоров говорит
          — <strong>с какой скоростью</strong> и как выглядит масштабированный разрыв.
        </p>
      </div>

      {/* Section A: Formula */}
      <section className="bg-card rounded-2xl p-6 space-y-4 border border-border">
        <h2 className="text-xl font-bold text-accent">Формулировка</h2>
        <p className="text-text-dim text-sm leading-relaxed">
          Если истинная функция распределения <K m="F_X" /> непрерывна, то:
        </p>
        <div className="text-center py-3">
          <K m="\sqrt{n}\,\sup_{x\in\mathbb{R}}|F_n^*(x) - F_X(x)| \xrightarrow{d} K" d />
        </div>
        <p className="text-text-dim text-sm leading-relaxed">
          где <K m="K" /> — <strong>распределение Колмогорова</strong>. Его CDF:
        </p>
        <div className="text-center py-2">
          <K m="P(K \le x) = 1 - 2\sum_{k=1}^{\infty}(-1)^{k-1}e^{-2k^2 x^2}" d />
        </div>
        <p className="text-text-dim text-sm leading-relaxed">
          Что это значит? Мы берём максимальный разрыв между эмпирической и истинной CDF,
          умножаем на <K m="\sqrt{n}" />, и получаем случайную величину. При большом <K m="n" /> эта
          величина перестаёт зависеть от <K m="n" /> и от конкретного распределения <K m="F_X" /> — она
          сходится к универсальному распределению Колмогорова.
        </p>
        <div className="bg-bg rounded-xl p-4">
          <p className="text-text-dim text-xs leading-relaxed">
            <strong>Интуиция:</strong> Гливенко--Кантелли говорит «разрыв → 0».
            Колмогоров уточняет: «разрыв ≈ <K m="K / \sqrt{n}" />, где <K m="K" /> —
            случайная величина с известным распределением». Это даёт нам точные числа
            для построения доверительных полос и статистических тестов.
          </p>
        </div>
      </section>

      {/* Section B: Histogram convergence */}
      <section className="bg-card rounded-2xl p-6 space-y-4 border border-border">
        <h2 className="text-xl font-bold text-accent">
          Сходимость к распределению Колмогорова
        </h2>
        <p className="text-text-dim text-sm leading-relaxed">
          Для каждого <K m="n" /> мы генерируем 1000 выборок из <K m="N(0,1)" />,
          считаем <K m="\sqrt{n}\cdot\sup|F^*_n - F|" /> для каждой,
          и строим гистограмму. Зелёная кривая — теоретическая PDF распределения Колмогорова:
        </p>
        <div className="text-center py-2">
          <K m="k(x) = 8x\sum_{j=1}^{\infty}(-1)^{j+1}j^2 e^{-2j^2 x^2}" d />
        </div>
        <KolmogorovHistogram />
      </section>

      {/* Section B2: Comparison — with vs without √n */}
      <section className="bg-card rounded-2xl p-6 space-y-4 border border-border">
        <h2 className="text-xl font-bold text-accent">
          Зачем нужен √n: сравнение
        </h2>
        <p className="text-text-dim text-sm leading-relaxed">
          <strong>Слева</strong> — просто sup|F*_n − F| <strong>без</strong> умножения на √n.
          При увеличении n гистограмма <em>сжимается к нулю</em> (Гливенко–Кантелли).
          <br/>
          <strong>Справа</strong> — √n · sup|F*_n − F| <strong>с</strong> умножением.
          Гистограмма <em>стабилизируется</em> и совпадает с зелёной кривой (Колмогоров).
        </p>
        <ComparisonWithWithoutSqrtN />
      </section>

      {/* Section C: Practical meaning — critical values */}
      <section className="bg-card rounded-2xl p-6 space-y-4 border border-border">
        <h2 className="text-xl font-bold text-accent">Критические значения</h2>
        <p className="text-text-dim text-sm leading-relaxed">
          Из распределения Колмогорова мы получаем <strong>точные критические значения</strong> для
          критерия Колмогорова--Смирнова. Это порог, с которым сравниваем статистику <K m="\sqrt{n}\cdot\sup|F^*_n - F_0|" />.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 text-text-dim font-medium">Уровень значимости <K m="\alpha" /></th>
                <th className="text-center py-2 px-3 text-text-dim font-medium">Критическое <K m="c_\alpha" /></th>
                <th className="text-center py-2 px-3 text-text-dim font-medium"><K m="P(K \le c_\alpha)" /></th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/50">
                <td className="py-2 px-3">10%</td>
                <td className="py-2 px-3 text-center font-mono font-bold">1.224</td>
                <td className="py-2 px-3 text-center font-mono">90%</td>
              </tr>
              <tr className="border-b border-border/50 bg-accent/5">
                <td className="py-2 px-3 font-medium">5%</td>
                <td className="py-2 px-3 text-center font-mono font-bold text-accent">1.358</td>
                <td className="py-2 px-3 text-center font-mono">95%</td>
              </tr>
              <tr>
                <td className="py-2 px-3">1%</td>
                <td className="py-2 px-3 text-center font-mono font-bold">1.628</td>
                <td className="py-2 px-3 text-center font-mono">99%</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="text-center py-2">
          <K m="\text{Отклоняем } H_0 \text{, если } \sqrt{n}\cdot\sup_x|F^*_n(x) - F_0(x)| > c_\alpha" d />
        </div>

        <p className="text-text-dim text-sm leading-relaxed">
          Например, при уровне 5%: если <K m="\sqrt{n}\cdot\sup|F^*_n - F_0| > 1.358" />,
          мы отклоняем гипотезу о том, что данные подчиняются распределению <K m="F_0" />.
        </p>
      </section>

      {/* Section D: KS-test demo */}
      <section className="bg-card rounded-2xl p-6 space-y-4 border border-border">
        <h2 className="text-xl font-bold text-accent">Критерий Колмогорова--Смирнова: демо</h2>
        <p className="text-text-dim text-sm leading-relaxed">
          Выберите <strong>истинное распределение</strong> (из которого генерируется выборка)
          и <strong>гипотезу <K m="H_0" /></strong> (распределение, которое мы проверяем).
          Если они совпадают — тест обычно не отклоняет. Если разные — отклоняет, и тем увереннее,
          чем больше <K m="n" />.
        </p>
        <KSTestDemo />
      </section>
    </div>
  );
}

// ═══════════════════════════════════════════════
// Page: DKW Inequality
// ═══════════════════════════════════════════════
function DKWPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 px-4 md:px-0 pb-12">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-accent mb-2">
          Неравенство DKW
        </h1>
        <p className="text-text-dim text-sm leading-relaxed">
          Скорость сходимости: насколько быстро эмпирическая CDF приближается к истинной.
        </p>
      </div>

      <section className="bg-card rounded-2xl p-6 space-y-4 border border-border">
        <h2 className="text-xl font-bold text-accent">
          Неравенство Дворецкого--Кифера--Вольфовица
        </h2>
        <DKWSection />
      </section>
    </div>
  );
}


// ═══════════════════════════════════════════════
// Router
// ═══════════════════════════════════════════════
import { Routes, Route, Navigate } from 'react-router-dom';

export default function GlivenkoCantelli() {
  return (
    <Routes>
      <Route index element={<Navigate to="empirical" replace />} />
      <Route path="empirical" element={<EmpiricalPage />} />
      <Route path="supremum" element={<SupremumPage />} />
      <Route path="theorem" element={<TheoremPage />} />
      <Route path="kolmogorov" element={<KolmogorovPage />} />
      <Route path="dkw" element={<DKWPage />} />
      <Route path="kde" element={<KDEPage />} />
    </Routes>
  );
}

// ═══════════════════════════════════════════════
// KDE — Kernel Density Estimation
// ═══════════════════════════════════════════════

function KDEPage() {
  const sampleData = [1.2, 3.8, 4.7, 5.1, 5.3, 7.0, 8.5];
  const [h, setH] = useState(1.0);
  const [kernel, setKernel] = useState('gaussian');
  const [probeX, setProbeX] = useState(5.0);
  const [showIndividual, setShowIndividual] = useState(true);
  const canvasRef = useRef(null);

  // Kernel functions
  const kernels = {
    rectangular: { fn: z => Math.abs(z) < 1 ? 0.5 : 0, label: 'Прямоугольное', color: '#c0392b' },
    gaussian: { fn: z => (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-z * z / 2), label: 'Гауссовское', color: '#588157' },
    triangular: { fn: z => Math.abs(z) < 1 ? 1 - Math.abs(z) : 0, label: 'Треугольное', color: '#3498db' },
    epanechnikov: { fn: z => Math.abs(z) < 1 ? 0.75 * (1 - z * z) : 0, label: 'Епанечникова', color: '#b8860b' },
  };

  const K = kernels[kernel].fn;

  // KDE at point x
  const kde = (x) => {
    let sum = 0;
    for (const xi of sampleData) sum += K((x - xi) / h);
    return sum / (h * sampleData.length);
  };

  // Individual kernel contribution
  const kdeContrib = (x, xi) => K((x - xi) / h) / (h * sampleData.length);

  // Probe computation
  const probeContribs = sampleData.map(xi => ({
    xi,
    z: ((probeX - xi) / h).toFixed(2),
    kVal: K((probeX - xi) / h).toFixed(4),
    contrib: kdeContrib(probeX, xi).toFixed(4),
  }));
  const probeTotal = kde(probeX);

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    canvas.width = parent.clientWidth;
    canvas.height = Math.min(parent.clientWidth * 0.55, 420);
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const pad = { l: 50, r: 20, t: 20, b: 40 };
    const pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;

    const xMin = -1, xMax = 11;
    const toX = v => pad.l + (v - xMin) / (xMax - xMin) * pw;
    const toY = v => pad.t + ph - v / 0.45 * ph;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#faf9f5';
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = '#e8e6dc';
    ctx.lineWidth = 1;
    for (let x = 0; x <= 10; x += 2) {
      ctx.beginPath(); ctx.moveTo(toX(x), pad.t); ctx.lineTo(toX(x), pad.t + ph); ctx.stroke();
    }
    for (let y = 0; y <= 0.4; y += 0.1) {
      ctx.beginPath(); ctx.moveTo(pad.l, toY(y)); ctx.lineTo(pad.l + pw, toY(y)); ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = '#6b6b66';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(pad.l, pad.t + ph); ctx.lineTo(pad.l + pw, pad.t + ph); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pad.l, pad.t); ctx.lineTo(pad.l, pad.t + ph); ctx.stroke();

    // X labels
    ctx.fillStyle = '#6b6b66';
    ctx.font = '11px Fira Sans, sans-serif';
    ctx.textAlign = 'center';
    for (let x = 0; x <= 10; x += 2) ctx.fillText(x, toX(x), H - 5);
    // Y labels
    ctx.textAlign = 'right';
    for (let y = 0; y <= 0.4; y += 0.1) ctx.fillText(y.toFixed(1), pad.l - 5, toY(y) + 4);

    const nSteps = 400;
    const dx = (xMax - xMin) / nSteps;

    // Individual kernel contributions (transparent)
    if (showIndividual) {
      const colors = ['#da7756', '#588157', '#3498db', '#b8860b', '#c0392b', '#6b6b66', '#9b59b6'];
      sampleData.forEach((xi, idx) => {
        ctx.beginPath();
        ctx.strokeStyle = colors[idx % colors.length] + '60';
        ctx.lineWidth = 1;
        for (let s = 0; s <= nSteps; s++) {
          const x = xMin + s * dx;
          const y = kdeContrib(x, xi);
          const px = toX(x), py = toY(y);
          if (s === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
      });
    }

    // Sum KDE curve
    ctx.beginPath();
    ctx.strokeStyle = kernels[kernel].color;
    ctx.lineWidth = 3;
    for (let s = 0; s <= nSteps; s++) {
      const x = xMin + s * dx;
      const y = kde(x);
      const px = toX(x), py = toY(y);
      if (s === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Fill under KDE
    ctx.beginPath();
    ctx.moveTo(toX(xMin), toY(0));
    for (let s = 0; s <= nSteps; s++) {
      const x = xMin + s * dx;
      ctx.lineTo(toX(x), toY(kde(x)));
    }
    ctx.lineTo(toX(xMax), toY(0));
    ctx.fillStyle = kernels[kernel].color + '15';
    ctx.fill();

    // Data points on x-axis
    sampleData.forEach(xi => {
      ctx.beginPath();
      ctx.arc(toX(xi), toY(0), 5, 0, Math.PI * 2);
      ctx.fillStyle = '#da7756';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    // Probe line
    ctx.beginPath();
    ctx.strokeStyle = '#c0392b';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.moveTo(toX(probeX), pad.t);
    ctx.lineTo(toX(probeX), pad.t + ph);
    ctx.stroke();
    ctx.setLineDash([]);

    // Probe dot on curve
    ctx.beginPath();
    ctx.arc(toX(probeX), toY(probeTotal), 6, 0, Math.PI * 2);
    ctx.fillStyle = '#c0392b';
    ctx.fill();

    // Probe label
    ctx.fillStyle = '#c0392b';
    ctx.font = 'bold 12px Fira Sans, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`p(${probeX.toFixed(1)}) = ${probeTotal.toFixed(4)}`, toX(probeX) + 10, toY(probeTotal) - 8);

    // Axis labels
    ctx.fillStyle = '#6b6b66';
    ctx.font = '12px Fira Sans, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('x', pad.l + pw / 2, H - 2);
    ctx.save();
    ctx.translate(12, pad.t + ph / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('p(x)', 0, 0);
    ctx.restore();

  }, [h, kernel, probeX, showIndividual]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-accent">Ядерная оценка плотности (KDE)</h2>
      <p className="text-text-dim">Оценка Парзена–Розенблатта: вместо ступенчатой гистограммы — гладкая кривая.</p>

      {/* Formula */}
      <div className="bg-card rounded-2xl p-5 border border-border">
        <K d m={`\\hat{p}_h(x) = \\frac{1}{h \\cdot \\ell} \\sum_{i=1}^{\\ell} K\\left(\\frac{x - x_i}{h}\\right)`} />
        <p className="text-text-dim text-sm mt-2 text-center">
          Для каждой точки выборки xᵢ ставим ядро K с шириной h. Суммируем все вклады.
        </p>
      </div>

      {/* Controls */}
      <div className="bg-card rounded-2xl p-5 border border-border">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Kernel selector */}
          <div>
            <label className="text-sm font-medium block mb-1">Ядро K</label>
            <div className="flex flex-wrap gap-1">
              {Object.entries(kernels).map(([k, v]) => (
                <button key={k} onClick={() => setKernel(k)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${kernel === k ? 'bg-accent text-white' : 'bg-bg border border-border hover:bg-card-hover'}`}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* h slider */}
          <div>
            <label className="text-sm font-medium block mb-1">h = {h.toFixed(2)}</label>
            <input type="range" className="w-full" min="0.1" max="3" step="0.05" value={h}
              onChange={e => setH(+e.target.value)} />
            <div className="flex justify-between text-xs text-text-dim">
              <span>0.1 (переобучение)</span><span>3.0 (размазано)</span>
            </div>
          </div>

          {/* Probe slider */}
          <div>
            <label className="text-sm font-medium block mb-1">Проба x = {probeX.toFixed(1)}</label>
            <input type="range" className="w-full" min="0" max="10" step="0.1" value={probeX}
              onChange={e => setProbeX(+e.target.value)} />
          </div>

          {/* Show individual */}
          <div className="flex items-center gap-2 mt-4">
            <input type="checkbox" id="showInd" checked={showIndividual} onChange={e => setShowIndividual(e.target.checked)} />
            <label htmlFor="showInd" className="text-sm">Показать вклады каждой точки</label>
          </div>
        </div>

        {/* Canvas */}
        <canvas ref={canvasRef} className="w-full rounded-lg border border-border" />
      </div>

      {/* Probe calculation */}
      <div className="bg-card rounded-2xl p-5 border border-border">
        <h3 className="text-lg font-semibold mb-3">Расчёт в точке x = {probeX.toFixed(1)}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="p-2 text-left">xᵢ</th>
                <th className="p-2 text-center">z = (x−xᵢ)/h</th>
                <th className="p-2 text-center">K(z)</th>
                <th className="p-2 text-center">Вклад</th>
              </tr>
            </thead>
            <tbody>
              {probeContribs.map((c, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="p-2 font-medium text-coral">{c.xi}</td>
                  <td className="p-2 text-center">{c.z}</td>
                  <td className="p-2 text-center">{c.kVal}</td>
                  <td className="p-2 text-center font-medium">{c.contrib}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-accent">
                <td colSpan={3} className="p-2 text-right font-semibold">Σ / (h·ℓ) =</td>
                <td className="p-2 text-center font-bold text-accent text-lg">{probeTotal.toFixed(4)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Kernel comparison */}
      <div className="bg-card rounded-2xl p-5 border border-border space-y-3">
        <h3 className="text-lg font-semibold text-accent">Какие ядра бывают</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="bg-bg rounded-xl p-3">
            <p className="font-semibold">Прямоугольное</p>
            <K m={`K(z) = \\tfrac{1}{2},\\;\\lvert z \\rvert < 1`} />
            <p className="text-text-dim mt-1">Ступенчатое. Резкие границы. Как гистограмма.</p>
          </div>
          <div className="bg-bg rounded-xl p-3">
            <p className="font-semibold text-green">Гауссовское</p>
            <K m={`K(z) = \\tfrac{1}{\\sqrt{2\\pi}}\\, e^{-z^2/2}`} />
            <p className="text-text-dim mt-1">Самое популярное. Гладкое, бесконечно дифференцируемое.</p>
          </div>
          <div className="bg-bg rounded-xl p-3">
            <p className="font-semibold">Треугольное</p>
            <K m={`K(z) = 1 - \\lvert z \\rvert,\\;\\lvert z \\rvert < 1`} />
            <p className="text-text-dim mt-1">Плавнее прямоугольного, но с изломами.</p>
          </div>
          <div className="bg-bg rounded-xl p-3">
            <p className="font-semibold">Епанечникова</p>
            <K m={`K(z) = \\tfrac{3}{4}(1 - z^2),\\;\\lvert z \\rvert < 1`} />
            <p className="text-text-dim mt-1">Оптимальное в смысле MSE. Гладкое с компактным носителем.</p>
          </div>
        </div>
      </div>

      {/* h parameter */}
      <div className="bg-card rounded-2xl p-5 border border-border space-y-3">
        <h3 className="text-lg font-semibold text-accent">Параметр h — ширина окна</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div className="bg-red/10 rounded-xl p-3 border border-red/20">
            <p className="font-semibold text-red">h слишком маленький</p>
            <p className="text-text-dim">Каждая точка — отдельный пик. Дёрганая кривая. <strong>Переобучение.</strong></p>
          </div>
          <div className="bg-green/10 rounded-xl p-3 border border-green/20">
            <p className="font-semibold text-green">h в самый раз</p>
            <p className="text-text-dim">Гладкая кривая, отражает реальную форму. Подбирается кросс-валидацией.</p>
          </div>
          <div className="bg-amber/10 rounded-xl p-3 border border-amber/20">
            <p className="font-semibold text-amber">h слишком большой</p>
            <p className="text-text-dim">Всё размазано в блин. Детали потеряны. <strong>Недообучение.</strong></p>
          </div>
        </div>
      </div>
    </div>
  );
}
