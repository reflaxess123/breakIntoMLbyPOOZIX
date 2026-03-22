import { useState, useRef, useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { K } from '../../components/Latex';

// ── 2D Canvas: distances between points = information ──
function DistanceCanvas() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [w, setW] = useState(0);

  useEffect(() => {
    const measure = () => containerRef.current && setW(containerRef.current.clientWidth);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const H = 400;

  useEffect(() => {
    if (!w) return;
    const c = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    c.width = w * dpr;
    c.height = H * dpr;
    const ctx = c.getContext('2d');
    ctx.scale(dpr, dpr);
    drawDistanceViz(ctx, w, H);
  }, [w]);

  return (
    <div ref={containerRef} className="w-full">
      {w > 0 && <canvas ref={canvasRef} style={{ width: w, height: H }} className="rounded-lg block border border-border" />}
    </div>
  );
}

// ── 2D Canvas: density heatmap of the same cloud ──
function DensityCanvas() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [w, setW] = useState(0);

  useEffect(() => {
    const measure = () => containerRef.current && setW(containerRef.current.clientWidth);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const H = 400;

  useEffect(() => {
    if (!w) return;
    const c = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    c.width = w * dpr;
    c.height = H * dpr;
    const ctx = c.getContext('2d');
    ctx.scale(dpr, dpr);
    drawDensityViz(ctx, w, H);
  }, [w]);

  return (
    <div ref={containerRef} className="w-full">
      {w > 0 && <canvas ref={canvasRef} style={{ width: w, height: H }} className="rounded-lg block border border-border" />}
    </div>
  );
}

function drawDensityViz(ctx, W, H) {
  const pad = { l: 40, r: 20, t: 25, b: 30 };
  const pw = W - pad.l - pad.r;
  const ph = H - pad.t - pad.b;

  // Same seed as DistanceCanvas → same points
  let seed = 55;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const points = [];
  for (let i = 0; i < 25; i++) {
    points.push([
      pad.l + 0.12 * pw + rand() * 0.76 * pw,
      pad.t + 0.12 * ph + rand() * 0.76 * ph,
    ]);
  }

  // Compute mean and std
  const xCoords = points.map(p => p[0]);
  const yCoords = points.map(p => p[1]);
  const meanX = xCoords.reduce((a,b) => a+b, 0) / points.length;
  const meanY = yCoords.reduce((a,b) => a+b, 0) / points.length;
  const varX = xCoords.reduce((s, x) => s + (x - meanX) ** 2, 0) / points.length;
  const varY = yCoords.reduce((s, y) => s + (y - meanY) ** 2, 0) / points.length;

  // Draw heatmap: gaussian density at each pixel
  const step = 4; // pixel step for performance
  for (let px = 0; px < W; px += step) {
    for (let py = 0; py < H; py += step) {
      const zx = (px - meanX) / Math.sqrt(varX);
      const zy = (py - meanY) / Math.sqrt(varY);
      const density = Math.exp(-0.5 * (zx * zx + zy * zy));
      // Color: warm center (terracotta) → cool edges (light cream)
      const r = Math.round(250 - density * 32);
      const g = Math.round(249 - density * 130);
      const b = Math.round(245 - density * 159);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(px, py, step, step);
    }
  }

  // Contour rings (1σ, 2σ)
  for (const nSigma of [1, 2]) {
    ctx.strokeStyle = nSigma === 1 ? 'rgba(218, 119, 86, 0.5)' : 'rgba(218, 119, 86, 0.25)';
    ctx.lineWidth = nSigma === 1 ? 2 : 1.5;
    ctx.setLineDash(nSigma === 2 ? [4, 3] : []);
    ctx.beginPath();
    for (let a = 0; a <= Math.PI * 2 + 0.1; a += 0.05) {
      const x = meanX + Math.cos(a) * Math.sqrt(varX) * nSigma;
      const y = meanY + Math.sin(a) * Math.sqrt(varY) * nSigma;
      a === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Label
    const lx = meanX + Math.sqrt(varX) * nSigma + 8;
    const ly = meanY - 4;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    const text = `${nSigma}σ`;
    ctx.font = 'bold 10px Fira Sans, system-ui';
    const tm = ctx.measureText(text);
    ctx.fillRect(lx - 2, ly - 8, tm.width + 4, 14);
    ctx.fillStyle = '#da7756';
    ctx.textAlign = 'left';
    ctx.fillText(text, lx, ly + 3);
  }

  // Draw the same points on top
  for (const p of points) {
    // Color by distance from mean
    const zx = (p[0] - meanX) / Math.sqrt(varX);
    const zy = (p[1] - meanY) / Math.sqrt(varY);
    const dist = Math.sqrt(zx*zx + zy*zy);
    const t = Math.min(dist / 3, 1); // 0 = at center, 1 = far
    // Interpolate: center = dark terracotta, far = light blue
    const r = Math.round(192 * (1 - t) + 106 * t);
    const g = Math.round(63 * (1 - t) + 155 * t);
    const bv = Math.round(60 * (1 - t) + 204 * t);

    ctx.fillStyle = `rgb(${r},${g},${bv})`;
    ctx.beginPath();
    ctx.arc(p[0], p[1], 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Mean point
  ctx.fillStyle = '#1a1a19';
  ctx.beginPath();
  ctx.arc(meanX, meanY, 5, 0, Math.PI * 2);
  ctx.fill();

  // Labels
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillRect(meanX + 8, meanY - 14, 16, 14);
  ctx.fillStyle = '#1a1a19';
  ctx.font = 'bold 10px Fira Sans, system-ui';
  ctx.textAlign = 'left';
  ctx.fillText('μ', meanX + 10, meanY - 3);

  // Legend
  const legX = pad.l + 5;
  const legY = pad.t + 5;
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillRect(legX, legY, 180, 50);
  ctx.strokeStyle = '#e8e6dc';
  ctx.lineWidth = 1;
  ctx.strokeRect(legX, legY, 180, 50);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#1a1a19';
  ctx.font = 'bold 9px Fira Sans, system-ui';
  ctx.fillText('Цвет точки = расстояние до μ', legX + 5, legY + 4);

  // Mini gradient
  for (let i = 0; i < 60; i++) {
    const t = i / 60;
    const r = Math.round(192 * (1 - t) + 106 * t);
    const g = Math.round(63 * (1 - t) + 155 * t);
    const b = Math.round(60 * (1 - t) + 204 * t);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(legX + 5 + i * 2, legY + 18, 2, 10);
  }
  ctx.fillStyle = '#da7756';
  ctx.font = '8px Fira Sans, system-ui';
  ctx.fillText('близко', legX + 5, legY + 32);
  ctx.fillStyle = '#6a9bcc';
  ctx.textAlign = 'right';
  ctx.fillText('далеко', legX + 5 + 120, legY + 32);

  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';

  // Info
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  const infoX = W - pad.r - 170;
  const infoY = H - pad.b - 40;
  ctx.fillRect(infoX, infoY, 165, 35);
  ctx.fillStyle = '#6b6b66';
  ctx.font = '9px Fira Sans, system-ui';
  ctx.fillText('Фон = плотность N(μ, σ²)', infoX + 5, infoY + 12);
  ctx.fillText('68% точек внутри 1σ, 95% внутри 2σ', infoX + 5, infoY + 25);
}

function drawDistanceViz(ctx, W, H) {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  const pad = { l: 40, r: 20, t: 25, b: 45 };
  const pw = W - pad.l - pad.r;
  const ph = H - pad.t - pad.b;

  // Seeded random
  let seed = 55;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

  // Generate cloud
  const points = [];
  for (let i = 0; i < 25; i++) {
    points.push([
      pad.l + 0.12 * pw + rand() * 0.76 * pw,
      pad.t + 0.12 * ph + rand() * 0.76 * ph,
    ]);
  }

  // Axes
  ctx.strokeStyle = '#e8e6dc';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad.l, pad.t);
  ctx.lineTo(pad.l, pad.t + ph);
  ctx.lineTo(pad.l + pw, pad.t + ph);
  ctx.stroke();

  // Axis labels
  // (axes unlabeled — σx/σy labels are enough)

  // Cloud points (faded)
  for (const p of points) {
    ctx.fillStyle = 'rgba(218, 119, 86, 0.2)';
    ctx.beginPath();
    ctx.arc(p[0], p[1], 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Helper: draw text with background
  function label(text, x, y, color, fontSize = 9) {
    ctx.font = `bold ${fontSize}px Fira Sans, system-ui`;
    const m = ctx.measureText(text);
    const tw = m.width + 6;
    const th = fontSize + 4;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(x - tw/2, y - th/2, tw, th);
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
    ctx.textBaseline = 'alphabetic';
  }

  // Pairs with offset directions for labels to avoid overlap
  const pairs = [[2, 8], [5, 15], [10, 20]];
  const pairColors = ['#c0392b', '#588157', '#6a9bcc'];
  const labelOffsets = [
    { dx: 0, dy: -14, dxL: 0, dyL: 14, dyR: -8 },
    { dx: 0, dy: -14, dxL: 0, dyL: -14, dyR: 12 },
    { dx: 0, dy: 14, dxL: 0, dyL: 14, dyR: -10 },
  ];

  for (let pi = 0; pi < pairs.length; pi++) {
    const [ai, bi] = pairs[pi];
    const a = points[ai];
    const b = points[bi];
    const color = pairColors[pi];
    const off = labelOffsets[pi];

    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);
    const d = Math.sqrt(dx*dx + dy*dy);

    // Δx horizontal dashed
    ctx.strokeStyle = 'rgba(218, 119, 86, 0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(a[0], b[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();

    // Δy vertical dashed
    ctx.strokeStyle = 'rgba(106, 155, 204, 0.5)';
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(a[0], b[1]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Right angle
    const sz = 6;
    const sx = dx > 0 ? 1 : -1;
    const sy = dy > 0 ? -1 : 1;
    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(a[0] + sz*sx, b[1]);
    ctx.lineTo(a[0] + sz*sx, b[1] + sz*sy);
    ctx.lineTo(a[0], b[1] + sz*sy);
    ctx.stroke();

    // Diagonal line (main distance)
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();

    // Points
    for (const p of [a, b]) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(p[0], p[1], 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(p[0], p[1], 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Distance label (on diagonal, with bg)
    const mx = (a[0] + b[0]) / 2 + off.dx;
    const my = (a[1] + b[1]) / 2 + off.dy;
    label(`d=${d.toFixed(0)}`, mx, my, color, 10);

    // Δx label
    label(`Δx=${adx.toFixed(0)}`, (a[0] + b[0]) / 2 + off.dxL, b[1] + off.dyL, '#b8660b', 8);

    // Δy label
    label(`Δy=${ady.toFixed(0)}`, a[0] + off.dyR * 2, (a[1] + b[1]) / 2, '#5a8aab', 8);
  }

  // ── Compute and draw variance ──
  const xCoords = points.map(p => p[0]);
  const yCoords = points.map(p => p[1]);
  const meanX = xCoords.reduce((a,b) => a+b, 0) / points.length;
  const meanY = yCoords.reduce((a,b) => a+b, 0) / points.length;
  const varX = xCoords.reduce((s, x) => s + (x - meanX) ** 2, 0) / points.length;
  const varY = yCoords.reduce((s, y) => s + (y - meanY) ** 2, 0) / points.length;
  const stdX = Math.sqrt(varX);
  const stdY = Math.sqrt(varY);

  // Mean point
  ctx.fillStyle = '#1a1a19';
  ctx.beginPath();
  ctx.arc(meanX, meanY, 4, 0, Math.PI * 2);
  ctx.fill();
  label('μ', meanX + 10, meanY - 2, '#1a1a19', 10);

  // X variance: bracket under the cloud showing ±σx from mean
  const varYPos = pad.t + ph + 18;

  // σx arrow left
  ctx.strokeStyle = '#da7756';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(meanX - stdX, varYPos);
  ctx.lineTo(meanX + stdX, varYPos);
  ctx.stroke();
  // arrowheads
  for (const [x, dir] of [[meanX - stdX, 1], [meanX + stdX, -1]]) {
    ctx.beginPath();
    ctx.moveTo(x, varYPos);
    ctx.lineTo(x + dir * 5, varYPos - 3);
    ctx.lineTo(x + dir * 5, varYPos + 3);
    ctx.closePath();
    ctx.fillStyle = '#da7756';
    ctx.fill();
  }
  // tick at mean
  ctx.strokeStyle = '#da7756';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(meanX, varYPos - 4);
  ctx.lineTo(meanX, varYPos + 4);
  ctx.stroke();

  label(`σx = ${stdX.toFixed(0)}px`, meanX, varYPos + 12, '#da7756', 9);

  // Y variance: bracket to the left
  const varXPos = pad.l - 18;

  ctx.strokeStyle = '#6a9bcc';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(varXPos, meanY - stdY);
  ctx.lineTo(varXPos, meanY + stdY);
  ctx.stroke();
  for (const [y, dir] of [[meanY - stdY, 1], [meanY + stdY, -1]]) {
    ctx.beginPath();
    ctx.moveTo(varXPos, y);
    ctx.lineTo(varXPos - 3, y + dir * 5);
    ctx.lineTo(varXPos + 3, y + dir * 5);
    ctx.closePath();
    ctx.fillStyle = '#6a9bcc';
    ctx.fill();
  }
  ctx.strokeStyle = '#6a9bcc';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(varXPos - 4, meanY);
  ctx.lineTo(varXPos + 4, meanY);
  ctx.stroke();

  ctx.save();
  ctx.translate(varXPos - 12, meanY);
  ctx.rotate(-Math.PI / 2);
  label(`σy = ${stdY.toFixed(0)}px`, 0, 0, '#6a9bcc', 9);
  ctx.restore();

  // Variance comparison box
  const boxX = W - pad.r - 120;
  const boxY = pad.t + ph - 65;
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillRect(boxX - 5, boxY - 5, 130, 70);
  ctx.strokeStyle = '#e8e6dc';
  ctx.lineWidth = 1;
  ctx.strokeRect(boxX - 5, boxY - 5, 130, 70);

  ctx.fillStyle = '#1a1a19';
  ctx.font = 'bold 10px Fira Sans, system-ui';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('Дисперсия:', boxX, boxY);

  ctx.fillStyle = '#da7756';
  ctx.font = '10px Fira Sans, system-ui';
  ctx.fillText(`σ²x = ${varX.toFixed(0)}  (σx = ${stdX.toFixed(0)})`, boxX, boxY + 16);

  ctx.fillStyle = '#6a9bcc';
  ctx.fillText(`σ²y = ${varY.toFixed(0)}  (σy = ${stdY.toFixed(0)})`, boxX, boxY + 30);

  ctx.fillStyle = '#1a1a19';
  ctx.font = 'bold 9px Fira Sans, system-ui';
  const ratio = (varX / varY).toFixed(1);
  ctx.fillText(`σ²x / σ²y = ${ratio}`, boxX, boxY + 46);
  ctx.fillStyle = '#6b6b66';
  ctx.font = '8px Fira Sans, system-ui';
  ctx.fillText(parseFloat(ratio) > 2 ? '→ X важнее Y' : parseFloat(ratio) < 0.5 ? '→ Y важнее X' : '→ обе оси важны', boxX, boxY + 58);

  ctx.textBaseline = 'alphabetic';

  // Formula top-right
  label('d² = Δx² + Δy²', W - pad.r - 60, pad.t + 12, '#1a1a19', 11);
}

// ── Page: Theory ──
// ── Page: Where information is stored ──
// ── 1D information canvas: three strips showing variance = information ──
function OneDimCanvas() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [w, setW] = useState(0);

  useEffect(() => {
    const measure = () => containerRef.current && setW(containerRef.current.clientWidth);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const H = 680;

  useEffect(() => {
    if (!w) return;
    const c = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    c.width = w * dpr;
    c.height = H * dpr;
    const ctx = c.getContext('2d');
    ctx.scale(dpr, dpr);
    drawOneDim(ctx, w, H);
  }, [w]);

  return (
    <div ref={containerRef} className="w-full">
      {w > 0 && <canvas ref={canvasRef} style={{ width: w, height: H }} className="rounded-lg block border border-border" />}
    </div>
  );
}

function drawOneDim(ctx, W, H) {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  let seed = 33;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const randn = () => {
    const u1 = rand(), u2 = rand();
    return Math.sqrt(-2 * Math.log(u1 || 0.001)) * Math.cos(2 * Math.PI * u2);
  };

  const rowH = 200; // strip + histogram + padding
  const pad = { l: 50, r: 30 };
  const stripW = W - pad.l - pad.r;

  const rows = [
    {
      title: 'Зарплата: 30K–500K',
      sub: 'Дисперсия большая → различаем бедных и богатых',
      color: '#588157',
      generate: () => { seed = 33; const pts = []; for (let i = 0; i < 40; i++) { const v = 250 + randn() * 100; pts.push(Math.max(30, Math.min(500, v))); } return pts; },
      unit: 'K ₽',
      min: 0, max: 550,
    },
    {
      title: 'Температура: 36.4–36.8',
      sub: 'Дисперсия крошечная → все одинаковые',
      color: '#c0392b',
      generate: () => { seed = 55; const pts = []; for (let i = 0; i < 40; i++) pts.push(36.6 + randn() * 0.1); return pts; },
      unit: '°C',
      min: 35, max: 38,
    },
    {
      title: 'Константа: всё = 42',
      sub: 'Дисперсия = 0 → нет информации вообще',
      color: '#6b6b66',
      generate: () => { const pts = []; for (let i = 0; i < 40; i++) pts.push(42 + (Math.random() - 0.5) * 0.001); return pts; },
      unit: '',
      min: 40, max: 44,
    },
  ];

  function label(text, x, y, color, size = 9) {
    ctx.font = `bold ${size}px Fira Sans, system-ui`;
    const m = ctx.measureText(text);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(x - m.width/2 - 2, y - size/2 - 2, m.width + 4, size + 4);
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
    ctx.textBaseline = 'alphabetic';
  }

  for (let ri = 0; ri < rows.length; ri++) {
    const r = rows[ri];
    const y0 = 15 + ri * (rowH + 15);
    const cy = y0 + rowH / 2;
    const pts = r.generate();

    // Compute stats
    const mean = pts.reduce((a,b) => a+b, 0) / pts.length;
    const variance = pts.reduce((s,x) => s + (x - mean)**2, 0) / pts.length;
    const std = Math.sqrt(variance);

    // Title
    ctx.fillStyle = r.color;
    ctx.font = 'bold 11px Fira Sans, system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(r.title, pad.l, y0 + 10);
    ctx.fillStyle = '#6b6b66';
    ctx.font = '9px Fira Sans, system-ui';
    ctx.fillText(r.sub, pad.l, y0 + 22);

    // Number line
    const lineY = cy + 12;
    ctx.strokeStyle = '#e8e6dc';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.l, lineY);
    ctx.lineTo(pad.l + stripW, lineY);
    ctx.stroke();

    // Ticks
    const range = r.max - r.min;
    for (let t = 0; t <= 4; t++) {
      const val = r.min + (range * t / 4);
      const x = pad.l + (val - r.min) / range * stripW;
      ctx.strokeStyle = '#ddd';
      ctx.beginPath();
      ctx.moveTo(x, lineY - 3);
      ctx.lineTo(x, lineY + 3);
      ctx.stroke();
      ctx.fillStyle = '#aaa';
      ctx.font = '8px Fira Sans, system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(val % 1 === 0 ? val.toString() : val.toFixed(1), x, lineY + 14);
    }

    // Points
    for (const v of pts) {
      const x = pad.l + (v - r.min) / range * stripW;
      const jitter = (rand() - 0.5) * 12;
      ctx.fillStyle = r.color + '90';
      ctx.beginPath();
      ctx.arc(x, lineY + jitter - 14, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Mean marker
    const meanX = pad.l + (mean - r.min) / range * stripW;
    ctx.fillStyle = '#1a1a19';
    ctx.beginPath();
    ctx.moveTo(meanX, lineY + 3);
    ctx.lineTo(meanX - 4, lineY + 10);
    ctx.lineTo(meanX + 4, lineY + 10);
    ctx.closePath();
    ctx.fill();

    // σ arrow
    if (std > 0.01) {
      const s1 = pad.l + Math.max(0, (mean - std - r.min) / range) * stripW;
      const s2 = pad.l + Math.min(1, (mean + std - r.min) / range) * stripW;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(s1, lineY + 20);
      ctx.lineTo(s2, lineY + 20);
      ctx.stroke();
      // arrowheads
      for (const [x, dir] of [[s1, 1], [s2, -1]]) {
        ctx.beginPath();
        ctx.moveTo(x, lineY + 20);
        ctx.lineTo(x + dir * 4, lineY + 17);
        ctx.lineTo(x + dir * 4, lineY + 23);
        ctx.closePath();
        ctx.fillStyle = r.color;
        ctx.fill();
      }
      label(`σ=${std.toFixed(std > 1 ? 0 : 2)}`, (s1 + s2) / 2, lineY + 30, r.color, 8);
    } else {
      label('σ ≈ 0', meanX, lineY + 25, r.color, 8);
    }

    // Verdict
    const vx = W - pad.r - 5;
    ctx.textAlign = 'right';
    ctx.font = 'bold 10px Fira Sans, system-ui';
    ctx.fillStyle = r.color;
    ctx.fillText(
      variance > 100 ? '✓ информативно' : variance > 0.01 ? '△ мало информации' : '✗ нет информации',
      vx, cy + 8
    );

    // ── Histogram + density curve below ──
    const histY0 = lineY + 38;
    const histH = 50;
    const nBins = 20;
    const bins = new Array(nBins).fill(0);
    for (const v of pts) {
      const idx = Math.min(nBins - 1, Math.floor((v - r.min) / range * nBins));
      bins[idx]++;
    }
    const maxBin = Math.max(...bins, 1);

    // Histogram bars
    const binW = stripW / nBins;
    for (let b = 0; b < nBins; b++) {
      const bh = (bins[b] / maxBin) * histH;
      ctx.fillStyle = r.color + '30';
      ctx.fillRect(pad.l + b * binW, histY0 + histH - bh, binW - 1, bh);
    }

    // Density curve (gaussian)
    if (std > 0.01) {
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let px = 0; px <= stripW; px += 2) {
        const val = r.min + (px / stripW) * range;
        const z = (val - mean) / std;
        const density = Math.exp(-0.5 * z * z);
        const y = histY0 + histH - density * histH * 0.95;
        px === 0 ? ctx.moveTo(pad.l + px, y) : ctx.lineTo(pad.l + px, y);
      }
      ctx.stroke();
    }

    // Axis line
    ctx.strokeStyle = '#e8e6dc';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.l, histY0 + histH);
    ctx.lineTo(pad.l + stripW, histY0 + histH);
    ctx.stroke();

    // Label
    label('частотность →', pad.l + 25, histY0 + 3, '#aaa', 7);
  }
}

// ── Three clouds comparison canvas ──
function ThreeCloudsCanvas() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [w, setW] = useState(0);

  useEffect(() => {
    const measure = () => containerRef.current && setW(containerRef.current.clientWidth);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const H = 420;

  useEffect(() => {
    if (!w) return;
    const c = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    c.width = w * dpr;
    c.height = H * dpr;
    const ctx = c.getContext('2d');
    ctx.scale(dpr, dpr);
    drawThreeClouds(ctx, w, H);
  }, [w]);

  return (
    <div ref={containerRef} className="w-full">
      {w > 0 && <canvas ref={canvasRef} style={{ width: w, height: H }} className="rounded-lg block border border-border" />}
    </div>
  );
}

function drawThreeClouds(ctx, W, H) {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  const n = 80;
  const panelW = Math.floor(W / 3);
  const pad = 30;
  const plotW = panelW - pad * 2;
  const plotH = H - 120;

  // Seeded random
  let seed = 42;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const randn = () => {
    const u1 = rand(), u2 = rand();
    return Math.sqrt(-2 * Math.log(u1 || 0.001)) * Math.cos(2 * Math.PI * u2);
  };

  function label(text, x, y, color, size = 10) {
    ctx.font = `bold ${size}px Fira Sans, system-ui`;
    const m = ctx.measureText(text);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(x - m.width/2 - 3, y - size/2 - 2, m.width + 6, size + 4);
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
    ctx.textBaseline = 'alphabetic';
  }

  // Generate three cloud types
  const clouds = [];

  // Cloud 1: INFORMATIVE — clear linear relationship + small noise
  seed = 42;
  const cloud1 = [];
  for (let i = 0; i < n; i++) {
    const t = randn() * 0.8;
    cloud1.push([t * 0.9 + randn() * 0.1, t * 0.7 + randn() * 0.1]);
  }
  clouds.push(cloud1);

  // Cloud 2: NOISY — there IS a relationship but buried in noise
  seed = 77;
  const cloud2 = [];
  for (let i = 0; i < n; i++) {
    const t = randn() * 0.5;
    cloud2.push([t * 0.6 + randn() * 0.6, t * 0.4 + randn() * 0.6]);
  }
  clouds.push(cloud2);

  // Cloud 3: EMPTY — uniform circle, no structure at all
  seed = 99;
  const cloud3 = [];
  for (let i = 0; i < n; i++) {
    const angle = rand() * Math.PI * 2;
    const r = Math.sqrt(rand()) * 0.9;
    cloud3.push([Math.cos(angle) * r, Math.sin(angle) * r]);
  }
  clouds.push(cloud3);

  const titles = [
    { text: 'Информативное', sub: 'Есть структура — PCA найдёт', color: '#588157' },
    { text: 'Шумное', sub: 'Структура есть, но утонула в шуме', color: '#b8860b' },
    { text: 'Пустое (равномерное)', sub: 'Нет структуры — снижать нечего', color: '#c0392b' },
  ];

  const entropy = [];

  for (let ci = 0; ci < 3; ci++) {
    const cloud = clouds[ci];
    const ox = ci * panelW + pad;
    const oy = 50;
    const cx = ox + plotW / 2;
    const cy = oy + plotH / 2;
    const scale = plotW / 2.2;

    // Panel border
    ctx.strokeStyle = '#e8e6dc';
    ctx.lineWidth = 1;
    ctx.strokeRect(ci * panelW + 5, 5, panelW - 10, H - 10);

    // Title
    ctx.fillStyle = titles[ci].color;
    ctx.font = 'bold 12px Fira Sans, system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(titles[ci].text, cx, 22);
    ctx.fillStyle = '#6b6b66';
    ctx.font = '9px Fira Sans, system-ui';
    ctx.fillText(titles[ci].sub, cx, 36);

    // Axes
    ctx.strokeStyle = '#e8e6dc';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(ox, oy + plotH);
    ctx.lineTo(ox + plotW, oy + plotH);
    ctx.stroke();

    // Compute stats
    const xs = cloud.map(p => p[0]);
    const ys = cloud.map(p => p[1]);
    const mx = xs.reduce((a,b) => a+b, 0) / n;
    const my = ys.reduce((a,b) => a+b, 0) / n;
    const vx = xs.reduce((s,x) => s + (x-mx)**2, 0) / n;
    const vy = ys.reduce((s,y) => s + (y-my)**2, 0) / n;
    const covxy = cloud.reduce((s,p) => s + (p[0]-mx)*(p[1]-my), 0) / n;
    const corr = covxy / (Math.sqrt(vx) * Math.sqrt(vy) || 1);

    // Eigenvalues of covariance matrix (for explained variance ratio)
    const trace = vx + vy;
    const det = vx * vy - covxy * covxy;
    const disc = Math.sqrt(Math.max(0, trace * trace / 4 - det));
    const ev1 = trace / 2 + disc;
    const ev2 = trace / 2 - disc;
    const explained = ev1 / (ev1 + ev2) * 100;

    entropy.push({ corr, explained, vx, vy });

    // Draw points
    for (const p of cloud) {
      const px = cx + p[0] * scale;
      const py = cy - p[1] * scale;
      ctx.fillStyle = titles[ci].color + '80';
      ctx.beginPath();
      ctx.arc(px, py, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw regression line for cloud 1
    if (ci === 0) {
      // Eigenvector direction
      const angle = Math.atan2(covxy, ev1 - vy);
      const len = scale * 1.2;
      ctx.strokeStyle = titles[ci].color;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.beginPath();
      ctx.moveTo(cx - Math.cos(angle) * len, cy + Math.sin(angle) * len);
      ctx.lineTo(cx + Math.cos(angle) * len, cy - Math.sin(angle) * len);
      ctx.stroke();
      ctx.setLineDash([]);
      label('PC1', cx + Math.cos(angle) * len + 10, cy - Math.sin(angle) * len, titles[ci].color, 9);
    }

    // Stats box
    const bx = ox + 4;
    const by = oy + plotH + 8;
    ctx.fillStyle = '#1a1a19';
    ctx.font = '9px Fira Sans, system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(`|корреляция| = ${Math.abs(corr).toFixed(2)}`, bx, by + 10);
    ctx.fillText(`PC1 объясняет ${explained.toFixed(0)}%`, bx, by + 22);

    // Visual bar for explained variance
    const barY = by + 30;
    const barW = plotW - 8;
    ctx.fillStyle = '#e8e6dc';
    ctx.fillRect(bx, barY, barW, 8);
    ctx.fillStyle = titles[ci].color;
    ctx.fillRect(bx, barY, barW * (explained / 100), 8);
    ctx.fillStyle = '#6b6b66';
    ctx.font = '8px Fira Sans, system-ui';
    ctx.fillText(`${explained.toFixed(0)}%`, bx + barW + 3, barY + 7);
  }
}

// ── 3D density surface ──
function DensitySurface3D({ type }) {
  const mesh = useMemo(() => {
    const res = 60;
    const size = 3;
    const geom = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];
    const indices = [];

    function normalDensity(x, z) {
      return Math.exp(-0.5 * (x * x + z * z));
    }

    function multimodalDensity(x, z) {
      // Three peaks at different locations
      const p1 = 0.6 * Math.exp(-2 * ((x - 0.8) ** 2 + (z - 0.5) ** 2));
      const p2 = 1.0 * Math.exp(-3 * ((x + 0.5) ** 2 + (z + 0.3) ** 2));
      const p3 = 0.4 * Math.exp(-1.5 * ((x + 0.2) ** 2 + (z - 1.0) ** 2));
      const p4 = 0.3 * Math.exp(-2.5 * ((x - 1.0) ** 2 + (z + 0.8) ** 2));
      return p1 + p2 + p3 + p4;
    }

    const density = type === 'normal' ? normalDensity : multimodalDensity;

    // Find max for color scaling
    let maxH = 0;
    for (let i = 0; i <= res; i++) {
      for (let j = 0; j <= res; j++) {
        const x = (i / res - 0.5) * size * 2;
        const z = (j / res - 0.5) * size * 2;
        maxH = Math.max(maxH, density(x, z));
      }
    }

    for (let i = 0; i <= res; i++) {
      for (let j = 0; j <= res; j++) {
        const x = (i / res - 0.5) * size * 2;
        const z = (j / res - 0.5) * size * 2;
        const h = density(x, z);
        const y = (h / maxH) * 1.8;

        positions.push(x, y, z);

        // Color: warm peak → cool valley
        const t = h / maxH;
        if (type === 'normal') {
          colors.push(
            0.85 - t * 0.4,    // R
            0.47 + t * 0.15,   // G
            0.34 + t * 0.05,   // B
          );
        } else {
          colors.push(
            0.72 - t * 0.2,    // R
            0.53 + t * 0.1,    // G
            0.04 + t * 0.3,    // B
          );
        }
      }
    }

    for (let i = 0; i < res; i++) {
      for (let j = 0; j < res; j++) {
        const a = i * (res + 1) + j;
        const b = a + 1;
        const c = a + (res + 1);
        const d = c + 1;
        indices.push(a, b, c);
        indices.push(b, d, c);
      }
    }

    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom;
  }, [type]);

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 8, 5]} intensity={0.7} />
      <directionalLight position={[-3, 4, -3]} intensity={0.3} />
      <mesh geometry={mesh}>
        <meshStandardMaterial vertexColors side={THREE.DoubleSide} roughness={0.6} />
      </mesh>
      {/* Floor grid */}
      <gridHelper args={[6, 12, '#e8e6dc', '#e8e6dc']} position={[0, 0, 0]} />
      <OrbitControls enablePan={false} minDistance={3} maxDistance={10} autoRotate autoRotateSpeed={0.6} />
    </>
  );
}

// ── Orthogonality / independence canvas ──
function OrthogonalityCanvas() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [w, setW] = useState(0);

  useEffect(() => {
    const measure = () => containerRef.current && setW(containerRef.current.clientWidth);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const H = 460;

  useEffect(() => {
    if (!w) return;
    const c = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    c.width = w * dpr;
    c.height = H * dpr;
    const ctx = c.getContext('2d');
    ctx.scale(dpr, dpr);
    drawOrthogonality(ctx, w, H);
  }, [w]);

  return (
    <div ref={containerRef} className="w-full">
      {w > 0 && <canvas ref={canvasRef} style={{ width: w, height: H }} className="rounded-lg block border border-border" />}
    </div>
  );
}

function drawOrthogonality(ctx, W, H) {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  const panelW = Math.floor(W / 3);
  const rowH = H / 2 - 10;
  const pad = 25;
  const plotS = Math.min(panelW - pad * 2, rowH - 40);
  const n = 60;

  let seed = 42;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const randn = () => {
    const u1 = rand(), u2 = rand();
    return Math.sqrt(-2 * Math.log(u1 || 0.001)) * Math.cos(2 * Math.PI * u2);
  };

  function label(text, x, y, color, size = 9) {
    ctx.font = `bold ${size}px Fira Sans, system-ui`;
    const m = ctx.measureText(text);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(x - m.width/2 - 2, y - size/2 - 2, m.width + 4, size + 4);
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
    ctx.textBaseline = 'alphabetic';
  }

  function drawCloud(points, cx, cy, scale, color, title, subtitle, axes) {
    // Axes
    ctx.strokeStyle = '#e8e6dc';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - scale, cy);
    ctx.lineTo(cx + scale, cy);
    ctx.moveTo(cx, cy - scale);
    ctx.lineTo(cx, cy + scale);
    ctx.stroke();

    // Axis labels
    if (axes) {
      ctx.fillStyle = '#aaa';
      ctx.font = '8px Fira Sans, system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(axes[0], cx + scale - 5, cy + 12);
      ctx.fillText(axes[1], cx + 12, cy - scale + 8);
    }

    // Points
    for (const p of points) {
      ctx.fillStyle = color + '70';
      ctx.beginPath();
      ctx.arc(cx + p[0] * scale, cy - p[1] * scale, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Title
    label(title, cx, cy - scale - 14, color, 10);
    label(subtitle, cx, cy - scale - 2, '#6b6b66', 7);
  }

  const panels = [
    {
      title: 'Коррелированные',
      sub: 'corr ≈ 0.9',
      color: '#c0392b',
      gen: () => { seed = 42; const pts = []; for (let i = 0; i < n; i++) { const t = randn(); pts.push([t*0.7 + randn()*0.15, t*0.6 + randn()*0.15]); } return pts; },
      afterTitle: 'После V^T: ортогональны',
      afterSub: 'corr = 0',
    },
    {
      title: 'Независимые',
      sub: 'corr ≈ 0',
      color: '#588157',
      gen: () => { seed = 77; const pts = []; for (let i = 0; i < n; i++) { pts.push([randn()*0.6, randn()*0.3]); } return pts; },
      afterTitle: 'После V^T: без изменений',
      afterSub: 'уже ортогональны',
    },
    {
      title: 'Нелинейная зависимость',
      sub: 'corr ≈ 0, но y = x²',
      color: '#b8860b',
      gen: () => { seed = 99; const pts = []; for (let i = 0; i < n; i++) { const x = randn()*0.5; pts.push([x, x*x*1.2 - 0.3 + randn()*0.08]); } return pts; },
      afterTitle: 'После V^T: всё ещё зависимы!',
      afterSub: 'PCA не видит нелинейность',
    },
  ];

  // Row 1: Before V^T
  ctx.fillStyle = '#6b6b66';
  ctx.font = 'bold 11px Fira Sans, system-ui';
  ctx.textAlign = 'left';
  ctx.fillText('До поворота V^T:', pad, 16);

  for (let i = 0; i < 3; i++) {
    const p = panels[i];
    const pts = p.gen();
    const cx = i * panelW + panelW / 2;
    const cy = rowH / 2 + 30;

    // Panel border
    ctx.strokeStyle = '#f0efeb';
    ctx.lineWidth = 1;
    ctx.strokeRect(i * panelW + 3, 3, panelW - 6, rowH + 5);

    drawCloud(pts, cx, cy, plotS / 2.2, p.color, p.title, p.sub, ['x', 'y']);

    // Compute and show correlation
    const mx = pts.reduce((s,q) => s+q[0], 0) / n;
    const my = pts.reduce((s,q) => s+q[1], 0) / n;
    const vx = pts.reduce((s,q) => s+(q[0]-mx)**2, 0) / n;
    const vy = pts.reduce((s,q) => s+(q[1]-my)**2, 0) / n;
    const cov = pts.reduce((s,q) => s+(q[0]-mx)*(q[1]-my), 0) / n;
    const corr = cov / (Math.sqrt(vx) * Math.sqrt(vy) || 1);
    label(`r = ${corr.toFixed(2)}`, cx, cy + plotS / 2.2 + 10, p.color, 9);
  }

  // Arrow between rows
  const arrowY = rowH + 12;
  ctx.fillStyle = '#da7756';
  ctx.font = 'bold 12px Fira Sans, system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('↓  V^T (поворот)  ↓', W / 2, arrowY);

  // Row 2: After V^T
  ctx.fillStyle = '#6b6b66';
  ctx.font = 'bold 11px Fira Sans, system-ui';
  ctx.textAlign = 'left';
  ctx.fillText('После поворота V^T:', pad, rowH + 28);

  for (let i = 0; i < 3; i++) {
    const p = panels[i];
    const pts = p.gen();
    const cx = i * panelW + panelW / 2;
    const cy = rowH + rowH / 2 + 38;

    ctx.strokeStyle = '#f0efeb';
    ctx.lineWidth = 1;
    ctx.strokeRect(i * panelW + 3, rowH + 10, panelW - 6, rowH + 5);

    // Rotate points by PCA (eigenvectors of covariance)
    const mx = pts.reduce((s,q) => s+q[0], 0) / n;
    const my = pts.reduce((s,q) => s+q[1], 0) / n;
    const centered = pts.map(q => [q[0]-mx, q[1]-my]);
    const vx = centered.reduce((s,q) => s+q[0]**2, 0) / n;
    const vy = centered.reduce((s,q) => s+q[1]**2, 0) / n;
    const cov = centered.reduce((s,q) => s+q[0]*q[1], 0) / n;
    const angle = 0.5 * Math.atan2(2 * cov, vx - vy);
    const cosA = Math.cos(angle), sinA = Math.sin(angle);

    const rotated = centered.map(q => [
      q[0] * cosA + q[1] * sinA,
      -q[0] * sinA + q[1] * cosA,
    ]);

    // For panel 3 (nonlinear): rotation doesn't help
    const finalPts = i === 2 ? centered : rotated;

    drawCloud(finalPts, cx, cy, plotS / 2.2, p.color, p.afterTitle, p.afterSub, ['PC1', 'PC2']);

    // Correlation after
    const amx = finalPts.reduce((s,q) => s+q[0], 0) / n;
    const amy = finalPts.reduce((s,q) => s+q[1], 0) / n;
    const avx = finalPts.reduce((s,q) => s+(q[0]-amx)**2, 0) / n;
    const avy = finalPts.reduce((s,q) => s+(q[1]-amy)**2, 0) / n;
    const acov = finalPts.reduce((s,q) => s+(q[0]-amx)*(q[1]-amy), 0) / n;
    const acorr = acov / (Math.sqrt(avx) * Math.sqrt(avy) || 1);
    label(`r = ${acorr.toFixed(2)}`, cx, cy + plotS / 2.2 + 10, p.color, 9);

    // Show PC axes for first panel (before)
    if (i === 0) {
      const topCx = 0 * panelW + panelW / 2;
      const topCy = rowH / 2 + 30;
      const axLen = plotS / 2.5;
      ctx.strokeStyle = '#c0392b';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(topCx - Math.cos(angle) * axLen, topCy + Math.sin(angle) * axLen);
      ctx.lineTo(topCx + Math.cos(angle) * axLen, topCy - Math.sin(angle) * axLen);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(topCx - Math.cos(angle + Math.PI/2) * axLen * 0.5, topCy + Math.sin(angle + Math.PI/2) * axLen * 0.5);
      ctx.lineTo(topCx + Math.cos(angle + Math.PI/2) * axLen * 0.5, topCy - Math.sin(angle + Math.PI/2) * axLen * 0.5);
      ctx.stroke();
      ctx.setLineDash([]);
      label('PC1', topCx + Math.cos(angle) * axLen + 10, topCy - Math.sin(angle) * axLen, '#c0392b', 8);
      label('PC2', topCx + Math.cos(angle + Math.PI/2) * axLen * 0.5 + 10, topCy - Math.sin(angle + Math.PI/2) * axLen * 0.5, '#c0392b', 8);
    }
  }
}

function InformationPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-accent">Где хранится информация</h2>

      <div className="bg-accent-light/30 rounded-xl p-5 border border-accent/20 space-y-4">
        <h3 className="text-lg font-semibold">Информация = расстояния между точками</h3>
        <p className="text-text-dim text-sm leading-relaxed">
          <strong>Информация — в расстояниях между точками.</strong> Если две точки далеко друг от друга —
          они разные (разные пользователи, документы, картинки). Если близко — похожие.
        </p>
        <p className="text-text-dim text-sm leading-relaxed">
          <strong>Дисперсия — индикатор:</strong> она показывает, насколько точки разбросаны <em>вдоль оси</em>.
          Большая дисперсия = точки сильно отличаются вдоль этой оси = ось несёт информацию.
          Маленькая = все почти одинаковые = ось бесполезна.
        </p>
        <p className="text-text-dim text-sm leading-relaxed">
          <strong>Дисперсия (σ²)</strong> — это среднее квадрата отклонения от среднего: <K m={`\\sigma^2 = \\frac{1}{n}\\sum(x_i - \\mu)^2`} />.
          Не «среднее расстояние между парами», а расстояние каждой точки до центра (в квадрате, усреднённое).
          <strong> Стандартное отклонение</strong> σ = √σ² — в тех же единицах что данные.
        </p>
      </div>

      <div className="bg-card rounded-xl p-5 border border-border space-y-3">
        <p className="text-text font-semibold text-sm">Пример: 1000 людей, 3 признака</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-coral/5 rounded-lg p-3 border border-coral/20">
            <p className="text-coral font-bold mb-1">Рост: 150–200 см</p>
            <p className="text-text-dim">Дисперсия большая. Люди сильно отличаются → информативно.</p>
          </div>
          <div className="bg-green/5 rounded-lg p-3 border border-green/20">
            <p className="text-green font-bold mb-1">Вес: 50–120 кг</p>
            <p className="text-text-dim">Дисперсия большая. Тоже информативно.</p>
          </div>
          <div className="bg-border/30 rounded-lg p-3 border border-border">
            <p className="text-text-dim font-bold mb-1">Температура: 36.4–36.8</p>
            <p className="text-text-dim">Дисперсия крошечная. Все одинаковые → можно выбросить.</p>
          </div>
        </div>
        <p className="text-text-dim text-xs">
          PCA говорит: «выброси температуру, оставь рост и вес». Расстояния между людьми почти не изменятся.
        </p>
      </div>

      {/* 2D Canvas: distances */}
      <div className="bg-card rounded-xl p-5 border border-border space-y-3">
        <h3 className="text-lg font-semibold">Визуально: расстояния = информация</h3>
        <p className="text-text-dim text-xs">
          Каждая линия — расстояние (информация). Раскладывается на Δx и Δy (Пифагор).
          Дисперсия по оси = «насколько точки разбросаны вдоль этой оси».
        </p>
        <DistanceCanvas />
      </div>

      {/* 2D Canvas: density heatmap */}
      <div className="bg-card rounded-xl p-5 border border-border space-y-3">
        <h3 className="text-lg font-semibold">Плотность: чем ближе к центру — тем «нормальнее»</h3>
        <p className="text-text-dim text-xs">
          Те же точки, фон = плотность нормального распределения.
          Яркий центр = рядом со средним. Бледные края = далеко.
          Дисперсия определяет, как быстро яркость спадает.
        </p>
        <DensityCanvas />
      </div>

      {/* 3D density surfaces */}
      <div className="bg-card rounded-xl p-5 border border-border space-y-3">
        <h3 className="text-lg font-semibold">3D: частотность как высота</h3>
        <p className="text-text-dim text-xs">
          Та же плотность, но теперь высота = частотность. Чем чаще точки попадают в область — тем выше поверхность.
          Крути мышкой, чтобы посмотреть с разных сторон.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-semibold text-accent mb-2">Нормальное распределение</p>
            <p className="text-text-dim text-[10px] mb-2">Один пик в центре. Гладкий холм. Большинство точек рядом со средним.</p>
            <div className="rounded-lg border border-border overflow-hidden" style={{ height: 320 }}>
              <Canvas camera={{ position: [4, 3, 4], fov: 45 }}>
                <DensitySurface3D type="normal" />
              </Canvas>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-[#b8860b] mb-2">Мультимодальное (горы)</p>
            <p className="text-text-dim text-[10px] mb-2">Несколько пиков — кластеры. Точки скапливаются в разных местах. Горный пейзаж.</p>
            <div className="rounded-lg border border-border overflow-hidden" style={{ height: 320 }}>
              <Canvas camera={{ position: [4, 3, 4], fov: 45 }}>
                <DensitySurface3D type="multimodal" />
              </Canvas>
            </div>
          </div>
        </div>
      </div>

      {/* Two levels of information */}
      <div className="bg-card rounded-xl p-5 border border-border space-y-3">
        <h3 className="text-lg font-semibold">Два уровня информации</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-accent-light/20 rounded-lg p-4 border border-accent/20">
            <p className="text-accent font-bold text-sm mb-1">Уровень 1: внутри признака</p>
            <p className="text-text-dim text-xs leading-relaxed">
              «Насколько объекты отличаются по этому признаку?»
              Измеряется <strong>дисперсией</strong>. Большая дисперсия = признак полезен.
              Маленькая = все одинаковые, можно выбросить.
            </p>
          </div>
          <div className="bg-green/5 rounded-lg p-4 border border-green/20">
            <p className="text-green font-bold text-sm mb-1">Уровень 2: между признаками</p>
            <p className="text-text-dim text-xs leading-relaxed">
              «Знание одного признака предсказывает другой?»
              Измеряется <strong>корреляцией</strong>. Высокая = один избыточен, PCA сожмёт.
              Низкая = оба нужны, PCA бесполезен.
            </p>
          </div>
        </div>
      </div>

      {/* Level 1: 1D information (variance) */}
      <div className="bg-card rounded-xl p-5 border border-border space-y-3">
        <h3 className="text-lg font-semibold">Уровень 1: информация внутри одного признака</h3>
        <p className="text-text-dim text-xs">
          Три примера одного признака (1D). Дисперсия показывает, сколько информации несёт признак —
          можно ли по нему различать объекты.
        </p>
        <OneDimCanvas />
      </div>

      {/* Level 2: between features */}
      <div className="bg-card rounded-xl p-5 border border-border space-y-4">
        <h3 className="text-lg font-semibold">Уровень 2: информация между признаками (корреляция)</h3>
        <p className="text-text-dim text-xs">
          Теперь 2D — два признака. Корреляция показывает, можно ли один выбросить.
          PCA работает именно с этим уровнем.
        </p>
        <ThreeCloudsCanvas />
      </div>

      <div className="bg-card rounded-xl p-5 border border-border">
        <p className="text-text-dim text-sm leading-relaxed">
          <strong>Итого:</strong> информация — это не просто «точки разбросаны». Это <em>структурированный</em> разброс,
          из которого можно извлечь закономерность. Дисперсия показывает <em>количество</em> разброса,
          но не его <em>качество</em>. PCA работает хорошо, когда данные имеют структуру (левый случай).
          Для чистого шума (средний) никакое снижение размерности не поможет.
        </p>
      </div>

      {/* How PCA uses both levels */}
      <div className="bg-accent-light/30 rounded-xl p-5 border border-accent/20 space-y-4">
        <h3 className="text-lg font-semibold">Как PCA использует оба уровня</h3>
        <p className="text-text-dim text-sm leading-relaxed">
          PCA не работает «только с корреляциями» или «только с дисперсиями» — она использует
          <strong> оба уровня последовательно</strong>:
        </p>

        <div className="space-y-3">
          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-full bg-green/10 border border-green/30 flex items-center justify-center shrink-0">
              <span className="text-green font-bold text-sm">1</span>
            </div>
            <div>
              <p className="text-text font-semibold text-sm">Поворот (V^T): убираем корреляции</p>
              <p className="text-text-dim text-xs leading-relaxed">
                PCA поворачивает оси так, чтобы корреляции между признаками исчезли.
                Новые оси (PC1, PC2, ...) — независимые направления. Это уровень 2: используем
                корреляции, чтобы найти «настоящие» оси данных.
              </p>
            </div>
          </div>

          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-full bg-coral/10 border border-coral/30 flex items-center justify-center shrink-0">
              <span className="text-coral font-bold text-sm">2</span>
            </div>
            <div>
              <p className="text-text font-semibold text-sm">Отсечение: выбрасываем маленькие дисперсии</p>
              <p className="text-text-dim text-xs leading-relaxed">
                Смотрим дисперсию по каждой новой оси (σ₁, σ₂, σ₃...).
                Маленькие σ — выбрасываем. Это уровень 1: используем дисперсию,
                чтобы решить, какие оси бесполезны.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg p-4 space-y-2">
          <p className="text-text-dim text-xs leading-relaxed">
            <span className="text-accent font-semibold">Без корреляций</span> (круглое облако) →
            шаг 1 бесполезен: после поворота все оси одинаковые. Нечего оптимизировать.
          </p>
          <p className="text-text-dim text-xs leading-relaxed">
            <span className="text-accent font-semibold">Без разницы в дисперсиях</span> (все σ равны после поворота) →
            шаг 2 бесполезен: все оси одинаково важны. Нечего выбрасывать.
          </p>
          <p className="text-text-dim text-xs leading-relaxed">
            <span className="text-accent font-semibold">PCA мощен, когда работают оба шага:</span> корреляции позволяют
            найти хорошие оси, а разница в дисперсиях — выбросить лишние.
          </p>
        </div>
      </div>

      {/* Orthogonality = independence */}
      <div className="bg-card rounded-xl p-5 border border-border space-y-4">
        <h3 className="text-lg font-semibold">Почему поворот убирает корреляции?</h3>
        <p className="text-text-dim text-sm leading-relaxed">
          <span className="text-accent font-semibold">Ортогональность = нулевая корреляция = линейная независимость.</span>
        </p>
        <p className="text-text-dim text-sm leading-relaxed">
          Когда два вектора ортогональны (угол 90°), их скалярное произведение = 0.
          А ковариация двух признаков — это по сути скалярное произведение центрированных данных.
          Ковариация = 0 → корреляция = 0 → признаки линейно не зависят друг от друга.
        </p>
        <p className="text-text-dim text-sm leading-relaxed">
          <K m="V^T" /> поворачивает координаты так, что ковариационная матрица становится
          <strong> диагональной</strong>: все внедиагональные элементы (ковариации между парами)
          обнуляются. На диагонали остаются только дисперсии <K m="\sigma_1^2, \sigma_2^2, \ldots" /> —
          это и есть сингулярные значения в квадрате.
        </p>

        <div className="bg-bg/50 rounded-lg p-4 text-center space-y-2">
          <p className="text-text-dim text-xs">До поворота (корреляции есть):</p>
          <K m={`\\begin{pmatrix} \\sigma_x^2 & cov_{xy} \\\\ cov_{xy} & \\sigma_y^2 \\end{pmatrix}`} d />
          <p className="text-accent text-lg">↓ V^T</p>
          <p className="text-text-dim text-xs">После поворота (корреляции = 0):</p>
          <K m={`\\begin{pmatrix} \\sigma_1^2 & 0 \\\\ 0 & \\sigma_2^2 \\end{pmatrix}`} d />
        </div>

        <p className="text-text-dim text-xs">Три случая — как выглядят данные до и после поворота V^T, и что PCA не может:</p>
        <OrthogonalityCanvas />

        <div className="bg-amber/5 rounded-lg p-4 border border-amber/20">
          <p className="text-amber font-semibold text-sm mb-1">Ограничение PCA</p>
          <p className="text-text-dim text-xs leading-relaxed">
            Ортогональность = <strong>линейная</strong> независимость. Не полная статистическая.
            Два признака могут быть ортогональны (корреляция = 0), но зависимы нелинейно
            (например, <K m="y = x^2" />). PCA такое не ловит — она видит только линейные связи.
            Для нелинейных зависимостей нужны другие методы (kernel PCA, t-SNE, автоэнкодеры).
          </p>
        </div>
      </div>
    </div>
  );
}


export default InformationPage;
