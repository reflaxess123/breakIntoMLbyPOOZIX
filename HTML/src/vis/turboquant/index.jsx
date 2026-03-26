import { useState, useRef, useEffect, useMemo, Suspense, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import { K } from '../../components/Latex';
import { Routes, Route, Navigate, NavLink } from 'react-router-dom';
import * as THREE from 'three';

// ══════════════════════════════════════════════════════════════
// Math helpers
// ══════════════════════════════════════════════════════════════

function seededRandom(seed) {
  let s = seed;
  return () => { s = (s * 16807 + 1) % 2147483647; return s / 2147483647; };
}

// Generate random orthogonal matrix via Gram-Schmidt (3x3 for viz)
function randomRotation3x3(seed) {
  const rand = seededRandom(seed);
  const randn = () => {
    const u1 = rand() || 0.001, u2 = rand();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };
  // 3 random vectors
  const v = [[randn(), randn(), randn()], [randn(), randn(), randn()], [randn(), randn(), randn()]];
  // Gram-Schmidt
  const dot = (a, b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
  const sub = (a, b, s) => [a[0]-s*b[0], a[1]-s*b[1], a[2]-s*b[2]];
  const norm = a => { const l = Math.sqrt(dot(a,a)); return [a[0]/l, a[1]/l, a[2]/l]; };
  const e0 = norm(v[0]);
  const e1 = norm(sub(v[1], e0, dot(v[1], e0)));
  const e2tmp = sub(v[2], e0, dot(v[2], e0));
  const e2 = norm(sub(e2tmp, e1, dot(e2tmp, e1)));
  return [e0, e1, e2]; // rows of rotation matrix
}

function applyRotation(mat, vec) {
  return mat.map(row => row[0]*vec[0] + row[1]*vec[1] + row[2]*vec[2]);
}

function transposeApply(mat, vec) {
  return [
    mat[0][0]*vec[0] + mat[1][0]*vec[1] + mat[2][0]*vec[2],
    mat[0][1]*vec[0] + mat[1][1]*vec[1] + mat[2][1]*vec[2],
    mat[0][2]*vec[0] + mat[1][2]*vec[1] + mat[2][2]*vec[2],
  ];
}

// Lloyd-Max centroids for uniform-ish distribution (simplified for 2-bit = 4 levels)
function quantize(val, bits) {
  const levels = 1 << bits;
  // Simple uniform quantizer on [-2, 2]
  const lo = -2, hi = 2;
  const step = (hi - lo) / levels;
  const idx = Math.max(0, Math.min(levels - 1, Math.floor((val - lo) / step)));
  const centroid = lo + (idx + 0.5) * step;
  return { idx, centroid };
}

// ══════════════════════════════════════════════════════════════
// Generate sample data (KV cache vectors, simplified to 3D)
// ══════════════════════════════════════════════════════════════

function generateData(n, seed) {
  const rand = seededRandom(seed);
  const randn = () => {
    const u1 = rand() || 0.001, u2 = rand();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };
  const points = [];
  // Correlated data (like real KV cache vectors)
  for (let i = 0; i < n; i++) {
    const z1 = randn(), z2 = randn(), z3 = randn();
    points.push([
      0.8 * z1 + 0.3 * z2,
      0.2 * z1 + 0.7 * z2 + 0.3 * z3,
      0.1 * z1 + 0.2 * z2 + 0.9 * z3,
    ]);
  }
  return points;
}

// ══════════════════════════════════════════════════════════════
// 3D Point Cloud component
// ══════════════════════════════════════════════════════════════

function PointCloud({ points, color = '#da7756', size = 0.06, opacity = 1 }) {
  const positions = useMemo(() => {
    const arr = new Float32Array(points.length * 3);
    points.forEach((p, i) => { arr[i*3] = p[0]; arr[i*3+1] = p[1]; arr[i*3+2] = p[2]; });
    return arr;
  }, [points]);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} count={points.length} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color={color} size={size} transparent opacity={opacity} sizeAttenuation />
    </points>
  );
}

// ══════════════════════════════════════════════════════════════
// Axes helper
// ══════════════════════════════════════════════════════════════

function Axes({ size = 2.5 }) {
  return (
    <group>
      {[[size,0,0,'#c0392b','X'], [0,size,0,'#588157','Y'], [0,0,size,'#3498db','Z']].map(([x,y,z,c,l]) => (
        <group key={l}>
          <line geometry={new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(x,y,z)])}>
            <lineBasicMaterial color={c} />
          </line>
          <Text position={[x*1.1,y*1.1,z*1.1]} fontSize={0.15} color={c}>{l}</Text>
        </group>
      ))}
    </group>
  );
}

