import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { K } from '../../components/Latex';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// ══════════════════════════════════════════════════════════════
// Total Probability Visualization (circle with "machines" inside)
// ══════════════════════════════════════════════════════════════

function TotalProbViz() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [hovered, setHovered] = useState(-1);
  const [w, setW] = useState(0);

  // "Machines" inside the complex hypothesis
  const machines = useMemo(() => [
    { theta: 0.3, prior: 0.15, likelihood: 0.08, label: 'θ₁=0.3', color: '#da7756' },
    { theta: 0.5, prior: 0.30, likelihood: 0.25, label: 'θ₂=0.5', color: '#588157' },
    { theta: 0.7, prior: 0.35, likelihood: 0.35, label: 'θ₃=0.7', color: '#4a90d9' },
    { theta: 0.9, prior: 0.15, likelihood: 0.12, label: 'θ₄=0.9', color: '#b8860b' },
    { theta: 0.1, prior: 0.05, likelihood: 0.01, label: 'θ₅=0.1', color: '#c0392b' },
  ], []);

  const marginal = useMemo(() =>
    machines.reduce((s, m) => s + m.likelihood * m.prior, 0), [machines]);

  useEffect(() => {
    const ro = new ResizeObserver(entries => {
      for (const e of entries) setW(e.contentRect.width);
    });
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const H = 420;

  useEffect(() => {
    if (!w || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const cx = w / 2;
    const cy = H / 2;
    const R = Math.min(w, H) * 0.38;

    // Background
    ctx.fillStyle = '#faf9f5';
    ctx.fillRect(0, 0, w, H);

    // Big circle = complex hypothesis
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(218, 119, 86, 0.08)';
    ctx.fill();
    ctx.strokeStyle = '#da7756';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Label
    ctx.fillStyle = '#da7756';
    ctx.font = 'bold 14px Fira Sans, system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Сложная гипотеза H₀: E[R] = 0.92', cx, cy - R - 15);

    // Draw machines as circles inside
    const angles = machines.map((_, i) => (i / machines.length) * Math.PI * 2 - Math.PI / 2);
    const innerR = R * 0.55;

    machines.forEach((m, i) => {
      const angle = angles[i];
      const mx = cx + innerR * Math.cos(angle);
      const my = cy + innerR * Math.sin(angle);
      const mr = 18 + m.prior * 60; // size proportional to prior weight

      const isHov = hovered === i;

      // Circle for machine
      ctx.beginPath();
      ctx.arc(mx, my, mr, 0, Math.PI * 2);
      ctx.fillStyle = isHov ? m.color + '40' : m.color + '20';
      ctx.fill();
      ctx.strokeStyle = m.color;
      ctx.lineWidth = isHov ? 3 : 1.5;
      ctx.stroke();

      // Label
      ctx.fillStyle = m.color;
      ctx.font = `${isHov ? 'bold ' : ''}12px Fira Sans, system-ui`;
      ctx.textAlign = 'center';
      ctx.fillText(m.label, mx, my - mr - 5);

      // Weight
      ctx.fillStyle = '#6b6b66';
      ctx.font = '11px Fira Sans, system-ui';
      ctx.fillText(`вес: ${(m.prior * 100).toFixed(0)}%`, mx, my + 4);
      ctx.fillText(`L: ${m.likelihood.toFixed(2)}`, mx, my + 18);

      // Contribution bar below
      const contrib = m.likelihood * m.prior;
      const barW = (contrib / marginal) * 100;
      ctx.fillStyle = isHov ? m.color : m.color + '80';
      const barX = mx - 25;
      const barY = my + mr + 8;
      ctx.fillRect(barX, barY, Math.max(4, barW * 0.5), 6);
      ctx.fillStyle = '#6b6b66';
      ctx.font = '9px Fira Sans, system-ui';
      ctx.fillText(`${(contrib / marginal * 100).toFixed(1)}%`, mx, barY + 16);
    });

    // Marginal likelihood at bottom
    ctx.fillStyle = '#1a1a19';
    ctx.font = 'bold 13px Fira Sans, system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(`Маргинальное правдоподобие = ${marginal.toFixed(4)}`, cx, H - 15);
    ctx.font = '11px Fira Sans, system-ui';
    ctx.fillStyle = '#6b6b66';
    ctx.fillText('Σ P(данные|θᵢ) · P(θᵢ) по всем автоматам внутри круга', cx, H - 0);

  }, [w, machines, hovered, marginal]);

  const handleMove = useCallback((e) => {
    if (!canvasRef.current || !w) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = w / 2, cy = H / 2, R = Math.min(w, H) * 0.38;
    const innerR = R * 0.55;
    const angles = machines.map((_, i) => (i / machines.length) * Math.PI * 2 - Math.PI / 2);

    let found = -1;
    machines.forEach((m, i) => {
      const mx = cx + innerR * Math.cos(angles[i]);
      const my = cy + innerR * Math.sin(angles[i]);
      const dist = Math.hypot(x - mx, y - my);
      if (dist < 30) found = i;
    });
    setHovered(found);
  }, [w, machines]);

  return (
    <div ref={containerRef} className="w-full">
      {w > 0 && (
        <canvas ref={canvasRef} style={{ width: w, height: H }}
          onMouseMove={handleMove} onMouseLeave={() => setHovered(-1)}
          className="rounded-lg block cursor-crosshair" />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Discrete → Continuous animation
// ══════════════════════════════════════════════════════════════

function DiscreteToContinuous() {
  const [nBars, setNBars] = useState(5);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [w, setW] = useState(0);

  useEffect(() => {
    const ro = new ResizeObserver(entries => {
      for (const e of entries) setW(e.contentRect.width);
    });
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const H = 280;

  useEffect(() => {
    if (!w || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const pad = { l: 50, r: 20, t: 30, b: 40 };
    const pw = w - pad.l - pad.r;
    const ph = H - pad.t - pad.b;

    ctx.fillStyle = '#faf9f5';
    ctx.fillRect(0, 0, w, H);

    // f(theta) = Beta(3,5) as an example posterior
    function betaLike(x) {
      if (x <= 0 || x >= 1) return 0;
      return Math.pow(x, 2) * Math.pow(1 - x, 4) * 60; // Beta(3,5) unnormalized * constant
    }

    // Draw bars
    const barW = pw / nBars;
    let maxH = 0;
    for (let i = 0; i < nBars; i++) {
      const x0 = i / nBars;
      const x1 = (i + 1) / nBars;
      const xm = (x0 + x1) / 2;
      const h = betaLike(xm);
      maxH = Math.max(maxH, h);
    }

    for (let i = 0; i < nBars; i++) {
      const x0 = i / nBars;
      const x1 = (i + 1) / nBars;
      const xm = (x0 + x1) / 2;
      const h = betaLike(xm);
      const barH = (h / (maxH * 1.1)) * ph;

      ctx.fillStyle = 'rgba(218, 119, 86, 0.3)';
      ctx.fillRect(pad.l + i * barW, pad.t + ph - barH, barW - 2, barH);
      ctx.strokeStyle = '#da7756';
      ctx.lineWidth = 1;
      ctx.strokeRect(pad.l + i * barW, pad.t + ph - barH, barW - 2, barH);

      // Label
      ctx.fillStyle = '#6b6b66';
      ctx.font = '10px Fira Sans, system-ui';
      ctx.textAlign = 'center';
      if (nBars <= 20) {
        ctx.fillText(`θ${i + 1}`, pad.l + i * barW + barW / 2, pad.t + ph + 15);
      }
    }

    // Smooth curve on top
    ctx.beginPath();
    ctx.strokeStyle = '#588157';
    ctx.lineWidth = 2;
    for (let px = 0; px <= pw; px++) {
      const x = px / pw;
      const y = betaLike(x);
      const screenY = pad.t + ph - (y / (maxH * 1.1)) * ph;
      if (px === 0) ctx.moveTo(pad.l + px, screenY);
      else ctx.lineTo(pad.l + px, screenY);
    }
    ctx.stroke();

    // Axes
    ctx.strokeStyle = '#1a1a19';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.l, pad.t);
    ctx.lineTo(pad.l, pad.t + ph);
    ctx.lineTo(pad.l + pw, pad.t + ph);
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#1a1a19';
    ctx.font = '12px Fira Sans, system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('θ', pad.l + pw / 2, H - 5);

    ctx.save();
    ctx.translate(15, pad.t + ph / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('P(данные|θ)·P(θ)', 0, 0);
    ctx.restore();

    // Title
    ctx.fillStyle = '#da7756';
    ctx.font = 'bold 13px Fira Sans, system-ui';
    ctx.textAlign = 'left';
    const title = nBars <= 10 ? `${nBars} автоматов → сумма` : nBars <= 50 ? `${nBars} автоматов → уже похоже на интеграл` : `${nBars} автоматов → интеграл!`;
    ctx.fillText(title, pad.l + 5, pad.t + 15);

  }, [w, nBars]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <label className="text-sm text-text-dim whitespace-nowrap">Автоматов: {nBars}</label>
        <input type="range" min="3" max="200" step="1" value={nBars}
          onChange={e => setNBars(+e.target.value)} className="w-full accent-accent" />
      </div>
      <div ref={containerRef} className="w-full">
        {w > 0 && (
          <canvas ref={canvasRef} style={{ width: w, height: H }}
            className="rounded-lg block border border-border" />
        )}
      </div>
      <p className="text-sm text-text-dim">
        {nBars <= 10
          ? 'Мало автоматов — грубая сумма. Каждый столбик = вклад одного θ.'
          : nBars <= 50
            ? 'Больше автоматов — сумма точнее. Столбики сужаются, приближаясь к кривой.'
            : 'Бесконечно много автоматов → столбики сливаются в непрерывную кривую → сумма становится интегралом.'}
      </p>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Boxes Visualization: Discrete ↔ Continuous toggle
// ══════════════════════════════════════════════════════════════

const BOXES = [
  { w: 3, b: 7, label: 'H₁' },
  { w: 5, b: 5, label: 'H₂' },
  { w: 8, b: 2, label: 'H₃' },
  { w: 2, b: 8, label: 'H₄' },
  { w: 6, b: 4, label: 'H₅' },
];

function BoxesViz() {
  const [continuous, setContinuous] = useState(false);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [w, setW] = useState(0);
  const H = 320;

  useEffect(() => {
    const ro = new ResizeObserver(entries => {
      for (const e of entries) setW(e.contentRect.width);
    });
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const condProb = (theta) => 0.5 + 0.4 * Math.sin(2 * Math.PI * theta);

  const discreteTotal = useMemo(() => {
    const pH = 1 / BOXES.length;
    return BOXES.reduce((s, box) => s + pH * box.w / (box.w + box.b), 0);
  }, []);

  const continuousTotal = useMemo(() => {
    let s = 0;
    const steps = 1000;
    for (let i = 0; i < steps; i++) s += condProb(i / steps) / steps;
    return s;
  }, []);

  useEffect(() => {
    if (!w || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const pad = { l: 10, r: 10, t: 20, b: 50 };
    const pw = w - pad.l - pad.r;
    const ph = H - pad.t - pad.b;

    ctx.fillStyle = '#faf9f5';
    ctx.fillRect(0, 0, w, H);

    if (!continuous) {
      // Discrete: boxes with white/black balls
      const n = BOXES.length;
      const boxW = Math.min(80, (pw - (n - 1) * 12) / n);
      const totalW = n * boxW + (n - 1) * 12;
      const startX = pad.l + (pw - totalW) / 2;

      BOXES.forEach((box, i) => {
        const x = startX + i * (boxW + 12);
        const total = box.w + box.b;
        const ratio = box.w / total;
        const maxBarH = ph * 0.85;
        const barH = maxBarH;
        const whiteH = barH * ratio;
        const blackH = barH * (1 - ratio);
        const barY = pad.t + (ph - barH);

        // Black part (bottom)
        ctx.fillStyle = '#374151';
        ctx.beginPath();
        ctx.roundRect(x, barY + whiteH, boxW, blackH, [0, 0, 6, 6]);
        ctx.fill();

        // White/accent part (top)
        ctx.fillStyle = '#da7756';
        ctx.beginPath();
        ctx.roundRect(x, barY, boxW, whiteH, [6, 6, 0, 0]);
        ctx.fill();

        // Border
        ctx.strokeStyle = '#e8e6dc';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(x, barY, boxW, barH, 6);
        ctx.stroke();

        // Ratio text inside
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 13px Fira Sans, system-ui';
        ctx.textAlign = 'center';
        if (whiteH > 20) {
          ctx.fillText(`${box.w}W`, x + boxW / 2, barY + whiteH / 2 + 5);
        }
        if (blackH > 20) {
          ctx.fillText(`${box.b}B`, x + boxW / 2, barY + whiteH + blackH / 2 + 5);
        }

        // Label below
        ctx.fillStyle = '#6b6b66';
        ctx.font = '12px Fira Sans, system-ui';
        ctx.fillText(box.label, x + boxW / 2, H - pad.b + 18);

        // P(B|Hi) below label
        ctx.fillStyle = '#da7756';
        ctx.font = '11px Fira Sans, system-ui';
        ctx.fillText(`P(B|${box.label})=${ratio.toFixed(1)}`, x + boxW / 2, H - pad.b + 33);
      });

      // Result
      ctx.fillStyle = '#1a1a19';
      ctx.font = 'bold 14px Fira Sans, system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(`P(B) = ${discreteTotal.toFixed(3)}`, w / 2, pad.t + 14);

    } else {
      // Continuous: area under curve
      const plotL = pad.l + 40;
      const plotR = w - pad.r;
      const plotW = plotR - plotL;
      const plotT = pad.t + 10;
      const plotH = ph - 10;

      // Fill area
      ctx.beginPath();
      ctx.moveTo(plotL, plotT + plotH);
      for (let px = 0; px <= plotW; px++) {
        const theta = px / plotW;
        const pB = condProb(theta);
        ctx.lineTo(plotL + px, plotT + plotH - pB * plotH * 0.85);
      }
      ctx.lineTo(plotR, plotT + plotH);
      ctx.closePath();
      ctx.fillStyle = 'rgba(218, 119, 86, 0.15)';
      ctx.fill();

      // Curve
      ctx.beginPath();
      for (let px = 0; px <= plotW; px++) {
        const theta = px / plotW;
        const pB = condProb(theta);
        const y = plotT + plotH - pB * plotH * 0.85;
        if (px === 0) ctx.moveTo(plotL + px, y);
        else ctx.lineTo(plotL + px, y);
      }
      ctx.strokeStyle = '#da7756';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Axes
      ctx.strokeStyle = '#1a1a19';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(plotL, plotT);
      ctx.lineTo(plotL, plotT + plotH);
      ctx.lineTo(plotR, plotT + plotH);
      ctx.stroke();

      // X labels
      ctx.fillStyle = '#6b6b66';
      ctx.font = '11px Fira Sans, system-ui';
      ctx.textAlign = 'center';
      for (let i = 0; i <= 4; i++) {
        const x = plotL + (i / 4) * plotW;
        ctx.fillText((i / 4).toFixed(1), x, plotT + plotH + 18);
      }
      ctx.fillText('θ', plotL + plotW / 2, H - 5);

      // Y label
      ctx.save();
      ctx.translate(15, plotT + plotH / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.fillText('p(B|θ) · p(θ)', 0, 0);
      ctx.restore();

      // Integral label
      ctx.fillStyle = '#da7756';
      ctx.font = 'bold 12px Fira Sans, system-ui';
      ctx.textAlign = 'left';
      ctx.fillText('∫ p(θ)·p(B|θ) dθ', plotL + plotW * 0.3, plotT + plotH * 0.4);

      // Result
      ctx.fillStyle = '#1a1a19';
      ctx.font = 'bold 14px Fira Sans, system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(`P(B) = ${continuousTotal.toFixed(3)}`, w / 2, pad.t + 14);
    }
  }, [w, continuous, discreteTotal, continuousTotal]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setContinuous(!continuous)}
          className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
            continuous
              ? 'bg-accent text-white'
              : 'bg-bg border border-border text-text'
          }`}
        >
          {continuous ? '→ Непрерывный случай (интеграл)' : '→ Дискретный случай (сумма)'}
        </button>
        <div className="bg-accent text-white px-4 py-2 rounded-xl font-bold text-lg">
          P(B) = {continuous ? continuousTotal.toFixed(3) : discreteTotal.toFixed(3)}
        </div>
      </div>

      <div ref={containerRef} className="w-full">
        {w > 0 && (
          <canvas ref={canvasRef} style={{ width: w, height: H }}
            className="rounded-lg block border border-border" />
        )}
      </div>

      <div className="bg-bg rounded-xl p-4 text-sm">
        <p className="font-mono text-center text-lg text-text-dim mb-2">
          {continuous
            ? 'P(B) = ∫ p(θ) · p(B|θ) dθ'
            : 'P(B) = Σ P(Hᵢ) · P(B|Hᵢ)'}
        </p>
        <p className="text-text-dim">
          {continuous
            ? 'Бесконечно много «коробок» с плавно меняющимся составом. Каждая точка θ — своя коробка. Интеграл собирает вклады всех бесконечно тонких полосок.'
            : `${BOXES.length} коробок с белыми (W) и чёрными (B) шарами. Каждая выбирается с равной вероятностью 1/${BOXES.length}. Тянем шар — какова вероятность белого?`}
        </p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Main page
// ══════════════════════════════════════════════════════════════

export default function ComplexHypothesisPage() {
  const [article, setArticle] = useState('');

  useEffect(() => {
    fetch(import.meta.env.BASE_URL + 'complex-hypothesis.md')
      .then(r => r.ok ? r.text() : '')
      .then(setArticle);
  }, []);

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-accent mb-2">Сложная гипотеза и формула полной вероятности</h1>
        <p className="text-text-dim italic">Зачем нужен интеграл и как усреднить по бесконечности автоматов.</p>
      </div>

      {/* Visualization 1: Circle with machines */}
      <div className="bg-card rounded-2xl p-6 border border-border space-y-4">
        <h2 className="text-lg font-bold text-accent">Визуально: сложная гипотеза = круг с автоматами внутри</h2>
        <p className="text-text leading-relaxed">
          Представь: гипотеза <K m="H_0" />: «среднее = 0.92» — это <strong>не один автомат</strong>, а целый зоопарк.
          Внутри круга — автоматы с разными настройками (θ₁, θ₂, ...). Все дают среднее 0.92,
          но <strong>по-разному</strong>. У каждого свой вес (prior) и своё правдоподобие данных.
        </p>
        <TotalProbViz />
        <p className="text-sm text-text-dim">
          Наведи мышкой на автоматы. Размер круга ∝ вес (prior). L = правдоподобие данных при этом θ.
          Маргинальное правдоподобие = сумма всех вкладов.
        </p>
      </div>

      {/* Boxes: Discrete ↔ Continuous */}
      <div className="bg-card rounded-2xl p-6 border border-border space-y-4">
        <h2 className="text-lg font-bold text-accent">Коробки с шарами: от суммы к интегралу</h2>
        <p className="text-text leading-relaxed">
          Классический пример. Есть 5 коробок, в каждой смесь белых и чёрных шаров.
          Выбираем случайную коробку, тянем шар. <strong>Какова общая вероятность белого?</strong>
        </p>
        <p className="text-text leading-relaxed">
          В дискретном случае — складываем вклады каждой коробки. В непрерывном — коробок бесконечно много,
          состав плавно меняется, и сумма превращается в интеграл.
          Нажми кнопку чтобы переключиться.
        </p>
        <BoxesViz />
      </div>

      {/* Detailed explanation */}
      <div className="bg-card rounded-2xl p-6 border border-border space-y-4">
        <h2 className="text-lg font-bold text-accent">Как именно сумма превращается в интеграл</h2>

        <div className="space-y-4 text-text leading-relaxed">
          <p>
            В <strong>дискретном</strong> случае у нас конечное число гипотез: H₁, H₂, ..., Hₙ.
            Мы их суммируем (Σ). У каждой своя вероятность P(Hᵢ) и своё правдоподобие P(B|Hᵢ).
          </p>

          <p>
            В <strong>непрерывном</strong> случае гипотезой выступает не отдельное событие,
            а непрерывный параметр θ, который может принимать <em>любые</em> значения.
          </p>

          <p>
            Поскольку значений бесконечно много — мы больше не можем их просто сложить.
            Сумма превращается в интеграл (∫), а вероятности гипотез P(Hᵢ) —
            в <strong>плотность распределения</strong> p(θ).
          </p>

          <div className="bg-bg rounded-xl p-4">
            <p className="font-bold text-accent mb-2">Аналогия из рисунка лектора:</p>
            <p>
              Представь пространство разбито на куски A₁, A₂, A₃... и есть область B.
              В дискретном случае — 5 крупных кусков. В непрерывном —
              нарезали на <strong>бесконечное количество бесконечно тонких полосок</strong>.
              Интеграл собирает площадь пересечения события B со всеми этими полосками.
            </p>
          </div>

          <div className="bg-bg rounded-xl p-4">
            <p className="font-bold text-accent mb-2">Связь с игровым автоматом:</p>
            <p>
              <K m="d" /> (данные) — то что журналист увидел (138 игр).<br />
              <K m="\theta" /> (параметр) — настройки конкретного автомата внутри гипотезы.<br />
              <K m="p(\theta|H_0)" /> — априорное распределение: какие настройки более вероятны.<br />
              <K m="p(d|\theta)" /> — правдоподобие: как хорошо конкретный автомат объясняет данные.<br />
              <K m="\int \ldots \, d\theta" /> — суммируем по всем возможным автоматам.
            </p>
          </div>
        </div>
      </div>

      {/* Key formula */}
      <div className="bg-card rounded-2xl p-6 border border-border space-y-4">
        <h2 className="text-lg font-bold text-accent">Формула полной вероятности → интеграл</h2>

        <div className="space-y-4">
          <div className="bg-bg rounded-xl p-4">
            <p className="font-bold text-accent mb-2">Дискретная версия (конечное число автоматов):</p>
            <K d m="P(\text{данные}|H_0) = \sum_{i=1}^{n} P(\text{данные}|\theta_i) \cdot P(\theta_i)" />
            <p className="text-sm text-text-dim mt-2">
              Для каждого автомата θᵢ: умножь правдоподобие на вес, сложи всё.
            </p>
          </div>

          <div className="text-center text-2xl text-text-dim">↓ автоматов → ∞ ↓</div>

          <div className="bg-bg rounded-xl p-4">
            <p className="font-bold text-accent mb-2">Непрерывная версия (бесконечно много автоматов):</p>
            <K d m="P(\text{данные}|H_0) = \int_{\Theta} P(\text{данные}|\theta) \cdot p(\theta) \, d\theta" />
            <p className="text-sm text-text-dim mt-2">
              Сумма превращается в интеграл. Вместо конечных весов P(θᵢ) — непрерывная плотность p(θ).
              Это <strong>в чистом виде формула полной вероятности</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Gothic P notation */}
      <div className="bg-card rounded-2xl p-6 border border-border space-y-4">
        <h2 className="text-lg font-bold text-accent">Готическая 𝔓 — это просто обозначение модели</h2>
        <p className="text-text leading-relaxed">
          В лекции формула написана с готической буквой 𝔓. Не пугайся — это то же самое что H, просто формальнее.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-bg rounded-xl p-4">
            <p className="font-bold text-accent mb-2">Как у лектора (готическая 𝔓):</p>
            <K d m="p(d|\mathfrak{P}_i) = \int_{\Theta} p(d|\theta, \mathfrak{P}_i) \cdot p(\theta|\mathfrak{P}_i) \, d\theta" />
            <p className="text-xs text-text-dim mt-2">𝔓ᵢ = «семейство распределений с параметром θ»</p>
          </div>
          <div className="bg-bg rounded-xl p-4">
            <p className="font-bold text-accent mb-2">Как мы пишем (обычная H):</p>
            <K d m="p(d|H_i) = \int_{\Theta} p(d|\theta, H_i) \cdot p(\theta|H_i) \, d\theta" />
            <p className="text-xs text-text-dim mt-2">Hᵢ = «i-я гипотеза/модель»</p>
          </div>
        </div>
        <p className="text-sm text-text-dim">
          <strong>Одна и та же формула.</strong> 𝔓ᵢ = Hᵢ = «i-я модель». Готическая буква просто подчёркивает,
          что это целое <em>семейство</em> распределений (модель с параметрами), а не одно конкретное распределение.
        </p>
      </div>

      {/* Visualization 2: Discrete → Continuous */}
      <div className="bg-card rounded-2xl p-6 border border-border space-y-4">
        <h2 className="text-lg font-bold text-accent">Как сумма превращается в интеграл</h2>
        <p className="text-text leading-relaxed">
          Двигай слайдер — увеличивай количество автоматов. Видишь: столбики сужаются,
          сумма прямоугольников приближается к площади под кривой. Это и есть переход к интегралу.
        </p>
        <DiscreteToContinuous />
      </div>

      {/* Then Bayes for hypotheses */}
      <div className="bg-card rounded-2xl p-6 border border-border space-y-4">
        <h2 className="text-lg font-bold text-accent">Байес для гипотез: сравниваем два круга</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-bg rounded-xl p-4">
            <h3 className="font-bold text-accent mb-2">H₀: казино не врёт</h3>
            <p className="text-sm">
              Большой круг с автоматами, все со средним 0.92.
              Считаем маргинальное правдоподобие: <strong>как хорошо этот круг объясняет данные журналиста?</strong>
            </p>
          </div>
          <div className="bg-bg rounded-xl p-4">
            <h3 className="font-bold text-green mb-2">H₁: казино врёт</h3>
            <p className="text-sm">
              Другой круг — автоматы с любым средним (не обязательно 0.92).
              Тоже считаем маргинальное правдоподобие.
            </p>
          </div>
        </div>

        <div className="bg-bg rounded-xl p-4">
          <p className="font-bold text-accent mb-2">Апостериорная вероятность:</p>
          <K d m="P(H_i|\text{данные}) = \frac{P(\text{данные}|H_i) \cdot P(H_i)}{\sum_j P(\text{данные}|H_j) \cdot P(H_j)}" />
          <p className="text-sm text-text-dim mt-2">
            Обычная формула Байеса, но вместо конкретных θ — целые гипотезы H₀ и H₁.
            Маргинальные правдоподобия (которые мы только что считали интегралом) подставляются сюда.
          </p>
        </div>
      </div>

      {/* Gemini article */}
      {article && (
        <div className="bg-card rounded-2xl p-6 border border-border">
          <article className="prose prose-neutral max-w-none prose-headings:text-accent
            prose-table:text-sm prose-th:text-accent">
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
              {article}
            </ReactMarkdown>
          </article>
        </div>
      )}
    </div>
  );
}
