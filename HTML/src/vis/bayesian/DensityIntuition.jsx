import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { K } from '../../components/Latex';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// ══════════════════════════════════════════════════════════════
// Vis 1: From N boxes to infinity — weight of each shrinks, total stays 1
// ══════════════════════════════════════════════════════════════

function BoxesToDensity() {
  const [nBoxes, setNBoxes] = useState(3);
  const [hoveredBox, setHoveredBox] = useState(-1);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [w, setW] = useState(0);
  const H = 350;

  useEffect(() => {
    const ro = new ResizeObserver(entries => {
      for (const e of entries) setW(e.contentRect.width);
    });
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Prior density: Beta(2,5) — skewed left, interesting shape
  const priorDensity = (x) => {
    if (x <= 0 || x >= 1) return 0;
    return Math.pow(x, 1) * Math.pow(1 - x, 4) * 30; // Beta(2,5) * normalization
  };

  useEffect(() => {
    if (!w || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const pad = { l: 50, r: 20, t: 40, b: 55 };
    const pw = w - pad.l - pad.r;
    const ph = H - pad.t - pad.b;

    ctx.fillStyle = '#faf9f5';
    ctx.fillRect(0, 0, w, H);

    // Find max density for scaling
    let maxDensity = 0;
    for (let i = 0; i <= 200; i++) {
      maxDensity = Math.max(maxDensity, priorDensity(i / 200));
    }

    // Draw smooth density curve (always visible as reference)
    ctx.beginPath();
    ctx.strokeStyle = '#58815780';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    for (let px = 0; px <= pw; px++) {
      const x = px / pw;
      const y = pad.t + ph - (priorDensity(x) / maxDensity) * ph * 0.95;
      if (px === 0) ctx.moveTo(pad.l + px, y);
      else ctx.lineTo(pad.l + px, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw bars for N boxes
    const barW = pw / nBoxes;

    for (let i = 0; i < nBoxes; i++) {
      const x0 = i / nBoxes;
      const x1 = (i + 1) / nBoxes;
      const xMid = (x0 + x1) / 2;

      // Weight of this box = integral of prior over [x0, x1] ≈ prior(xMid) * (1/nBoxes)
      const weight = priorDensity(xMid) / nBoxes;
      // Normalize bar height: show weight (probability), not density
      const maxWeight = maxDensity / nBoxes;
      const barH = (weight / (maxDensity / nBoxes * 1.1)) * ph * 0.95;

      const bx = pad.l + i * barW;
      const by = pad.t + ph - barH;
      const isHov = hoveredBox === i;

      // Bar
      ctx.fillStyle = isHov ? 'rgba(218, 119, 86, 0.5)' : 'rgba(218, 119, 86, 0.25)';
      ctx.fillRect(bx + 1, by, barW - 2, barH);
      ctx.strokeStyle = '#da7756';
      ctx.lineWidth = isHov ? 2 : 1;
      ctx.strokeRect(bx + 1, by, barW - 2, barH);

      // Weight label on top (only if bars are wide enough)
      if (barW > 30) {
        ctx.fillStyle = '#da7756';
        ctx.font = `${isHov ? 'bold ' : ''}${Math.min(11, barW / 5)}px Fira Sans, system-ui`;
        ctx.textAlign = 'center';
        ctx.fillText(`${(weight * 1).toFixed(nBoxes > 20 ? 3 : 2)}`, bx + barW / 2, by - 4);
      }

      // θ label below
      if (barW > 20 && nBoxes <= 30) {
        ctx.fillStyle = '#6b6b66';
        ctx.font = '10px Fira Sans, system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(`θ=${xMid.toFixed(nBoxes > 10 ? 2 : 1)}`, bx + barW / 2, pad.t + ph + 15);
      }
    }

    // Axes
    ctx.strokeStyle = '#1a1a19';
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
    for (let i = 0; i <= 5; i++) {
      const x = pad.l + (i / 5) * pw;
      ctx.fillText((i / 5).toFixed(1), x, H - pad.b + 30);
    }
    ctx.fillText('θ (параметр монетки)', pad.l + pw / 2, H - 5);

    // Y axis label
    ctx.save();
    ctx.translate(15, pad.t + ph / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText(nBoxes > 50 ? 'плотность p(θ)' : 'вес коробки P(θᵢ)', 0, 0);
    ctx.restore();

    // Title
    ctx.fillStyle = '#1a1a19';
    ctx.font = 'bold 13px Fira Sans, system-ui';
    ctx.textAlign = 'left';
    const totalWeight = Array.from({ length: nBoxes }, (_, i) =>
      priorDensity((i + 0.5) / nBoxes) / nBoxes
    ).reduce((a, b) => a + b, 0);
    ctx.fillText(
      `${nBoxes} коробок. Вес каждой ≈ ${(1/nBoxes).toFixed(nBoxes > 10 ? 3 : 2)}. Сумма всех = ${totalWeight.toFixed(3)}`,
      pad.l + 5, pad.t + 15
    );

    // Dashed curve label
    ctx.fillStyle = '#588157';
    ctx.font = '11px Fira Sans, system-ui';
    ctx.textAlign = 'right';
    ctx.fillText('кривая плотности p(θ)', pad.l + pw - 5, pad.t + 15);

  }, [w, nBoxes, hoveredBox]);

  const handleMove = useCallback((e) => {
    if (!canvasRef.current || !w) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pad = { l: 50, r: 20 };
    const pw = w - pad.l - pad.r;
    const rel = (x - pad.l) / pw;
    if (rel >= 0 && rel <= 1) {
      setHoveredBox(Math.floor(rel * nBoxes));
    } else {
      setHoveredBox(-1);
    }
  }, [w, nBoxes]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <label className="text-sm text-text-dim whitespace-nowrap">Коробок: <strong className="text-accent">{nBoxes}</strong></label>
        <input type="range" min="2" max="500" step="1" value={nBoxes}
          onChange={e => setNBoxes(+e.target.value)} className="w-full" />
      </div>
      <div ref={containerRef} className="w-full">
        {w > 0 && (
          <canvas ref={canvasRef} style={{ width: w, height: H }}
            onMouseMove={handleMove} onMouseLeave={() => setHoveredBox(-1)}
            className="rounded-lg block border border-border cursor-crosshair" />
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Vis 2: Dart analogy — probability of a POINT vs RANGE
// ══════════════════════════════════════════════════════════════

function DartViz() {
  const [rangeWidth, setRangeWidth] = useState(0.1);
  const [rangeCenter, setRangeCenter] = useState(0.3);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [w, setW] = useState(0);
  const H = 250;

  useEffect(() => {
    const ro = new ResizeObserver(entries => {
      for (const e of entries) setW(e.contentRect.width);
    });
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const density = (x) => {
    if (x <= 0 || x >= 1) return 0;
    return Math.pow(x, 1) * Math.pow(1 - x, 4) * 30;
  };

  const prob = useMemo(() => {
    const lo = Math.max(0, rangeCenter - rangeWidth / 2);
    const hi = Math.min(1, rangeCenter + rangeWidth / 2);
    let s = 0;
    const steps = 500;
    const dx = (hi - lo) / steps;
    for (let i = 0; i <= steps; i++) {
      const x = lo + i * dx;
      const wt = i === 0 || i === steps ? 0.5 : 1;
      s += wt * density(x);
    }
    return s * dx;
  }, [rangeCenter, rangeWidth]);

  useEffect(() => {
    if (!w || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const pad = { l: 50, r: 20, t: 25, b: 40 };
    const pw = w - pad.l - pad.r;
    const ph = H - pad.t - pad.b;

    ctx.fillStyle = '#faf9f5';
    ctx.fillRect(0, 0, w, H);

    let maxD = 0;
    for (let i = 0; i <= 200; i++) maxD = Math.max(maxD, density(i / 200));

    // Shaded range
    const lo = Math.max(0, rangeCenter - rangeWidth / 2);
    const hi = Math.min(1, rangeCenter + rangeWidth / 2);
    ctx.beginPath();
    const loX = pad.l + lo * pw;
    const hiX = pad.l + hi * pw;
    ctx.moveTo(loX, pad.t + ph);
    for (let px = loX; px <= hiX; px++) {
      const x = (px - pad.l) / pw;
      const y = pad.t + ph - (density(x) / maxD) * ph * 0.95;
      ctx.lineTo(px, y);
    }
    ctx.lineTo(hiX, pad.t + ph);
    ctx.closePath();
    ctx.fillStyle = 'rgba(218, 119, 86, 0.3)';
    ctx.fill();

    // Density curve
    ctx.beginPath();
    ctx.strokeStyle = '#da7756';
    ctx.lineWidth = 2.5;
    for (let px = 0; px <= pw; px++) {
      const x = px / pw;
      const y = pad.t + ph - (density(x) / maxD) * ph * 0.95;
      if (px === 0) ctx.moveTo(pad.l + px, y);
      else ctx.lineTo(pad.l + px, y);
    }
    ctx.stroke();

    // Range bracket
    ctx.strokeStyle = '#c15f3c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(loX, pad.t + ph + 3);
    ctx.lineTo(loX, pad.t + ph + 12);
    ctx.lineTo(hiX, pad.t + ph + 12);
    ctx.lineTo(hiX, pad.t + ph + 3);
    ctx.stroke();

    // Range label
    ctx.fillStyle = '#c15f3c';
    ctx.font = 'bold 12px Fira Sans, system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(`ширина = ${rangeWidth.toFixed(3)}`, (loX + hiX) / 2, pad.t + ph + 26);

    // Prob label
    ctx.fillStyle = '#1a1a19';
    ctx.font = 'bold 14px Fira Sans, system-ui';
    ctx.fillText(`P = ${prob.toFixed(4)}  (${(prob * 100).toFixed(2)}%)`, (loX + hiX) / 2, pad.t + 15);

    // Axes
    ctx.strokeStyle = '#1a1a19';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.l, pad.t);
    ctx.lineTo(pad.l, pad.t + ph);
    ctx.lineTo(pad.l + pw, pad.t + ph);
    ctx.stroke();

    // X labels
    ctx.fillStyle = '#6b6b66';
    ctx.font = '11px Fira Sans, system-ui';
    ctx.textAlign = 'center';
    for (let i = 0; i <= 5; i++) {
      ctx.fillText((i / 5).toFixed(1), pad.l + (i / 5) * pw, H - 5);
    }

    ctx.save();
    ctx.translate(15, pad.t + ph / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('p(θ)', 0, 0);
    ctx.restore();

  }, [w, rangeCenter, rangeWidth, prob]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-sm text-text-dim">Центр диапазона: {rangeCenter.toFixed(2)}</label>
          <input type="range" min="0.01" max="0.99" step="0.01" value={rangeCenter}
            onChange={e => setRangeCenter(+e.target.value)} className="w-full" />
        </div>
        <div>
          <label className="text-sm text-text-dim">Ширина диапазона: {rangeWidth.toFixed(3)}</label>
          <input type="range" min="0.001" max="0.5" step="0.001" value={rangeWidth}
            onChange={e => setRangeWidth(+e.target.value)} className="w-full" />
        </div>
      </div>
      <div ref={containerRef} className="w-full">
        {w > 0 && (
          <canvas ref={canvasRef} style={{ width: w, height: H }}
            className="rounded-lg block border border-border" />
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Main Page
// ══════════════════════════════════════════════════════════════

export default function DensityIntuitionPage() {
  const [article, setArticle] = useState('');

  useEffect(() => {
    fetch(import.meta.env.BASE_URL + 'density-intuition.md')
      .then(r => r.ok ? r.text() : '')
      .then(setArticle);
  }, []);

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-accent mb-2">Плотность вероятности: почему вероятность точки = 0</h1>
        <p className="text-text-dim italic">И почему это не мешает интегралу работать.</p>
      </div>

      {/* Key insight */}
      <div className="bg-card rounded-2xl p-6 border border-border space-y-4">
        <h2 className="text-lg font-bold text-accent">Главная идея</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-bg rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-accent mb-2">3 коробки</p>
            <p className="text-sm text-text-dim">Каждая весит 0.33</p>
            <p className="text-sm text-text-dim">Сумма = 1.0</p>
          </div>
          <div className="bg-bg rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-accent mb-2">100 коробок</p>
            <p className="text-sm text-text-dim">Каждая весит 0.01</p>
            <p className="text-sm text-text-dim">Сумма = 1.0</p>
          </div>
          <div className="bg-bg rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-accent mb-2">∞ коробок</p>
            <p className="text-sm text-text-dim">Каждая весит 0</p>
            <p className="text-sm text-text-dim">«Сумма» (интеграл) = 1.0</p>
          </div>
        </div>
        <p className="text-text leading-relaxed">
          Вес каждой коробки уменьшается, но их количество растёт. В итоге:
          <strong> каждая по отдельности — ноль, но вместе — единица.</strong> Это не парадокс.
          Это как спросить «сколько весит один атом воды?» — ≈ 0 грамм.
          Но стакан воды весит 200 грамм, потому что атомов дохрена.
        </p>
      </div>

      {/* Vis 1: Boxes to density */}
      <div className="bg-card rounded-2xl p-6 border border-border space-y-4">
        <h2 className="text-lg font-bold text-accent">Визуально: от коробок к кривой плотности</h2>
        <p className="text-text leading-relaxed">
          Двигай слайдер. При 3 коробках — видны отдельные столбики с весами.
          При 500 — столбики сливаются в непрерывную кривую. Вес каждого столбика → 0,
          но их сумма всегда = 1.
        </p>
        <BoxesToDensity />
        <p className="text-sm text-text-dim">
          Пунктирная зелёная линия — кривая плотности p(θ). При увеличении числа коробок
          столбики приближаются к ней. Наведи мышкой чтобы увидеть вес конкретной коробки.
        </p>
      </div>

      {/* Population analogy */}
      <div className="bg-card rounded-2xl p-6 border border-border space-y-4">
        <h2 className="text-lg font-bold text-accent">Аналогия: плотность населения</h2>
        <div className="bg-bg rounded-xl p-4 space-y-2">
          <p className="text-text">Плотность населения Москвы ≈ 5000 чел/км².</p>
          <p className="text-text">Это <strong>не значит</strong> что в одной математической точке живёт 5000 человек.</p>
          <p className="text-text">Это значит: на <strong>площади 1 км²</strong> живёт 5000 человек.</p>
          <p className="text-text font-bold text-accent">Плотность × площадь = количество.</p>
          <p className="text-text">Точно так же: p(θ) × dθ = вероятность попасть в кусочек шириной dθ.</p>
        </div>
      </div>

      {/* Vis 2: Point vs Range */}
      <div className="bg-card rounded-2xl p-6 border border-border space-y-4">
        <h2 className="text-lg font-bold text-accent">Вероятность точки vs вероятность диапазона</h2>
        <p className="text-text leading-relaxed">
          Суживай диапазон до минимума. Видишь: вероятность стремится к нулю.
          Но <strong>плотность</strong> (высота кривой) — не меняется! Плотность — это не вероятность.
          Вероятность = площадь закрашенной области = плотность × ширина.
        </p>
        <DartViz />
        <div className="bg-bg rounded-xl p-4">
          <K d m="P(\theta \in [a, b]) = \int_a^b p(\theta) \, d\theta = \text{площадь под кривой}" />
          <p className="text-sm text-text-dim mt-2">
            Ширина → 0 ⟹ площадь → 0 ⟹ P(точка) = 0. Но p(θ) (высота) конечна.
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