// ══════════════════════════════════════════════════════════════
// Grid planes for quantization levels
// ══════════════════════════════════════════════════════════════

function QuantGrid({ bits, axis, color = '#00000015' }) {
  const levels = 1 << bits;
  const lo = -2, hi = 2;
  const step = (hi - lo) / levels;
  const lines = [];
  for (let i = 0; i <= levels; i++) {
    lines.push(lo + i * step);
  }
  return (
    <group>
      {lines.map((v, i) => {
        const pts = axis === 0
          ? [new THREE.Vector3(v, -2, -2), new THREE.Vector3(v, 2, 2)]
          : axis === 1
            ? [new THREE.Vector3(-2, v, -2), new THREE.Vector3(2, v, 2)]
            : [new THREE.Vector3(-2, -2, v), new THREE.Vector3(2, 2, v)];
        return (
          <line key={i} geometry={new THREE.BufferGeometry().setFromPoints(pts)}>
            <lineBasicMaterial color={color} transparent opacity={0.15} />
          </line>
        );
      })}
    </group>
  );
}

// ══════════════════════════════════════════════════════════════
// Residual lines (from quantized to original)
// ══════════════════════════════════════════════════════════════

function ResidualLines({ originals, quantized }) {
  const geometry = useMemo(() => {
    const pts = [];
    originals.forEach((o, i) => {
      const q = quantized[i];
      pts.push(new THREE.Vector3(...o), new THREE.Vector3(...q));
    });
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [originals, quantized]);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color="#c0392b" transparent opacity={0.3} />
    </lineSegments>
  );
}

// ══════════════════════════════════════════════════════════════
// Main Pipeline Visualization
// ══════════════════════════════════════════════════════════════

function PipelineScene({ step, bits }) {
  const data = useMemo(() => generateData(150, 42), []);
  const rotMat = useMemo(() => randomRotation3x3(123), []);

  const rotated = useMemo(() => data.map(p => applyRotation(rotMat, p)), [data, rotMat]);

  const quantized = useMemo(() =>
    rotated.map(p => p.map(v => quantize(v, bits).centroid)),
    [rotated, bits]
  );

  const quantizedOrigSpace = useMemo(() =>
    quantized.map(p => transposeApply(rotMat, p)),
    [quantized, rotMat]
  );

  const residuals = useMemo(() =>
    rotated.map((p, i) => p.map((v, j) => v - quantized[i][j])),
    [rotated, quantized]
  );

  const qjlSigns = useMemo(() =>
    residuals.map(r => r.map(v => v >= 0 ? 1 : -1)),
    [residuals]
  );

  const residualNorms = useMemo(() =>
    residuals.map(r => Math.sqrt(r.reduce((s, v) => s + v*v, 0))),
    [residuals]
  );

  const corrected = useMemo(() =>
    quantized.map((q, i) => {
      const scale = Math.sqrt(Math.PI / 2) / 3 * residualNorms[i];
      return q.map((v, j) => v + scale * qjlSigns[i][j]);
    }),
    [quantized, qjlSigns, residualNorms]
  );

  const correctedOrigSpace = useMemo(() =>
    corrected.map(p => transposeApply(rotMat, p)),
    [corrected, rotMat]
  );

  // Compute MSE for display
  const mseQuant = useMemo(() => {
    let s = 0;
    data.forEach((p, i) => {
      const q = quantizedOrigSpace[i];
      s += p.reduce((acc, v, j) => acc + (v - q[j]) ** 2, 0);
    });
    return s / data.length;
  }, [data, quantizedOrigSpace]);

  const mseCorrected = useMemo(() => {
    let s = 0;
    data.forEach((p, i) => {
      const c = correctedOrigSpace[i];
      s += p.reduce((acc, v, j) => acc + (v - c[j]) ** 2, 0);
    });
    return s / data.length;
  }, [data, correctedOrigSpace]);

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 5, 3]} intensity={0.7} />
      <Axes />

      {/* Step 0: Original data */}
      {step === 0 && <PointCloud points={data} color="#da7756" size={0.08} />}

      {/* Step 1: Rotated */}
      {step === 1 && (
        <>
          <PointCloud points={data} color="#da775640" size={0.06} opacity={0.25} />
          <PointCloud points={rotated} color="#588157" size={0.08} />
        </>
      )}

      {/* Step 2: Quantized in rotated space */}
      {step === 2 && (
        <>
          <PointCloud points={rotated} color="#58815740" size={0.05} opacity={0.2} />
          <PointCloud points={quantized} color="#3498db" size={0.08} />
          <ResidualLines originals={rotated} quantized={quantized} />
          <QuantGrid bits={bits} axis={0} />
          <QuantGrid bits={bits} axis={1} />
          <QuantGrid bits={bits} axis={2} />
        </>
      )}

      {/* Step 3: QJL correction */}
      {step === 3 && (
        <>
          <PointCloud points={quantized} color="#3498db40" size={0.05} opacity={0.2} />
          <PointCloud points={corrected} color="#b8860b" size={0.08} />
        </>
      )}

      {/* Step 4: Back to original space */}
      {step === 4 && (
        <>
          <PointCloud points={data} color="#da7756" size={0.06} opacity={0.4} />
          <PointCloud points={correctedOrigSpace} color="#588157" size={0.08} />
        </>
      )}

      <OrbitControls enablePan={false} minDistance={3} maxDistance={12} />

      {/* Stats text */}
      <Text position={[-2, 2.5, 0]} fontSize={0.15} color="#1a1a19" anchorX="left">
        {step === 0 ? `150 KV-векторов (исходные)` :
         step === 1 ? `После случайного поворота Pi` :
         step === 2 ? `Квантование ${bits}-bit (${1<<bits} уровней). MSE=${mseQuant.toFixed(4)}` :
         step === 3 ? `QJL коррекция (+1 бит). MSE уменьшается` :
         `Восстановлено. MSE=${mseCorrected.toFixed(4)} (было ${mseQuant.toFixed(4)})`}
      </Text>
    </>
  );
}

