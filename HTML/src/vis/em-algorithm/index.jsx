import { useState, useRef, useEffect, useCallback } from 'react';
import { K } from '../../components/Latex';

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

// ── Main component ──
export default function EMAlgorithm() {
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
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold text-text">
        EM-алгоритм: смесь гауссиан
      </h1>

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
