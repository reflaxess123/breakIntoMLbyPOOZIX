import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { K } from '../../components/Latex';

// ══════════════════════════════════════════════════════════════
// Constants from the slot machine problem
// ══════════════════════════════════════════════════════════════

const SYMBOLS = ['0', 'bar', 'bar×2', 'bar×3', '7', '🍒', '💎'];
const SYMBOL_COLORS = ['#94a3b8', '#b8860b', '#d4a017', '#e6b800', '#c0392b', '#e74c3c', '#3498db'];

const OBSERVED = [
  [59, 49, 14, 6, 6, 1, 3],
  [85, 8, 24, 16, 4, 0, 1],
  [77, 39, 6, 1, 7, 3, 5],
];
const N = 138;

// ══════════════════════════════════════════════════════════════
// Vis 1: Three reels with symbol probabilities
// ══════════════════════════════════════════════════════════════

function ReelsViz({ probs, label, color }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [w, setW] = useState(0);
  const H = 200;

  useEffect(() => {
    const ro = new ResizeObserver(entries => {
      for (const e of entries) setW(e.contentRect.width);
    });
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!w || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#faf9f5';
    ctx.fillRect(0, 0, w, H);

    const pad = { l: 10, r: 10, t: 30, b: 30 };
    const reelW = (w - pad.l - pad.r - 20) / 3;
    const reelH = H - pad.t - pad.b;

    // Title
    ctx.fillStyle = color || '#da7756';
    ctx.font = 'bold 13px Fira Sans, system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(label || 'Барабаны', w / 2, 18);

    for (let r = 0; r < 3; r++) {
      const rx = pad.l + r * (reelW + 10);

      // Reel background
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.roundRect(rx, pad.t, reelW, reelH, 8);
      ctx.fill();
      ctx.strokeStyle = '#e8e6dc';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Reel label
      ctx.fillStyle = '#6b6b66';
      ctx.font = '10px Fira Sans, system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(`Барабан ${r + 1}`, rx + reelW / 2, H - 8);

      // Draw bars for each symbol
      const barMaxH = reelH - 10;
      const barW = (reelW - 10) / 7;
      const maxP = Math.max(...probs[r]);

      for (let s = 0; s < 7; s++) {
        const bx = rx + 5 + s * barW;
        const p = probs[r][s];
        const bh = maxP > 0 ? (p / maxP) * barMaxH * 0.85 : 0;
        const by = pad.t + reelH - 5 - bh;

        ctx.fillStyle = SYMBOL_COLORS[s] + '80';
        ctx.fillRect(bx + 1, by, barW - 2, bh);

        // Probability on top
        if (barW > 12 && p > 0) {
          ctx.fillStyle = '#1a1a19';
          ctx.font = `${Math.min(9, barW - 2)}px Fira Sans, system-ui`;
          ctx.textAlign = 'center';
          ctx.fillText(p.toFixed(2), bx + barW / 2, by - 2);
        }
      }
    }
  }, [w, probs, label, color]);

  return (
    <div ref={containerRef} className="w-full">
      {w > 0 && <canvas ref={canvasRef} style={{ width: w, height: H }} className="rounded-lg block" />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Vis 2: The integral visualization — many θ points contributing
// ══════════════════════════════════════════════════════════════

function MarginalIntegralViz() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [w, setW] = useState(0);
  const [hovIdx, setHovIdx] = useState(-1);
  const H = 300;

  useEffect(() => {
    const ro = new ResizeObserver(entries => {
      for (const e of entries) setW(e.contentRect.width);
    });
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Generate 8 sample θ configurations that all have E[R] ≈ 0.92
  // (simplified: just vary the seven probability on reel 1)
  const samples = useMemo(() => {
    const base = OBSERVED.map(r => r.map(n => n / N));
    const configs = [];
    const sevens = [0.03, 0.04, 0.05, 0.06, 0.07, 0.08, 0.10, 0.12];

    for (const s7 of sevens) {
      const p = base.map(r => [...r]);
      // Adjust reel 1: increase seven (idx 4), decrease blank (idx 0)
      const diff = s7 - p[0][4];
      p[0][4] = s7;
      p[0][0] = Math.max(0.01, p[0][0] - diff);
      // Normalize
      const sum = p[0].reduce((a, b) => a + b, 0);
      for (let i = 0; i < 7; i++) p[0][i] /= sum;

      // Compute log-likelihood
      let ll = 0;
      for (let r = 0; r < 3; r++) {
        for (let k = 0; k < 7; k++) {
          if (OBSERVED[r][k] > 0 && p[r][k] > 0) {
            ll += OBSERVED[r][k] * Math.log(p[r][k]);
          }
        }
      }

      configs.push({
        probs: p,
        seven: s7,
        ll,
        likelihood: Math.exp(ll + 520), // shift for display (raw ll ≈ -515)
        prior: 1.0 / sevens.length,
      });
    }
    return configs;
  }, []);

  const marginal = useMemo(() =>
    samples.reduce((s, c) => s + c.likelihood * c.prior, 0), [samples]);

  useEffect(() => {
    if (!w || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#faf9f5';
    ctx.fillRect(0, 0, w, H);

    const pad = { l: 60, r: 20, t: 40, b: 55 };
    const pw = w - pad.l - pad.r;
    const ph = H - pad.t - pad.b;

    const maxL = Math.max(...samples.map(s => s.likelihood));

    // Draw bars
    const n = samples.length;
    const barW = pw / n;

    for (let i = 0; i < n; i++) {
      const s = samples[i];
      const bh = (s.likelihood / maxL) * ph * 0.9;
      const bx = pad.l + i * barW;
      const by = pad.t + ph - bh;
      const isHov = hovIdx === i;

      // Bar: likelihood
      ctx.fillStyle = isHov ? '#da775690' : '#da775640';
      ctx.fillRect(bx + 2, by, barW - 4, bh);
      ctx.strokeStyle = '#da7756';
      ctx.lineWidth = isHov ? 2 : 1;
      ctx.strokeRect(bx + 2, by, barW - 4, bh);

      // Prior weight (thin accent bar on top)
      const priorH = 4;
      ctx.fillStyle = '#588157';
      ctx.fillRect(bx + 2, by - priorH - 2, barW - 4, priorH);

      // Labels
      ctx.fillStyle = '#1a1a19';
      ctx.font = `${isHov ? 'bold ' : ''}10px Fira Sans, system-ui`;
      ctx.textAlign = 'center';

      // θ label
      ctx.fillText(`P(7)=${s.seven.toFixed(2)}`, bx + barW / 2, pad.t + ph + 15);

      // Likelihood value
      if (barW > 40) {
        ctx.fillStyle = '#da7756';
        ctx.fillText(`L=${s.likelihood.toFixed(1)}`, bx + barW / 2, by - 10);
      }

      // Contribution
      const contrib = s.likelihood * s.prior;
      ctx.fillStyle = '#6b6b66';
      ctx.font = '9px Fira Sans, system-ui';
      ctx.fillText(`${(contrib / marginal * 100).toFixed(1)}%`, bx + barW / 2, pad.t + ph + 28);
    }

    // Axes
    ctx.strokeStyle = '#1a1a19';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.l, pad.t);
    ctx.lineTo(pad.l, pad.t + ph);
    ctx.lineTo(pad.l + pw, pad.t + ph);
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#6b6b66';
    ctx.font = '11px Fira Sans, system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('θ (разные настройки автомата с E[R] ≈ 0.92)', pad.l + pw / 2, H - 5);

    ctx.save();
    ctx.translate(15, pad.t + ph / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('P(данные|θ) — likelihood', 0, 0);
    ctx.restore();

    // Title
    ctx.fillStyle = '#1a1a19';
    ctx.font = 'bold 13px Fira Sans, system-ui';
    ctx.textAlign = 'left';
    ctx.fillText('8 автоматов из H₀ (все с E[R] ≈ 0.92)', pad.l + 5, pad.t + 15);

    // Marginal
    ctx.textAlign = 'right';
    ctx.fillStyle = '#588157';
    ctx.fillText(`Маргинальное правдоподобие = ${marginal.toFixed(2)}`, pad.l + pw - 5, pad.t + 15);

  }, [w, samples, hovIdx, marginal]);

  const handleMove = useCallback((e) => {
    if (!canvasRef.current || !w) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pad = { l: 60, r: 20 };
    const pw = w - pad.l - pad.r;
    const rel = (x - pad.l) / pw;
    if (rel >= 0 && rel <= 1) setHovIdx(Math.floor(rel * samples.length));
    else setHovIdx(-1);
  }, [w, samples.length]);

  return (
    <div ref={containerRef} className="w-full">
      {w > 0 && (
        <canvas ref={canvasRef} style={{ width: w, height: H }}
          onMouseMove={handleMove} onMouseLeave={() => setHovIdx(-1)}
          className="rounded-lg block border border-border cursor-crosshair" />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Main Page
// ══════════════════════════════════════════════════════════════

export default function CasinoMarginalPage() {
  const mleProbs = useMemo(() => OBSERVED.map(r => r.map(n => n / N)), []);

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-accent mb-2">Формула полной вероятности на примере казино</h1>
        <p className="text-text-dim italic">Как интеграл работает с 18-мерным пространством параметров.</p>
      </div>

      {/* Step 1: The data */}
      <div className="bg-card rounded-2xl p-6 border border-border space-y-4">
        <h2 className="text-lg font-bold text-accent">Шаг 1. Данные журналиста → MLE</h2>
        <p className="text-text leading-relaxed">
          Журналист сыграл 138 игр. На каждом барабане посчитали, сколько раз выпал каждый символ.
          Делим на 138 — получаем <strong>MLE-вероятности</strong> (лучшая модель без ограничений).
        </p>
        <ReelsViz probs={mleProbs} label="MLE: лучшая модель (без ограничений)" color="#da7756" />

        <div className="bg-bg rounded-xl p-4">
          <p className="text-sm text-text">
            <strong>21 параметр:</strong> 7 символов × 3 барабана.<br />
            <strong>18 свободных:</strong> на каждом барабане 7 вероятностей, но сумма = 1, значит свободных = 6 на барабан × 3 = 18.<br />
            <strong>E[R] ≈ 0.647</strong> — среднее при этих вероятностях. Казино утверждает 0.92.
          </p>
        </div>
      </div>

      {/* Step 2: H₀ constraint */}
      <div className="bg-card rounded-2xl p-6 border border-border space-y-4">
        <h2 className="text-lg font-bold text-accent">Шаг 2. Гипотеза H₀: E[R] = 0.92</h2>

        <p className="text-text leading-relaxed">
          H₀ говорит: «среднее выигрыша = 0.92». Но это <strong>не фиксирует вероятности символов!</strong>
          Среднее 0.92 можно получить бесконечным числом способов:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-bg rounded-xl p-3 text-center">
            <p className="font-bold text-red text-sm">Автомат «Джекпотный»</p>
            <p className="text-xs text-text-dim">Много семёрок → редкие джекпоты по 2862</p>
            <p className="text-xs text-text-dim">P(7) ≈ 0.12 на каждом барабане</p>
          </div>
          <div className="bg-bg rounded-xl p-3 text-center">
            <p className="font-bold text-amber text-sm">Автомат «Баровый»</p>
            <p className="text-xs text-text-dim">Много баров → частые выигрыши по 2-5</p>
            <p className="text-xs text-text-dim">P(bar*) ≈ 0.6 на каждом</p>
          </div>
          <div className="bg-bg rounded-xl p-3 text-center">
            <p className="font-bold text-blue-500 text-sm">Автомат «Бриллиантовый»</p>
            <p className="text-xs text-text-dim">Много 💎 → средние выигрыши</p>
            <p className="text-xs text-text-dim">P(💎) ≈ 0.08 на каждом</p>
          </div>
        </div>

        <div className="bg-bg rounded-xl p-4">
          <p className="text-text">
            Все три дают <strong>E[R] = 0.92</strong>, но вероятности символов — разные.
            Каждый автомат — это одна точка <K m="\theta" /> в 18-мерном пространстве.
            Гипотеза H₀ — <strong>множество</strong> всех таких точек. Это сложная гипотеза.
          </p>
        </div>
      </div>

      {/* Step 3: The integral */}
      <div className="bg-card rounded-2xl p-6 border border-border space-y-4">
        <h2 className="text-lg font-bold text-accent">Шаг 3. Интеграл — усреднение по всем автоматам</h2>

        <p className="text-text leading-relaxed">
          Для каждого автомата θ внутри H₀ мы можем посчитать: «насколько хорошо ОН объясняет данные журналиста?»
          Это <K m="P(\text{данные}|\theta)" /> — likelihood.
        </p>

        <div className="bg-bg rounded-xl p-4">
          <K d m="P(\text{данные}|H_0) = \int_{\Theta:\, E[R]=0.92} \underbrace{P(\text{данные}|\theta)}_{\text{likelihood автомата } \theta} \cdot \underbrace{p(\theta)}_{\text{вес автомата}} \, d\theta" />
        </div>

        <p className="text-text leading-relaxed">
          Это формула полной вероятности. Для каждого автомата θ: умножаем его likelihood на его prior-вес,
          и суммируем по всем автоматам. Получаем одно число — <strong>маргинальное правдоподобие H₀</strong>.
        </p>

        <MarginalIntegralViz />
        <p className="text-sm text-text-dim">
          8 примерных автоматов с E[R] ≈ 0.92 (различаются P(7) на барабане 1).
          Высота столбика = likelihood (насколько хорошо данные журналиста объясняются этим автоматом).
          Процент внизу = вклад в маргинальное правдоподобие.
        </p>
      </div>

      {/* Step 4: Why 18 dimensions is hard */}
      <div className="bg-card rounded-2xl p-6 border border-border space-y-4">
        <h2 className="text-lg font-bold text-accent">Шаг 4. Почему это сложно</h2>

        <div className="space-y-3 text-text leading-relaxed">
          <p>
            На графике выше — 8 автоматов. Но реально их <strong>бесконечно</strong>.
            Параметр θ — это 18 чисел, и интеграл идёт по 18-мерному пространству.
          </p>

          <p>
            Посчитать такой интеграл аналитически — <strong>невозможно</strong>.
            Поэтому используют приближения:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-bg rounded-xl p-4">
              <p className="font-bold text-accent mb-1">Что делали в лекции</p>
              <p className="text-sm">
                Вместо интеграла по всем θ — нашли <strong>одну лучшую точку</strong> (constrained MLE).
                Быстро, но грубо: мы выбрали один автомат вместо усреднения по всем.
              </p>
            </div>
            <div className="bg-bg rounded-xl p-4">
              <p className="font-bold text-green mb-1">Полный байесовский подход</p>
              <p className="text-sm">
                <strong>MCMC</strong> (Монте-Карло по марковским цепям): генерируем случайные θ из posterior,
                усредняем. Точнее, но в тысячи раз дороже по вычислениям.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-card rounded-2xl p-6 border border-border space-y-4">
        <h2 className="text-lg font-bold text-accent">Итого: вся цепочка</h2>
        <div className="space-y-2 text-text">
          <div className="flex items-start gap-3">
            <span className="text-accent font-bold shrink-0">1.</span>
            <p>Данные журналиста → 138 игр, частоты символов на каждом барабане</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-accent font-bold shrink-0">2.</span>
            <p>21 параметр (18 свободных) — вероятности символов = одна точка θ</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-accent font-bold shrink-0">3.</span>
            <p>H₀: E[R] = 0.92 → множество точек θ в 18-мерном пространстве (сложная гипотеза)</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-accent font-bold shrink-0">4.</span>
            <p>Для каждого θ: считаем P(данные|θ) · p(θ) — вклад этого автомата</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-accent font-bold shrink-0">5.</span>
            <p>Интегрируем (суммируем) все вклады → маргинальное правдоподобие P(данные|H₀)</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-accent font-bold shrink-0">6.</span>
            <p>Сравниваем с P(данные|H₁) через Байес-фактор → решаем врёт казино или нет</p>
          </div>
        </div>
      </div>
    </div>
  );
}