// ══════════════════════════════════════════════════════════════
// Theory page
// ══════════════════════════════════════════════════════════════

function TheoryPage() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-accent mb-2">TurboQuant: сжатие KV-кеша до 3 бит</h1>
        <p className="text-text-dim italic">Google Research, ICLR 2026. Как сжать память LLM в 6 раз без потери качества.</p>
      </div>

      <div className="bg-card rounded-2xl p-6 border border-border space-y-4">
        <h2 className="text-lg font-bold text-accent">Проблема</h2>
        <p className="text-text leading-relaxed">
          При инференсе LLM хранит <strong>KV-кеш</strong> — ключи и значения из attention для каждого токена.
          Чем длиннее контекст, тем больше памяти. При 100K токенов кеш может занимать <strong>десятки ГБ</strong>.
        </p>
        <p className="text-text leading-relaxed">
          TurboQuant сжимает каждый вектор кеша с 16 бит (FP16) до <strong>3-4 бит</strong> на значение.
          Память ×6, скорость attention ×8. Без потери качества.
        </p>
      </div>

      <div className="bg-card rounded-2xl p-6 border border-border space-y-4">
        <h2 className="text-lg font-bold text-accent">Два этапа</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-bg rounded-xl p-4">
            <h3 className="font-bold text-accent mb-2">Этап 1: PolarQuant</h3>
            <p className="text-sm text-text">
              Случайный поворот → скалярное квантование каждой координаты отдельно.
              Поворот делает координаты <strong>почти независимыми</strong>, поэтому дешёвое
              покоординатное квантование работает так же хорошо, как дорогое векторное.
            </p>
            <p className="text-xs text-text-dim mt-2">Аналогия: V^T из SVD — поворот для декорреляции.</p>
          </div>
          <div className="bg-bg rounded-xl p-4">
            <h3 className="font-bold text-accent mb-2">Этап 2: QJL (1-бит коррекция)</h3>
            <p className="text-sm text-text">
              Берём остаток (разницу между оригиналом и квантованным). Сжимаем до <strong>1 бита</strong> — только знак.
              Математически гарантирует: attention scores <strong>без смещения</strong> (unbiased).
            </p>
            <p className="text-xs text-text-dim mt-2">Итого: (b−1) бит квантование + 1 бит QJL = b бит.</p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl p-6 border border-border space-y-4">
        <h2 className="text-lg font-bold text-accent">Пайплайн</h2>
        <div className="space-y-2 text-text text-sm">
          {[
            ['1', 'Поворот', 'y = Π · x', 'Случайная ортогональная матрица. Координаты становятся почти независимыми.'],
            ['2', 'Квантование', 'idx = argmin|yⱼ − cₖ|', 'Каждую координату округляем к ближайшему центроиду. (b−1) бит.'],
            ['3', 'Остаток', 'r = y − ŷ', 'Разница между оригиналом и квантованным.'],
            ['4', 'QJL', 'sign(S · r)', 'Знак проекции остатка. 1 бит. Гарантирует unbiased оценку.'],
            ['5', 'Хранение', '(idx, sign, ‖r‖)', 'b бит на значение + 1 скаляр FP16 на вектор.'],
          ].map(([n, title, formula, desc]) => (
            <div key={n} className="flex gap-3 items-start">
              <span className="text-accent font-bold shrink-0 w-6">{n}.</span>
              <div>
                <span className="font-bold">{title}:</span>{' '}
                <code className="text-coral text-xs">{formula}</code>
                <p className="text-text-dim text-xs">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-2xl p-6 border border-border space-y-4">
        <h2 className="text-lg font-bold text-accent">Связь с SVD/PCA</h2>
        <div className="bg-bg rounded-xl p-4 space-y-2 text-text text-sm">
          <p><strong>Случайный поворот Π</strong> — та же идея что V^T в SVD. Декорреляция координат.</p>
          <p><strong>Johnson-Lindenstrauss</strong> — случайная проекция сохраняет расстояния (как PCA, но случайная вместо оптимальной).</p>
          <p><strong>Разница:</strong> SVD ищет <em>оптимальные</em> оси (дорого). TurboQuant использует <em>случайные</em> (дёшево, но математически доказано что почти так же хорошо в высоких размерностях).</p>
        </div>
      </div>

      <div className="bg-card rounded-2xl p-6 border border-border">
        <h2 className="text-lg font-bold text-accent mb-4">Результаты</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="p-2 text-left text-accent">Метрика</th>
                <th className="p-2 text-right">Значение</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Сжатие KV-кеша', '6x+'],
                ['Ускорение attention (4-bit, H100)', '8x'],
                ['Бит для zero-loss', '3.5'],
                ['Needle In Haystack (4K→104K)', '100%'],
                ['LongBench score', '50.06 (= baseline)'],
                ['Близость к оптимуму', '~2.7x от информ.-теор. предела'],
              ].map(([m, v]) => (
                <tr key={m} className="border-b border-border/50">
                  <td className="p-2 text-text">{m}</td>
                  <td className="p-2 text-right font-bold text-green">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Interactive 3D Pipeline page
// ══════════════════════════════════════════════════════════════

function PipelinePage() {
  const [step, setStep] = useState(0);
  const [bits, setBits] = useState(2);

  const steps = [
    { label: '0. Исходные KV-векторы', desc: '150 векторов из KV-кеша (упрощено до 3D). В реальности — 128-мерные.' },
    { label: '1. Случайный поворот Π', desc: 'Ортогональная матрица поворачивает координаты. После поворота координаты почти независимы → можно квантовать поотдельности.' },
    { label: '2. Скалярное квантование', desc: 'Каждую координату округляем к ближайшему уровню. Красные линии — ошибка квантования (residual).' },
    { label: '3. QJL коррекция (+1 бит)', desc: 'Берём знак остатка → 1 бит. Корректирует ошибку квантования. Attention scores становятся unbiased.' },
    { label: '4. Восстановление', desc: 'Обратный поворот Π^T → восстановленные векторы (зелёные) рядом с оригиналами (терракотовые). MSE уменьшился после QJL.' },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-accent mb-2">Пайплайн TurboQuant — 3D визуализация</h1>
        <p className="text-text-dim italic">Переключай шаги и крути 3D сцену.</p>
      </div>

      {/* Step selector */}
      <div className="flex flex-nowrap overflow-x-auto scrollbar-hide gap-2">
        {steps.map((s, i) => (
          <button key={i} onClick={() => setStep(i)}
            className={`shrink-0 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
              step === i ? 'bg-accent text-white' : 'bg-card border border-border hover:border-accent/50'
            }`}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Bits slider */}
      {step >= 2 && (
        <div className="flex items-center gap-4 bg-card rounded-xl p-3 border border-border">
          <label className="text-sm text-text-dim whitespace-nowrap">Квантование: <strong className="text-accent">{bits} бит</strong> ({1<<bits} уровней)</label>
          <input type="range" min="1" max="4" step="1" value={bits}
            onChange={e => setBits(+e.target.value)} className="w-full" />
        </div>
      )}

      {/* 3D Scene */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden" style={{ height: 450 }}>
        <Suspense fallback={<div className="flex items-center justify-center h-full text-text-dim">Загрузка 3D...</div>}>
          <Canvas camera={{ position: [4, 3, 5], fov: 45 }}>
            <PipelineScene step={step} bits={bits} />
          </Canvas>
        </Suspense>
      </div>

      {/* Step description */}
      <div className="bg-card rounded-2xl p-6 border border-border">
        <h3 className="font-bold text-accent mb-2">{steps[step].label}</h3>
        <p className="text-text">{steps[step].desc}</p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Router
// ══════════════════════════════════════════════════════════════

export default function TurboQuantViz() {
  return (
    <Routes>
      <Route index element={<Navigate to="theory" replace />} />
      <Route path="theory" element={<TheoryPage />} />
      <Route path="pipeline" element={<PipelinePage />} />
    </Routes>
  );
}
