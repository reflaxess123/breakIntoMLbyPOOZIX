import { useState, useCallback, useRef, useEffect } from 'react';
import { Histogram } from '../../components/Histogram';
import { CASINO_CLAIM, N_GAMES } from './constants';
import { constrainedMLE, runSimulation } from './math';

// ── Mini comparison chart (robust vs fragile) ──
function ComparisonViz({ curves, tLine }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [w, setW] = useState(0);
  const H = 140;

  useEffect(() => {
    const measure = () => containerRef.current && setW(containerRef.current.clientWidth);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  useEffect(() => {
    if (!w) return;
    const c = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    c.width = w * dpr;
    c.height = H * dpr;
    const ctx = c.getContext('2d');
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#faf9f5';
    ctx.fillRect(0, 0, w, H);

    const pad = { l: 10, r: 10, t: 10, b: 20 };
    const pw = w - pad.l - pad.r;
    const ph = H - pad.t - pad.b;
    const xMax = 5;

    // Gaussian-like curve
    const gauss = (x, mean, spread) => Math.exp(-((x - mean) ** 2) / (2 * spread * spread));

    // Find max for scaling
    let maxY = 0;
    for (const cv of curves) {
      for (let x = 0; x < xMax; x += 0.05) {
        maxY = Math.max(maxY, gauss(x, cv.mean, cv.spread));
      }
    }

    // Draw curves
    for (const cv of curves) {
      ctx.fillStyle = cv.color + '30';
      ctx.strokeStyle = cv.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pad.l, pad.t + ph);
      for (let x = 0; x < xMax; x += 0.03) {
        const y = gauss(x, cv.mean, cv.spread);
        ctx.lineTo(pad.l + (x / xMax) * pw, pad.t + ph - (y / maxY) * ph);
      }
      ctx.lineTo(pad.l + pw, pad.t + ph);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // T line
    const tx = pad.l + (tLine / xMax) * pw;
    ctx.strokeStyle = '#c0392b';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([5, 3]);
    ctx.beginPath();
    ctx.moveTo(tx, pad.t);
    ctx.lineTo(tx, pad.t + ph);
    ctx.stroke();
    ctx.setLineDash([]);

    // Label
    ctx.fillStyle = '#c0392b';
    ctx.font = 'bold 10px Fira Sans, system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('T', tx, pad.t + ph + 14);

    // Axis line
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.l, pad.t + ph);
    ctx.lineTo(pad.l + pw, pad.t + ph);
    ctx.stroke();
  }, [w, curves, tLine]);

  return (
    <div ref={containerRef} className="w-full">
      {w > 0 && <canvas ref={canvasRef} style={{ width: w, height: H }} className="rounded-lg block" />}
    </div>
  );
}

const SYMBOL_SHORT = ['0', 'bar', '×2', '×3', '7', '🍒', '💎'];

// ── Canvas: Parameter space (H₀ as curve, data as distant point) ──
function ParameterSpaceViz() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [w, setW] = useState(0);

  useEffect(() => {
    const measure = () => containerRef.current && setW(containerRef.current.clientWidth);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const H = 360;

  useEffect(() => {
    if (!w) return;
    const c = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    c.width = w * dpr;
    c.height = H * dpr;
    const ctx = c.getContext('2d');
    ctx.scale(dpr, dpr);
    drawParameterSpace(ctx, w, H);
  }, [w]);

  return (
    <div ref={containerRef} className="w-full">
      {w > 0 && <canvas ref={canvasRef} style={{ width: w, height: H }} className="rounded-lg border border-border block" />}
    </div>
  );
}

function drawParameterSpace(ctx, W, H) {
  const bg = '#ffffff';
  const textCol = '#1a1a19';
  const dimCol = '#6b6b66';
  const curveCol = '#da7756';
  const dataCol = '#c0392b';

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const cx = W * 0.45, cy = H * 0.55;

  // Axes
  ctx.strokeStyle = '#e0ddd5';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40, H - 30);
  ctx.lineTo(W - 20, H - 30);
  ctx.moveTo(40, H - 30);
  ctx.lineTo(40, 20);
  ctx.stroke();

  ctx.fillStyle = dimCol;
  ctx.font = '12px Fira Sans, system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('P(бары)', W / 2, H - 8);
  ctx.save();
  ctx.translate(14, H / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('P(семёрки)', 0, 0);
  ctx.restore();

  // H₀ curve (E[R] = 0.92 constraint surface)
  ctx.strokeStyle = curveCol;
  ctx.lineWidth = 3;
  ctx.setLineDash([]);
  ctx.beginPath();
  for (let t = 0; t <= 1; t += 0.01) {
    const x = 60 + t * (W * 0.65);
    const y = H - 50 - (1 - t) * (1 - t) * (H * 0.6) - t * 40;
    t === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Label curve
  ctx.fillStyle = curveCol;
  ctx.font = 'bold 13px Fira Sans, system-ui';
  ctx.textAlign = 'left';
  const labelX = 60 + 0.85 * (W * 0.65);
  const labelY = H - 50 - 0.15 * 0.15 * (H * 0.6) - 0.85 * 40;
  ctx.fillText('H₀: E[R] = 0.92', labelX - 80, labelY - 15);

  // Shaded region around curve
  ctx.fillStyle = 'rgba(218, 119, 86, 0.06)';
  ctx.beginPath();
  for (let t = 0; t <= 1; t += 0.01) {
    const x = 60 + t * (W * 0.65);
    const y = H - 50 - (1 - t) * (1 - t) * (H * 0.6) - t * 40 - 25;
    t === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  for (let t = 1; t >= 0; t -= 0.01) {
    const x = 60 + t * (W * 0.65);
    const y = H - 50 - (1 - t) * (1 - t) * (H * 0.6) - t * 40 + 25;
    ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();

  // Three model points on the curve
  const models = [
    { t: 0.15, name: 'A', color: '#da7756', label: '«Джекпотный»' },
    { t: 0.50, name: 'B', color: '#6a9bcc', label: '«Бриллиантовый»' },
    { t: 0.82, name: 'C', color: '#588157', label: '«Баровый»' },
  ];

  // Data point (far from curve)
  const dataX = W * 0.72, dataY = H * 0.2;

  // Dashed lines from each model to data
  models.forEach((m) => {
    const mx = 60 + m.t * (W * 0.65);
    const my = H - 50 - (1 - m.t) * (1 - m.t) * (H * 0.6) - m.t * 40;

    ctx.strokeStyle = m.color;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(mx, my);
    ctx.lineTo(dataX, dataY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Distance label
    const midX = (mx + dataX) / 2;
    const midY = (my + dataY) / 2;
    ctx.fillStyle = m.color;
    ctx.font = '11px Fira Sans, system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('T ≈ далеко', midX + (m.t < 0.5 ? -15 : 15), midY + (m.t < 0.5 ? -5 : 8));
  });

  // Draw model dots
  models.forEach((m) => {
    const mx = 60 + m.t * (W * 0.65);
    const my = H - 50 - (1 - m.t) * (1 - m.t) * (H * 0.6) - m.t * 40;

    ctx.fillStyle = m.color;
    ctx.beginPath();
    ctx.arc(mx, my, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px Fira Sans, system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(m.name, mx, my + 3.5);

    ctx.fillStyle = m.color;
    ctx.font = '10px Fira Sans, system-ui';
    ctx.fillText(m.label, mx, my + 22);
  });

  // Data point
  ctx.fillStyle = dataCol;
  ctx.beginPath();
  ctx.arc(dataX, dataY, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px Fira Sans, system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('D', dataX, dataY + 4);

  ctx.fillStyle = dataCol;
  ctx.font = 'bold 12px Fira Sans, system-ui';
  ctx.fillText('Данные журналиста', dataX, dataY - 18);

  // Legend
  ctx.fillStyle = textCol;
  ctx.font = '11px Fira Sans, system-ui';
  ctx.textAlign = 'left';
  ctx.fillText('Кривая = все «честные» автоматы (E[R] = 0.92)', 50, 25);
  ctx.fillText('Точка D далеко от ЛЮБОЙ точки на кривой → H₀ отвергается для любой модели', 50, 42);
}

// ── Canvas: Overlaid distributions with same T_real line ──
function OverlaidDistributionsViz({ tReal }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [w, setW] = useState(0);

  useEffect(() => {
    const measure = () => containerRef.current && setW(containerRef.current.clientWidth);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const H = 280;

  useEffect(() => {
    if (!w) return;
    const c = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    c.width = w * dpr;
    c.height = H * dpr;
    const ctx = c.getContext('2d');
    ctx.scale(dpr, dpr);
    drawOverlaid(ctx, w, H, tReal);
  }, [w, tReal]);

  return (
    <div ref={containerRef} className="w-full">
      {w > 0 && <canvas ref={canvasRef} style={{ width: w, height: H }} className="rounded-lg border border-border block" />}
    </div>
  );
}

function chi2like(x, k) {
  // Approximate chi-squared-like density for visualization (no gamma needed)
  if (x <= 0.01) return 0;
  const a = k / 2 - 1;
  return Math.pow(x, a) * Math.exp(-x / 2);
}

function drawOverlaid(ctx, W, H, tReal) {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  const pad = { l: 50, r: 30, t: 40, b: 45 };
  const pw = W - pad.l - pad.r;
  const ph = H - pad.t - pad.b;

  // Three distributions: chi-squared with slightly different df (simulating different models)
  const distributions = [
    { df: 1.0, color: 'rgba(218, 119, 86, 0.5)', name: 'Автомат A', solid: '#da7756' },
    { df: 1.2, color: 'rgba(106, 155, 204, 0.5)', name: 'Автомат B', solid: '#6a9bcc' },
    { df: 0.9, color: 'rgba(88, 129, 87, 0.5)', name: 'Автомат C', solid: '#588157' },
  ];

  const xMax = 6;
  const xScale = pw / xMax;

  // Find max PDF for scaling
  let maxPdf = 0;
  for (let x = 0.05; x < xMax; x += 0.05) {
    for (const d of distributions) {
      maxPdf = Math.max(maxPdf, chi2like(x, d.df));
    }
  }
  const yScale = ph / (maxPdf * 1.1);

  // Axis
  ctx.strokeStyle = '#6b6b66';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad.l, pad.t);
  ctx.lineTo(pad.l, pad.t + ph);
  ctx.lineTo(pad.l + pw, pad.t + ph);
  ctx.stroke();

  // X axis labels
  ctx.fillStyle = '#6b6b66';
  ctx.font = '11px Fira Sans, system-ui';
  ctx.textAlign = 'center';
  for (let x = 0; x <= xMax; x += 1) {
    const sx = pad.l + x * xScale;
    ctx.fillText(x.toString(), sx, H - pad.b + 18);
  }
  ctx.fillText('Значение T', pad.l + pw / 2, H - 5);

  // Y axis label
  ctx.save();
  ctx.translate(14, pad.t + ph / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('Плотность', 0, 0);
  ctx.restore();

  // Draw each distribution as filled curve
  for (const d of distributions) {
    ctx.fillStyle = d.color;
    ctx.beginPath();
    ctx.moveTo(pad.l, pad.t + ph);
    for (let x = 0.02; x < xMax; x += 0.03) {
      const y = chi2like(x, d.df);
      ctx.lineTo(pad.l + x * xScale, pad.t + ph - y * yScale);
    }
    ctx.lineTo(pad.l + xMax * xScale, pad.t + ph);
    ctx.closePath();
    ctx.fill();

    // Outline
    ctx.strokeStyle = d.solid;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0.02; x < xMax; x += 0.03) {
      const y = chi2like(x, d.df);
      const sx = pad.l + x * xScale;
      const sy = pad.t + ph - y * yScale;
      x <= 0.05 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
    }
    ctx.stroke();
  }

  // T_real line
  const tVal = tReal ?? 2.0;
  const tx = pad.l + Math.min(tVal, xMax - 0.2) * xScale;
  ctx.strokeStyle = '#c0392b';
  ctx.lineWidth = 3;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(tx, pad.t);
  ctx.lineTo(tx, pad.t + ph);
  ctx.stroke();
  ctx.setLineDash([]);

  // T_real label
  ctx.fillStyle = '#c0392b';
  ctx.font = 'bold 13px Fira Sans, system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(`T_real = ${tVal.toFixed(2)}`, tx, pad.t - 8);
  ctx.font = '11px Fira Sans, system-ui';
  ctx.fillText('← из данных журналиста', tx, pad.t - 22);

  // Annotation arrow to right tail
  ctx.fillStyle = '#c0392b';
  ctx.font = '11px Fira Sans, system-ui';
  ctx.textAlign = 'left';
  const arrowX = tx + 15;
  const arrowY = pad.t + ph * 0.35;
  ctx.fillText('p-value =', arrowX, arrowY);
  ctx.fillText('площадь справа', arrowX, arrowY + 15);
  ctx.fillText('от линии', arrowX, arrowY + 30);

  // Legend
  const legX = pad.l + pw - 140;
  let legY = pad.t + 15;
  for (const d of distributions) {
    ctx.fillStyle = d.solid;
    ctx.fillRect(legX, legY - 8, 14, 10);
    ctx.fillStyle = '#1a1a19';
    ctx.font = '11px Fira Sans, system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(d.name, legX + 20, legY);
    legY += 18;
  }
}


function MachineCard({ name, subtitle, description, probs, highlight, color }) {
  const maxP = Math.max(...probs);
  return (
    <div className="bg-bg/50 rounded-lg p-4 border border-border">
      <p className="font-semibold text-sm">{name}</p>
      <p className="text-xs mb-3" style={{ color }}>{subtitle}</p>
      <div className="flex items-end gap-1 mb-3" style={{ height: 96 }}>
        {probs.map((p, i) => {
          const h = Math.round((p / maxP) * 96);
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
              <div
                className="w-full rounded-t-sm"
                style={{
                  height: h,
                  backgroundColor: i === highlight ? color : '#d4d0c8',
                  opacity: i === highlight ? 1 : 0.5,
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-1 mb-3">
        {SYMBOL_SHORT.map((s, i) => (
          <div key={i} className="flex-1 text-center text-[9px] text-text-dim">{s}</div>
        ))}
      </div>
      <p className="text-text-dim text-xs leading-relaxed">{description}</p>
    </div>
  );
}

// Three alternative slot machines with different symbol distributions
// We use different "fake" frequency profiles and constrain to E[R] = 0.92
const ALT_FREQ_PROFILES = [
  {
    name: 'Автомат A (больше семёрок)',
    desc: 'Повышены вероятности выпадения семёрок на всех барабанах',
    freqs: [
      [55, 30, 12, 6, 18, 5, 12],
      [65, 8, 18, 12, 16, 3, 16],
      [55, 28, 8, 3, 20, 8, 16],
    ],
  },
  {
    name: 'Автомат B (больше бриллиантов)',
    desc: 'Повышены вероятности выпадения бриллиантов',
    freqs: [
      [50, 25, 10, 6, 8, 5, 34],
      [60, 8, 18, 12, 6, 2, 32],
      [50, 22, 8, 3, 10, 5, 40],
    ],
  },
  {
    name: 'Автомат C (больше баров)',
    desc: 'Повышены вероятности выпадения всех видов баров',
    freqs: [
      [30, 50, 25, 15, 6, 4, 8],
      [35, 40, 28, 20, 5, 2, 8],
      [30, 48, 22, 12, 8, 6, 12],
    ],
  },
];

export function Step4({ tReal }) {
  const [results, setResults] = useState(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  const N_SIM = 2000;

  const handleRun = useCallback(async () => {
    setRunning(true);
    setProgress(0);

    const allResults = [];
    for (let i = 0; i < ALT_FREQ_PROFILES.length; i++) {
      const profile = ALT_FREQ_PROFILES[i];
      const model = constrainedMLE(profile.freqs, CASINO_CLAIM);
      const simData = await runSimulation(
        model, N_SIM, N_GAMES, CASINO_CLAIM,
        (p) => setProgress((i + p) / 3)
      );
      const pVal = simData.filter(t => t >= tReal).length / simData.length;
      allResults.push({ ...profile, simData, pVal, model });
    }

    setResults(allResults);
    setRunning(false);
  }, [tReal]);

  const pValues = results?.map(r => r.pVal) || [];
  const allClose = pValues.length === 3 &&
    Math.max(...pValues) - Math.min(...pValues) < 0.1;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-accent">Шаг 4. Проверка робастности</h2>

      {/* Что такое робастность */}
      <div className="bg-card rounded-xl p-5 border border-border space-y-4">
        <h3 className="text-lg font-semibold">Что вообще такое «робастность»?</h3>
        <p className="text-text-dim leading-relaxed">
          <span className="text-accent font-semibold">Робастность</span> — это устойчивость результата.
          Если мы чуть-чуть поменяем условия эксперимента и вывод останется тем же — значит, результат робастный,
          ему можно доверять. Если при малейшем изменении всё разваливается — результат хрупкий и бесполезный.
        </p>
      </div>

      {/* Зачем это нужно — проблема */}
      <div className="bg-card rounded-xl p-5 border-2 border-amber/40 space-y-4">
        <h3 className="text-lg font-semibold text-amber">В чём проблема с шагом 3?</h3>
        <p className="text-text-dim leading-relaxed">
          На шаге 3 мы получили p-value и сделали вывод. Но вспомни, <em>как</em> мы это сделали:
        </p>
        <ol className="list-decimal list-inside text-text-dim space-y-2 text-sm">
          <li>Взяли <strong>один конкретный</strong> автомат из H₀ (тот, что лучше всего объясняет данные журналиста при E[R] = {CASINO_CLAIM})</li>
          <li>Нагенерировали из него 3000 фейковых выборок</li>
          <li>Построили гистограмму и посчитали p-value</li>
        </ol>
        <p className="text-text-dim leading-relaxed">
          <span className="text-amber font-semibold">Но подожди.</span> Автоматов со средним выигрышем {CASINO_CLAIM} —
          бесконечно много! Они все удовлетворяют H₀, но у них <em>разные вероятности символов</em> на барабанах.
        </p>
        <p className="text-text-dim leading-relaxed">
          Представь: один автомат выдаёт среднее {CASINO_CLAIM} за счёт частых мелких выигрышей (много баров).
          Другой — за счёт редких джекпотов (редкие тройные семёрки, но зато огромные).
          Третий — за счёт бриллиантов. Все они «честные» (E[R] = {CASINO_CLAIM}), но устроены по-разному.
        </p>
      </div>

      {/* Визуализация трёх автоматов */}
      <div className="bg-card rounded-xl p-5 border border-border space-y-4">
        <h3 className="text-lg font-semibold">Три автомата — одно среднее, разное устройство</h3>
        <p className="text-text-dim text-sm">
          Вот как выглядят барабаны каждого автомата (усреднённо по трём барабанам).
          Высота полоски = вероятность символа. Обрати внимание, какой символ доминирует:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MachineCard
            name="Автомат A"
            subtitle="«Джекпотный»"
            description="Много семёрок → редко, но метко. Большинство игр — 0, зато когда выпадают три 7 — выигрыш огромный."
            probs={[0.40, 0.20, 0.09, 0.05, 0.13, 0.04, 0.09]}
            highlight={4}
            color="#da7756"
          />
          <MachineCard
            name="Автомат B"
            subtitle="«Бриллиантовый»"
            description="Много бриллиантов → средние выигрыши чаще. Тройные бриллианты не такие дорогие, но выпадают чаще семёрок."
            probs={[0.37, 0.13, 0.08, 0.05, 0.06, 0.03, 0.28]}
            highlight={6}
            color="#6a9bcc"
          />
          <MachineCard
            name="Автомат C"
            subtitle="«Баровый»"
            description="Много баров → частые мелкие выигрыши по 5. Почти каждая 5-я игра что-то даёт, но по чуть-чуть."
            probs={[0.22, 0.33, 0.18, 0.11, 0.04, 0.03, 0.09]}
            highlight={1}
            color="#588157"
          />
        </div>
        <div className="bg-bg/50 rounded-lg p-4 text-center">
          <p className="text-text-dim text-sm">
            Все три автомата дают <span className="text-accent font-bold">E[R] = {CASINO_CLAIM}</span> —
            но приходят к этому числу <em>совершенно разными путями</em>.
          </p>
          <p className="text-text-dim text-xs mt-2">
            Символы: 0 = пусто, bar, bar×2, bar×3, 7, 🍒, 💎
          </p>
        </div>
      </div>

      {/* Визуализация 1: Пространство параметров */}
      <div className="bg-card rounded-xl p-5 border border-border space-y-4">
        <h3 className="text-lg font-semibold">Пространство всех автоматов</h3>
        <p className="text-text-dim text-sm leading-relaxed">
          Представь, что каждый возможный автомат — это точка на плоскости.
          Все автоматы с E[R] = {CASINO_CLAIM} лежат на одной <span className="text-accent font-semibold">кривой</span> (оранжевая линия).
          Точки A, B, C — три разных «честных» автомата на этой кривой.
          Красная точка D — это то, что показали данные журналиста.
        </p>
        <ParameterSpaceViz />
        <p className="text-text-dim text-sm leading-relaxed">
          <span className="text-coral font-semibold">Смысл:</span> данные журналиста (точка D) далеко от <em>любой</em> точки
          на кривой H₀. Не от одной конкретной — от всей кривой целиком.
          Неважно, какую точку на кривой ты выберешь (A, B или C) — расстояние до D всё равно большое.
          Это и есть робастность: вывод не зависит от выбора модели на кривой.
        </p>
      </div>

      {/* Визуализация 2: Наложенные распределения */}
      <div className="bg-card rounded-xl p-5 border border-border space-y-4">
        <h3 className="text-lg font-semibold">Три распределения, одна красная линия</h3>
        <p className="text-text-dim text-sm leading-relaxed">
          Каждый автомат порождает своё распределение статистики T (свою «гору»).
          Горы немного разной формы — потому что автоматы устроены по-разному.
          Но красная линия (T из данных журналиста) — <strong>одна и та же</strong>.
        </p>
        <OverlaidDistributionsViz tReal={tReal} />
        <p className="text-text-dim text-sm leading-relaxed">
          <span className="text-coral font-semibold">Что видим:</span> красная линия далеко правее
          <em> всех трёх</em> гор. Площадь справа от линии (p-value) — маленькая для каждой горы.
          Если бы одна гора «доставала» до линии, а другая нет — робастности бы не было.
        </p>
      </div>

      {/* Сравнение: робастно vs не робастно */}
      <div className="bg-card rounded-xl p-5 border-2 border-amber/40 space-y-5">
        <h3 className="text-lg font-semibold text-amber">А если бы робастность провалилась?</h3>
        <p className="text-text-dim leading-relaxed">
          Вот конкретный пример. Сравни два случая — когда тест робастный и когда нет:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* GOOD: robust */}
          <div className="border-2 border-green/40 rounded-xl p-4 space-y-3">
            <p className="text-green font-bold text-sm">Наш случай (робастно)</p>
            <p className="text-text-dim text-xs">Казино утверждает E[R] = 0.92, журналист получил 0.384</p>
            <ComparisonViz
              scenario="robust"
              curves={[
                { mean: 0.8, spread: 0.6, color: '#da7756' },
                { mean: 0.9, spread: 0.7, color: '#6a9bcc' },
                { mean: 0.7, spread: 0.5, color: '#588157' },
              ]}
              tLine={3.5}
              labels={['A: p=3%', 'B: p=4%', 'C: p=2%']}
            />
            <div className="space-y-1">
              <p className="text-text-dim text-xs">Автомат A → p = 3% → <span className="text-red font-bold">отвергаем</span></p>
              <p className="text-text-dim text-xs">Автомат B → p = 4% → <span className="text-red font-bold">отвергаем</span></p>
              <p className="text-text-dim text-xs">Автомат C → p = 2% → <span className="text-red font-bold">отвергаем</span></p>
            </div>
            <p className="text-green text-xs font-semibold">Все три говорят одно → доверяем результату</p>
          </div>

          {/* BAD: not robust */}
          <div className="border-2 border-red/40 rounded-xl p-4 space-y-3">
            <p className="text-red font-bold text-sm">Гипотетический случай (НЕ робастно)</p>
            <p className="text-text-dim text-xs">Казино утверждает E[R] = 0.55, журналист получил 0.384</p>
            <ComparisonViz
              scenario="fragile"
              curves={[
                { mean: 0.6, spread: 0.5, color: '#da7756' },
                { mean: 1.4, spread: 1.0, color: '#6a9bcc' },
                { mean: 0.3, spread: 0.3, color: '#588157' },
              ]}
              tLine={1.8}
              labels={['A: p=8%', 'B: p=1%', 'C: p=25%']}
            />
            <div className="space-y-1">
              <p className="text-text-dim text-xs">Автомат A → p = 8% → <span className="text-green font-bold">не отвергаем</span></p>
              <p className="text-text-dim text-xs">Автомат B → p = 1% → <span className="text-red font-bold">отвергаем</span></p>
              <p className="text-text-dim text-xs">Автомат C → p = 25% → <span className="text-green font-bold">не отвергаем</span></p>
            </div>
            <p className="text-red text-xs font-semibold">Результат зависит от случайного выбора модели → мусор</p>
          </div>
        </div>

        <div className="bg-amber/5 rounded-lg p-4 border border-amber/20 space-y-2">
          <p className="text-text font-semibold text-sm">Почему это важно</p>
          <p className="text-text-dim text-sm leading-relaxed">
            В правом случае один автомат говорит «казино врёт», другой — «не врёт».
            Кому верить? <strong>Никому.</strong> Вывод зависит от случайного выбора, который
            сделал <em>ты</em>, а не от данных. Это как подбрасывать монетку вместо анализа данных.
          </p>
          <p className="text-text-dim text-sm leading-relaxed">
            В левом случае — неважно какой автомат выбери, вывод один: «казино врёт».
            Это значит, что <strong>данные</strong> решают, а не твой произвольный выбор модели.
          </p>
        </div>
      </div>

      {/* Суть вопроса */}
      <div className="bg-card rounded-xl p-5 border-2 border-coral/40 space-y-4">
        <h3 className="text-lg font-semibold text-coral">Ключевой вопрос</h3>
        <p className="text-text-dim leading-relaxed text-lg">
          Если бы мы на шаге 3 взяли <em>другой</em> автомат из H₀ — мы бы получили <em>тот же</em> вывод или нет?
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
          <div className="bg-green/5 rounded-lg p-4 border border-green/30">
            <p className="text-green font-semibold text-sm mb-1">Если p-value примерно одинаковый</p>
            <p className="text-text-dim text-sm">
              Неважно, какой автомат мы выбрали — вывод один и тот же.
              Процедура <strong>робастна</strong>. Результату можно доверять.
            </p>
          </div>
          <div className="bg-red/5 rounded-lg p-4 border border-red/30">
            <p className="text-red font-semibold text-sm mb-1">Если p-value сильно скачет</p>
            <p className="text-text-dim text-sm">
              С одним автоматом отвергаем H₀, с другим — нет.
              Процедура <strong>не робастна</strong>. Результат зависит от случайного выбора модели.
            </p>
          </div>
        </div>
      </div>

      {/* Аналогия */}
      <div className="bg-accent-light/30 rounded-xl p-5 border border-accent/20">
        <h3 className="text-lg font-semibold mb-2">Аналогия</h3>
        <p className="text-text-dim leading-relaxed">
          Ты взвешиваешься на одних весах — 75 кг. Это много или мало? Чтобы понять, нужен масштаб (это шаг 3).
          Но если ты взвешиваешься только на <em>одних</em> весах, может они врут?
          Робастность — это когда ты встаёшь на <em>три разных</em> весов и все показывают примерно 75 кг.
          Значит, первые весы не врали, и 75 кг — надёжный результат.
        </p>
      </div>

      {/* Что конкретно делаем */}
      <div className="bg-card rounded-xl p-5 border border-border space-y-3">
        <h3 className="text-lg font-semibold">Что конкретно мы делаем</h3>
        <ol className="list-decimal list-inside text-text-dim space-y-2 text-sm">
          <li>Берём <strong>3 разных</strong> автомата — все с E[R] = {CASINO_CLAIM}, но с разным устройством:
            <ul className="list-disc list-inside ml-5 mt-1 space-y-1">
              <li><strong>Автомат A</strong> — больше семёрок на барабанах (джекпотный)</li>
              <li><strong>Автомат B</strong> — больше бриллиантов (бриллиантовый)</li>
              <li><strong>Автомат C</strong> — больше баров (частые мелкие выигрыши)</li>
            </ul>
          </li>
          <li>Для <strong>каждого</strong> автомата полностью повторяем шаг 3: генерируем {N_SIM} выборок, считаем T, строим гистограмму, получаем p-value</li>
          <li>Сравниваем три p-value между собой</li>
        </ol>
      </div>

      <div className="flex flex-col items-center gap-4">
        <button
          onClick={handleRun}
          disabled={running || !tReal}
          className="px-8 py-3 rounded-xl font-semibold text-lg transition-all
            bg-accent text-bg hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {running
            ? `Проверяем робастность... ${Math.round(progress * 100)}%`
            : `Проверить робастность (3 × ${N_SIM} симуляций)`}
        </button>

        {running && (
          <div className="w-full max-w-md h-2 bg-card rounded-full overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-200 rounded-full"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        )}
      </div>

      {results && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {results.map((r, i) => (
              <div key={i} className="bg-card rounded-xl p-4 border border-border">
                <h4 className="font-semibold text-sm mb-1">{r.name}</h4>
                <p className="text-text-dim text-xs mb-3">{r.desc}</p>
                <Histogram
                  data={r.simData}
                  realValue={tReal}
                  height={220}
                  bins={35}
                />
                <div className="mt-2 text-center">
                  <span className="text-text-dim text-sm">p-value = </span>
                  <span className={`font-mono font-bold ${r.pVal < 0.05 ? 'text-red' : 'text-green'}`}>
                    {r.pVal.toFixed(4)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Comparison table */}
          <div className="bg-card rounded-xl p-5 border border-border">
            <h3 className="text-lg font-semibold mb-3">Сравнение p-value</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              {results.map((r, i) => (
                <div key={i}>
                  <p className="text-text-dim text-xs">{r.name.split('(')[0]}</p>
                  <p className={`text-xl font-mono font-bold ${r.pVal < 0.05 ? 'text-red' : 'text-green'}`}>
                    {(r.pVal * 100).toFixed(2)}%
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className={`rounded-xl p-5 border-2 ${
            allClose
              ? 'bg-green/10 border-green/50'
              : 'bg-amber/10 border-amber/50'
          }`}>
            <p className={`font-bold text-lg ${allClose ? 'text-green' : 'text-amber'}`}>
              {allClose
                ? 'Результат устойчив!'
                : 'Результат может зависеть от выбора модели'
              }
            </p>
            <p className="text-text-dim mt-2">
              {allClose
                ? `p-value для всех трёх автоматов близки друг к другу
                   (${pValues.map(p => (p * 100).toFixed(1) + '%').join(', ')}).
                   Это значит, что наш вывод не зависит от конкретного выбора модели из H₀ —
                   процедура робастна, результату можно доверять.`
                : `p-value заметно различаются между автоматами
                   (${pValues.map(p => (p * 100).toFixed(1) + '%').join(', ')}).
                   Результат может зависеть от того, какую именно модель из H₀ мы выбрали.`
              }
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
