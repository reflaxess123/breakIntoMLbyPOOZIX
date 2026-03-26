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

      {/* Key formula */}
      <div className="bg-card rounded-2xl p-6 border border-border space-y-4">
        <h2 className="text-lg font-bold text-accent">Формула полной вероятности → интеграл</h2>

        <div className="space-y-4">
          <div className="bg-bg rounded-xl p-4">
            <p className="font-bold text-accent mb-2">Дискретная версия (конечное число автоматов):</p>
            <K d m="P(\\text{данные}|H_0) = \\sum_{i=1}^{n} P(\\text{данные}|\\theta_i) \\cdot P(\\theta_i)" />
            <p className="text-sm text-text-dim mt-2">
              Для каждого автомата θᵢ: умножь правдоподобие на вес, сложи всё.
            </p>
          </div>

          <div className="text-center text-2xl text-text-dim">↓ автоматов → ∞ ↓</div>

          <div className="bg-bg rounded-xl p-4">
            <p className="font-bold text-accent mb-2">Непрерывная версия (бесконечно много автоматов):</p>
            <K d m="P(\\text{данные}|H_0) = \\int_{\\Theta} P(\\text{данные}|\\theta) \\cdot p(\\theta) \\, d\\theta" />
            <p className="text-sm text-text-dim mt-2">
              Сумма превращается в интеграл. Вместо конечных весов P(θᵢ) — непрерывная плотность p(θ).
              Это <strong>в чистом виде формула полной вероятности</strong>.
            </p>
          </div>
        </div>
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
          <K d m="P(H_i|\\text{данные}) = \\frac{P(\\text{данные}|H_i) \\cdot P(H_i)}{\\sum_j P(\\text{данные}|H_j) \\cdot P(H_j)}" />
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
