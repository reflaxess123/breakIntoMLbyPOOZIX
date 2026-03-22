import { useRef, useEffect, useState, useCallback } from 'react';

const C = {
  bar: 'rgba(218, 119, 86, 0.55)',
  pValue: 'rgba(192, 57, 43, 0.6)',
  realLine: '#c15f3c',
  text: '#1a1a19',
  textDim: '#6b6b66',
  bg: '#ffffff',
  grid: 'rgba(0, 0, 0, 0.06)',
};

export function Histogram({ data, realValue, height = 300, bins = 50, label }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [width, setWidth] = useState(0);
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

  const measure = useCallback(() => {
    if (containerRef.current) {
      setWidth(containerRef.current.clientWidth);
    }
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  useEffect(() => {
    if (!data?.length || !width) return;
    const canvas = canvasRef.current;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    draw(ctx, data, realValue, width, height, bins, label);
  }, [data, realValue, width, height, bins, label, dpr]);

  return (
    <div ref={containerRef} className="w-full">
      {width > 0 && (
        <canvas
          ref={canvasRef}
          style={{ width, height }}
          className="rounded-lg block border border-border"
        />
      )}
    </div>
  );
}

function draw(ctx, data, realValue, W, H, nBins, label) {
  const pad = { t: 44, r: 20, b: 40, l: 55 };
  const pw = W - pad.l - pad.r;
  const ph = H - pad.t - pad.b;

  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);

  const min = Math.min(...data);
  const max = Math.max(...data) + 1e-10;
  const bw = (max - min) / nBins;
  const counts = new Array(nBins).fill(0);
  for (const v of data) {
    const idx = Math.min(nBins - 1, Math.floor((v - min) / bw));
    counts[idx]++;
  }
  const maxC = Math.max(...counts);

  // Grid lines
  ctx.strokeStyle = C.grid;
  ctx.lineWidth = 1;
  for (let i = 1; i <= 4; i++) {
    const y = pad.t + ph - (ph * i) / 4;
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(pad.l + pw, y);
    ctx.stroke();
  }

  // Bars
  const barW = pw / nBins;
  for (let i = 0; i < nBins; i++) {
    const binCenter = min + (i + 0.5) * bw;
    const barH = (counts[i] / maxC) * ph;
    const x = pad.l + i * barW;
    const y = pad.t + ph - barH;
    ctx.fillStyle =
      realValue !== undefined && binCenter >= realValue ? C.pValue : C.bar;
    ctx.fillRect(x, y, Math.max(barW - 1, 1), barH);
  }

  // Real value line
  if (realValue !== undefined) {
    const clamped = Math.max(min, Math.min(max, realValue));
    const rx = pad.l + ((clamped - min) / (max - min)) * pw;
    ctx.strokeStyle = C.realLine;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(rx, pad.t);
    ctx.lineTo(rx, pad.t + ph);
    ctx.stroke();
    ctx.setLineDash([]);

    const pVal = data.filter(v => v >= realValue).length / data.length;
    ctx.fillStyle = C.realLine;
    ctx.font = 'bold 12px Fira Sans, system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(`T = ${realValue.toFixed(3)}`, rx, pad.t - 20);
    ctx.font = '12px Fira Sans, system-ui';
    ctx.fillText(
      `p = ${pVal.toFixed(4)} (${(pVal * 100).toFixed(2)}%)`,
      rx,
      pad.t - 6,
    );
  }

  // Axes
  ctx.strokeStyle = C.textDim;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad.l, pad.t);
  ctx.lineTo(pad.l, pad.t + ph);
  ctx.lineTo(pad.l + pw, pad.t + ph);
  ctx.stroke();

  // X labels
  ctx.fillStyle = C.textDim;
  ctx.font = '11px Fira Sans, system-ui';
  ctx.textAlign = 'center';
  for (let i = 0; i <= 5; i++) {
    const v = min + ((max - min) * i) / 5;
    const x = pad.l + (pw * i) / 5;
    ctx.fillText(v.toFixed(2), x, H - pad.b + 18);
  }

  // Y labels
  ctx.textAlign = 'right';
  for (let i = 0; i <= 4; i++) {
    const v = Math.round((maxC * i) / 4);
    const y = pad.t + ph - (ph * i) / 4;
    ctx.fillText(v, pad.l - 8, y + 4);
  }

  // Label
  if (label) {
    ctx.fillStyle = C.text;
    ctx.font = 'bold 13px Fira Sans, system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(label, pad.l + 8, pad.t + 18);
  }
}
