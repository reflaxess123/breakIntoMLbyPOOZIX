import { useState, useMemo, useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import { K } from '../../components/Latex';

// ── Generate correlated 3D data ──
function generateData(n = 120, seed = 42) {
  // Simple seeded random
  let s = seed;
  const rand = () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };
  const randn = () => { const u1 = rand(), u2 = rand(); return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2); };

  const points = [];
  for (let i = 0; i < n; i++) {
    // Correlated: main variance along (2,1,0.5), some along (0,1,1), little along (-1,0,2)
    const t1 = randn() * 2.0;
    const t2 = randn() * 0.8;
    const t3 = randn() * 0.3;
    points.push([
      t1 * 2 + t2 * 0.0 + t3 * (-0.5),
      t1 * 1 + t2 * 1.0 + t3 * 0.0,
      t1 * 0.5 + t2 * 1.0 + t3 * 1.0,
    ]);
  }
  return points;
}

// ── Simple 3x3 SVD (power iteration) ──
function computeSVD(points) {
  const n = points.length;
  // Center
  const mean = [0, 0, 0];
  for (const p of points) { mean[0] += p[0]; mean[1] += p[1]; mean[2] += p[2]; }
  mean[0] /= n; mean[1] /= n; mean[2] /= n;

  const centered = points.map(p => [p[0] - mean[0], p[1] - mean[1], p[2] - mean[2]]);

  // Covariance matrix (3x3)
  const cov = [[0,0,0],[0,0,0],[0,0,0]];
  for (const p of centered) {
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++)
        cov[i][j] += p[i] * p[j] / n;
  }

  // Power iteration for eigenvectors
  function eigenvector(mat, deflated) {
    let v = [1, 1, 1];
    for (let iter = 0; iter < 100; iter++) {
      let m = deflated || mat;
      let nv = [0, 0, 0];
      for (let i = 0; i < 3; i++)
        for (let j = 0; j < 3; j++)
          nv[i] += m[i][j] * v[j];
      const norm = Math.sqrt(nv[0]**2 + nv[1]**2 + nv[2]**2);
      if (norm < 1e-10) return { vector: [1, 0, 0], value: 0 };
      v = [nv[0]/norm, nv[1]/norm, nv[2]/norm];
    }
    // Eigenvalue
    let mv = [0, 0, 0];
    let m = deflated || mat;
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++)
        mv[i] += m[i][j] * v[j];
    const eigenvalue = v[0]*mv[0] + v[1]*mv[1] + v[2]*mv[2];
    return { vector: v, value: eigenvalue };
  }

  function deflate(mat, vec, val) {
    const d = mat.map(r => [...r]);
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++)
        d[i][j] -= val * vec[i] * vec[j];
    return d;
  }

  const e1 = eigenvector(cov);
  const d1 = deflate(cov, e1.vector, e1.value);
  const e2 = eigenvector(cov, d1);
  const d2 = deflate(d1, e2.vector, e2.value);
  const e3 = eigenvector(cov, d2);

  return {
    mean,
    centered,
    eigenvalues: [e1.value, e2.value, e3.value],
    // Principal components (columns of V in SVD)
    pc1: e1.vector,
    pc2: e2.vector,
    pc3: e3.vector,
    singularValues: [Math.sqrt(e1.value * n), Math.sqrt(e2.value * n), Math.sqrt(e3.value * n)],
  };
}

// ── Circle sprite texture for round points ──
let _circleTexture = null;
function getCircleTexture() {
  if (_circleTexture) return _circleTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.beginPath();
  ctx.arc(32, 32, 30, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  _circleTexture = new THREE.CanvasTexture(canvas);
  return _circleTexture;
}

// ── 3D Point Cloud (round dots) ──
function DataPoints({ points, color = '#da7756', size = 0.14, opacity = 0.7 }) {
  const tex = useMemo(() => getCircleTexture(), []);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(points.length * 3);
    for (let i = 0; i < points.length; i++) {
      pos[i * 3] = points[i][0];
      pos[i * 3 + 1] = points[i][1];
      pos[i * 3 + 2] = points[i][2];
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, [points]);

  return (
    <points geometry={geo}>
      <pointsMaterial
        color={color}
        size={size}
        transparent
        opacity={opacity}
        sizeAttenuation
        map={tex}
        alphaMap={tex}
        alphaTest={0.1}
        depthWrite={false}
      />
    </points>
  );
}

// ── Axis Arrow ──
function AxisArrow({ from, to, color, label, thickness = 2 }) {
  // Offset label slightly beyond the arrow tip
  const dir = [to[0] - from[0], to[1] - from[1], to[2] - from[2]];
  const len = Math.sqrt(dir[0]**2 + dir[1]**2 + dir[2]**2) || 1;
  const labelPos = [to[0] + dir[0]/len*0.3, to[1] + dir[1]/len*0.3 + 0.15, to[2] + dir[2]/len*0.3];

  return (
    <group>
      <Line points={[from, to]} color={color} lineWidth={thickness} />
      <mesh position={to}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {label && (
        <Html position={labelPos} center distanceFactor={6} style={{ pointerEvents: 'none' }}>
          <span className="text-[10px] font-bold whitespace-nowrap select-none px-1 rounded"
            style={{ color, backgroundColor: 'rgba(250,249,245,0.9)' }}>
            {label}
          </span>
        </Html>
      )}
    </group>
  );
}

// ── Projected shadow points on a plane ──
function ProjectedPoints({ points, pc1, pc2, mean, color = '#c0392b' }) {
  const projected = useMemo(() => {
    return points.map(p => {
      const d = [p[0] - mean[0], p[1] - mean[1], p[2] - mean[2]];
      const c1 = d[0]*pc1[0] + d[1]*pc1[1] + d[2]*pc1[2];
      const c2 = d[0]*pc2[0] + d[1]*pc2[1] + d[2]*pc2[2];
      return [
        mean[0] + c1*pc1[0] + c2*pc2[0],
        mean[1] + c1*pc1[1] + c2*pc2[1],
        mean[2] + c1*pc1[2] + c2*pc2[2],
      ];
    });
  }, [points, pc1, pc2, mean]);

  return <DataPoints points={projected} color={color} size={0.1} opacity={0.4} />;
}

// ── Projection lines from original to projected ──
function ProjectionLines({ points, pc1, pc2, mean }) {
  const lines = useMemo(() => {
    return points.map(p => {
      const d = [p[0] - mean[0], p[1] - mean[1], p[2] - mean[2]];
      const c1 = d[0]*pc1[0] + d[1]*pc1[1] + d[2]*pc1[2];
      const c2 = d[0]*pc2[0] + d[1]*pc2[1] + d[2]*pc2[2];
      const proj = [
        mean[0] + c1*pc1[0] + c2*pc2[0],
        mean[1] + c1*pc1[1] + c2*pc2[1],
        mean[2] + c1*pc1[2] + c2*pc2[2],
      ];
      return [p, proj];
    });
  }, [points, pc1, pc2, mean]);

  return lines.map((l, i) => (
    <Line key={i} points={l} color="#c0392b" lineWidth={1.5} transparent opacity={0.35} />
  ));
}

// ── PCA Plane ──
function PCAPlane({ pc1, pc2, mean, size = 4 }) {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const s = size;
    const corners = [
      [-s, -s], [s, -s], [s, s], [-s, s],
    ].map(([a, b]) => [
      mean[0] + a * pc1[0] + b * pc2[0],
      mean[1] + a * pc1[1] + b * pc2[1],
      mean[2] + a * pc1[2] + b * pc2[2],
    ]);
    const pos = new Float32Array([
      ...corners[0], ...corners[1], ...corners[2],
      ...corners[0], ...corners[2], ...corners[3],
    ]);
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.computeVertexNormals();
    return g;
  }, [pc1, pc2, mean, size]);

  return (
    <mesh geometry={geo}>
      <meshBasicMaterial color="#6a9bcc" transparent opacity={0.08} side={THREE.DoubleSide} />
    </mesh>
  );
}

// ── Scene ──
function Scene({ step }) {
  const data = useMemo(() => generateData(120), []);
  const svd = useMemo(() => computeSVD(data), [data]);

  const { mean, pc1, pc2, pc3, singularValues } = svd;
  const scale = 2;

  // PC arrows scaled by singular values (normalized for display)
  const maxSV = Math.max(...singularValues);
  const sv1 = (singularValues[0] / maxSV) * scale;
  const sv2 = (singularValues[1] / maxSV) * scale;
  const sv3 = (singularValues[2] / maxSV) * scale;

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={0.6} />

      {/* Original data */}
      <DataPoints points={data} color="#da7756" />

      {/* Mean point */}
      <mesh position={mean}>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshStandardMaterial color="#6a9bcc" />
      </mesh>

      {/* Step 1+: Show PC1 */}
      {step >= 1 && (
        <AxisArrow
          from={mean}
          to={[mean[0] + pc1[0]*sv1, mean[1] + pc1[1]*sv1, mean[2] + pc1[2]*sv1]}
          color="#c0392b"
          label={`PC1 (σ₁=${singularValues[0].toFixed(1)})`}
          thickness={3}
        />
      )}

      {/* Step 2+: Show PC2 */}
      {step >= 2 && (
        <>
          <AxisArrow
            from={mean}
            to={[mean[0] + pc2[0]*sv2, mean[1] + pc2[1]*sv2, mean[2] + pc2[2]*sv2]}
            color="#588157"
            label={`PC2 (σ₂=${singularValues[1].toFixed(1)})`}
            thickness={3}
          />
          <PCAPlane pc1={pc1} pc2={pc2} mean={mean} />
        </>
      )}

      {/* Step 3+: Show PC3 */}
      {step >= 3 && (
        <AxisArrow
          from={mean}
          to={[mean[0] + pc3[0]*sv3, mean[1] + pc3[1]*sv3, mean[2] + pc3[2]*sv3]}
          color="#6a9bcc"
          label={`PC3 (σ₃=${singularValues[2].toFixed(1)})`}
          thickness={2}
        />
      )}

      {/* Step 4: Show projection onto PC1-PC2 plane */}
      {step >= 4 && (
        <>
          <ProjectionLines points={data} pc1={pc1} pc2={pc2} mean={mean} />
          <ProjectedPoints points={data} pc1={pc1} pc2={pc2} mean={mean} />
        </>
      )}

      {/* Grid axes */}
      <Line points={[[-5, 0, 0], [5, 0, 0]]} color="#ddd" lineWidth={0.5} />
      <Line points={[[0, -5, 0], [0, 5, 0]]} color="#ddd" lineWidth={0.5} />
      <Line points={[[0, 0, -5], [0, 0, 5]]} color="#ddd" lineWidth={0.5} />

      <OrbitControls enablePan={false} minDistance={5} maxDistance={15} autoRotate autoRotateSpeed={0.5} />
    </>
  );
}

// ── Ease in-out function ──
function easeInOut(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ── Compute all 4 states of the cloud ──
function computeAllStates(centered, pc1, pc2, pc3, singularValues) {
  const V = [pc1, pc2, pc3];

  const step0 = centered;

  const step1 = centered.map(p => [
    p[0]*V[0][0] + p[1]*V[0][1] + p[2]*V[0][2],
    p[0]*V[1][0] + p[1]*V[1][1] + p[2]*V[1][2],
    p[0]*V[2][0] + p[1]*V[2][1] + p[2]*V[2][2],
  ]);

  const maxSV = Math.max(...singularValues);
  const step2 = step1.map(p => [
    p[0] * (maxSV / singularValues[0]) * 0.5,
    p[1] * (maxSV / singularValues[1]) * 0.5,
    p[2] * (maxSV / singularValues[2]) * 0.5,
  ]);

  const angle = Math.PI / 4;
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const step3 = step2.map(p => [
    p[0] * cos - p[2] * sin,
    p[1],
    p[0] * sin + p[2] * cos,
  ]);

  return [step0, step1, step2, step3];
}

// ── Animated point cloud that lerps between states ──
function AnimatedPoints({ states, targetStep, color }) {
  const pointsRef = useRef();
  const prevStepRef = useRef(0);
  const progressRef = useRef(1); // 1 = animation done
  const fromState = useRef(0);
  const n = states[0].length;

  // Detect step change
  useEffect(() => {
    if (targetStep !== prevStepRef.current) {
      fromState.current = prevStepRef.current;
      prevStepRef.current = targetStep;
      progressRef.current = 0;
    }
  }, [targetStep]);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    const positions = pointsRef.current.geometry.attributes.position;

    if (progressRef.current < 1) {
      progressRef.current = Math.min(1, progressRef.current + delta * 1.2); // ~0.8s duration
      const t = easeInOut(progressRef.current);
      const from = states[fromState.current];
      const to = states[targetStep];

      for (let i = 0; i < n; i++) {
        positions.array[i * 3]     = from[i][0] + (to[i][0] - from[i][0]) * t;
        positions.array[i * 3 + 1] = from[i][1] + (to[i][1] - from[i][1]) * t;
        positions.array[i * 3 + 2] = from[i][2] + (to[i][2] - from[i][2]) * t;
      }
      positions.needsUpdate = true;
    }
  });

  // Initial positions
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = states[0][i][0];
      pos[i * 3 + 1] = states[0][i][1];
      pos[i * 3 + 2] = states[0][i][2];
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, [states, n]);

  const tex = useMemo(() => getCircleTexture(), []);

  return (
    <points ref={pointsRef} geometry={geo}>
      <pointsMaterial
        color={color}
        size={0.14}
        transparent
        opacity={0.7}
        sizeAttenuation
        map={tex}
        alphaMap={tex}
        alphaTest={0.1}
        depthWrite={false}
      />
    </points>
  );
}

// ── Transform scene: V^T → Σ → U with animation ──
function TransformScene({ transformStep, svd }) {
  const { centered, pc1, pc2, pc3, singularValues } = svd;

  const states = useMemo(
    () => computeAllStates(centered, pc1, pc2, pc3, singularValues),
    [centered, pc1, pc2, pc3, singularValues]
  );

  const colors = ['#da7756', '#588157', '#6a9bcc', '#c0392b'];

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={0.6} />

      <AnimatedPoints states={states} targetStep={transformStep} color={colors[transformStep]} />

      {/* Coordinate axes */}
      <Line points={[[-4, 0, 0], [4, 0, 0]]} color="#ccc" lineWidth={1} />
      <Line points={[[0, -4, 0], [0, 4, 0]]} color="#ccc" lineWidth={1} />
      <Line points={[[0, 0, -4], [0, 0, 4]]} color="#ccc" lineWidth={1} />

      {transformStep >= 1 && (
        <>
          <Html position={[4.3, 0, 0]} center distanceFactor={6} style={{ pointerEvents: 'none' }}>
            <span className="text-[9px] font-bold text-coral select-none">PC1</span>
          </Html>
          <Html position={[0, 4.3, 0]} center distanceFactor={6} style={{ pointerEvents: 'none' }}>
            <span className="text-[9px] font-bold text-green select-none">PC2</span>
          </Html>
          <Html position={[0, 0, 4.3]} center distanceFactor={6} style={{ pointerEvents: 'none' }}>
            <span className="text-[9px] font-bold text-[#6a9bcc] select-none">PC3</span>
          </Html>
        </>
      )}

      <OrbitControls enablePan={false} minDistance={5} maxDistance={15} autoRotate autoRotateSpeed={0.5} />
    </>
  );
}

const TRANSFORM_STEPS = [
  {
    title: 'Исходное (центрированное)',
    text: 'Данные после вычитания среднего. Облако вытянуто — корреляция между осями.',
    formula: 'X_{centered}',
  },
  {
    title: 'После V^T (первый поворот)',
    text: 'Умножили на V^T — повернули облако так, что оно выровнялось вдоль осей PC1, PC2, PC3. Корреляция исчезла! Но масштаб осей пока разный.',
    formula: 'V^T \\cdot X',
  },
  {
    title: 'После Σ (масштабирование)',
    text: 'Поделили каждую ось на её сингулярное значение σᵢ. Теперь облако «круглое» — одинаковый разброс по всем осям. Видно, что PC3 (бывший маленький) растянулся, а PC1 (бывший большой) сжался.',
    formula: '\\Sigma^{-1} \\cdot V^T \\cdot X',
  },
  {
    title: 'После U (второй поворот)',
    text: 'Умножили на U — ещё один поворот. Форма облака не изменилась (U ортогональна), только ориентация. Это финальный результат: A = UΣV^T.',
    formula: 'U \\cdot \\Sigma^{-1} \\cdot V^T \\cdot X',
  },
];

// ── Steps config ──
const STEPS = [
  {
    title: 'Облако данных',
    text: 'Вот 120 точек в 3D. Данные коррелированы — облако вытянуто в определённом направлении. Задача SVD/PCA — найти эти направления.',
  },
  {
    title: 'PC1 — главная компонента',
    text: 'Красная стрелка — первая главная компонента (PC1). Это направление максимальной дисперсии данных. Длина пропорциональна сингулярному значению σ₁ — чем длиннее, тем больше данных «объясняет» эта ось.',
  },
  {
    title: 'PC2 — вторая компонента',
    text: 'Зелёная стрелка — PC2. Перпендикулярна PC1 (ортогональна). Голубая плоскость — это плоскость PC1×PC2. Вместе они объясняют основную массу дисперсии.',
  },
  {
    title: 'PC3 — третья компонента',
    text: 'Синяя стрелка — PC3. Перпендикулярна обеим предыдущим. Она самая короткая — σ₃ маленькое, то есть в этом направлении данные почти не варьируются. Это «шум».',
  },
  {
    title: 'Проекция: PCA = отбросить PC3',
    text: 'PCA = проецируем все точки на плоскость PC1×PC2 (отбрасываем PC3). Серые линии — проекции. Красные тени — спроецированные точки. Потеряли мало информации, но снизили размерность с 3D до 2D.',
  },
];

// ── Page: Theory ──
function TheoryPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-accent">SVD и PCA: основа и формулы</h2>

      <div className="bg-card rounded-xl p-5 border border-border space-y-3">
        <h3 className="text-lg font-semibold">Что это</h3>
        <p className="text-text-dim text-sm leading-relaxed">
          <strong>SVD</strong> (Singular Value Decomposition) раскладывает любую матрицу данных на три части:
        </p>
        <div className="bg-bg/50 rounded-lg p-3 text-center">
          <K m="A = U \Sigma V^T" d />
        </div>
        <p className="text-text-dim text-sm leading-relaxed">
          <strong>PCA</strong> (Principal Component Analysis) — это применение SVD для нахождения
          главных направлений вариации данных. Столбцы <K m="V" /> — это главные компоненты,
          а <K m="\sigma_i" /> на диагонали <K m="\Sigma" /> — сингулярные значения,
          показывающие «важность» каждого направления.
        </p>
      </div>

      <div className="bg-card rounded-xl p-5 border border-border space-y-4">
        <h3 className="text-lg font-semibold">Геометрический смысл: поворот → масштаб → поворот</h3>
        <p className="text-text-dim text-sm leading-relaxed">
          SVD говорит: <em>любое</em> линейное преобразование можно разбить на три простых шага:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="w-24 h-24 rounded-full bg-coral/10 border-2 border-coral/40 flex items-center justify-center">
              <K m="V^T" d />
            </div>
            <p className="text-coral font-bold text-sm">1. Поворот</p>
            <p className="text-text-dim text-xs leading-relaxed max-w-48">
              Повернуть координаты так, чтобы данные выровнялись вдоль осей.
            </p>
          </div>
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="w-24 h-24 rounded-full bg-green/10 border-2 border-green/40 flex items-center justify-center">
              <K m="\Sigma" d />
            </div>
            <p className="text-green font-bold text-sm">2. Масштаб</p>
            <p className="text-text-dim text-xs leading-relaxed max-w-48">
              Растянуть/сжать по каждой оси. <K m="\sigma_1" /> — много, <K m="\sigma_3" /> — мало.
            </p>
          </div>
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="w-24 h-24 rounded-full bg-[#6a9bcc]/10 border-2 border-[#6a9bcc]/40 flex items-center justify-center">
              <K m="U" d />
            </div>
            <p className="text-[#6a9bcc] font-bold text-sm">3. Поворот</p>
            <p className="text-text-dim text-xs leading-relaxed max-w-48">
              Повернуть результат в выходное пространство.
            </p>
          </div>
        </div>
        <div className="bg-bg/50 rounded-lg p-4 text-center space-y-3">
          <K m="A = U \cdot \Sigma \cdot V^T" d />
          <div className="flex justify-center gap-6 flex-wrap text-xs">
            <span><K m="V^T" /> — <span className="text-coral">поворот 1</span></span>
            <span><K m="\Sigma" /> — <span className="text-green">масштаб</span></span>
            <span><K m="U" /> — <span className="text-[#6a9bcc]">поворот 2</span></span>
          </div>
          <p className="text-text-dim text-xs">
            Любая матрица = поворот + масштабирование по осям + ещё один поворот.
          </p>
        </div>
      </div>

      <div className="bg-card rounded-xl p-5 border border-border space-y-4">
        <h3 className="text-lg font-semibold">Как SVD связан с PCA</h3>
        <div className="overflow-x-auto">
          <table className="text-sm w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="p-2 text-left text-text-dim">SVD</th>
                <th className="p-2 text-left text-text-dim">PCA смысл</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/30">
                <td className="p-2"><K m="V" /> (правые сингулярные векторы)</td>
                <td className="p-2 text-text-dim">Главные компоненты (направления)</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="p-2"><K m="\Sigma" /> (сингулярные значения)</td>
                <td className="p-2 text-text-dim">«Важность» каждого направления</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="p-2"><K m="U\Sigma" /></td>
                <td className="p-2 text-text-dim">Координаты точек в новом базисе</td>
              </tr>
              <tr>
                <td className="p-2">Отбросить малые <K m="\sigma_i" /></td>
                <td className="p-2 text-text-dim">Снижение размерности</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Page: PCA 3D ──
function PCA3DPage() {
  const [step, setStep] = useState(0);
  const data = useMemo(() => generateData(120), []);
  const svd = useMemo(() => computeSVD(data), [data]);
  const totalVar = svd.eigenvalues.reduce((a, b) => a + b, 0);
  const explainedByPC12 = ((svd.eigenvalues[0] + svd.eigenvalues[1]) / totalVar * 100).toFixed(1);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-accent">PCA: главные компоненты в 3D</h2>

      {/* Step selector */}
      <div className="bg-card rounded-xl p-4 border border-border">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide flex-nowrap">
          {STEPS.map((s, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                step === i ? 'bg-accent text-white' : 'text-text-dim hover:text-text hover:bg-surface'
              }`}
            >
              {i}. {s.title}
            </button>
          ))}
        </div>
      </div>

      {/* 3D Canvas */}
      <div className="bg-card rounded-xl border border-border overflow-hidden" style={{ height: 500 }}>
        <Canvas camera={{ position: [7, 5, 7], fov: 45 }}>
          <Scene step={step} />
        </Canvas>
      </div>

      {/* Step description BELOW viz */}
      <div className="bg-card rounded-xl p-4 border border-border" style={{ minHeight: 80 }}>
        <h3 className="font-semibold text-sm text-accent">{STEPS[step].title}</h3>
        <p className="text-text-dim text-sm mt-1">{STEPS[step].text}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl p-4 border border-border text-center">
          <p className="text-text-dim text-xs">σ₁ (PC1)</p>
          <p className="text-2xl font-mono text-coral">{svd.singularValues[0].toFixed(2)}</p>
          <p className="text-text-dim text-xs">{(svd.eigenvalues[0] / totalVar * 100).toFixed(1)}% дисперсии</p>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border text-center">
          <p className="text-text-dim text-xs">σ₂ (PC2)</p>
          <p className="text-2xl font-mono text-green">{svd.singularValues[1].toFixed(2)}</p>
          <p className="text-text-dim text-xs">{(svd.eigenvalues[1] / totalVar * 100).toFixed(1)}% дисперсии</p>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border text-center">
          <p className="text-text-dim text-xs">σ₃ (PC3)</p>
          <p className="text-2xl font-mono text-[#6a9bcc]">{svd.singularValues[2].toFixed(2)}</p>
          <p className="text-text-dim text-xs">{(svd.eigenvalues[2] / totalVar * 100).toFixed(1)}% дисперсии</p>
        </div>
      </div>

      <div className="bg-accent-light/30 rounded-xl p-5 border border-accent/20">
        <h3 className="text-lg font-semibold">Суть PCA в одном предложении</h3>
        <p className="text-text-dim leading-relaxed mt-2">
          PC1 + PC2 объясняют <strong className="text-accent">{explainedByPC12}%</strong> всей дисперсии.
          Значит, можно отбросить PC3 (оставить 2D вместо 3D) и потерять всего {(100 - parseFloat(explainedByPC12)).toFixed(1)}% информации.
        </p>
      </div>
    </div>
  );
}

// ── Page: Transform animation ──
function TransformPage() {
  const [transformStep, setTransformStep] = useState(0);
  const data = useMemo(() => generateData(120), []);
  const svd = useMemo(() => computeSVD(data), [data]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-accent">Трансформация: V^T → Σ → U</h2>

      <div className="bg-card rounded-xl p-5 border border-border space-y-3">
        <p className="text-text-dim leading-relaxed">
          Смотри, что SVD делает с облаком точек на каждом шаге.
          Нажимай кнопки — облако <strong>плавно</strong> поворачивается, масштабируется, снова поворачивается:
        </p>

        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide flex-nowrap">
          {TRANSFORM_STEPS.map((s, i) => (
            <button
              key={i}
              onClick={() => setTransformStep(i)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                transformStep === i ? 'bg-accent text-white' : 'text-text-dim hover:text-text hover:bg-surface'
              }`}
            >
              {i}. {s.title}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-xl p-4 border border-border flex items-center gap-4 flex-wrap">
        <div className="text-center shrink-0">
          <K m={TRANSFORM_STEPS[transformStep].formula} d />
        </div>
        <p className="text-text-dim text-sm flex-1 min-w-48">
          {TRANSFORM_STEPS[transformStep].text}
        </p>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden" style={{ height: 500 }}>
        <Canvas camera={{ position: [7, 5, 7], fov: 45 }}>
          <TransformScene transformStep={transformStep} svd={svd} />
        </Canvas>
      </div>

      <p className="text-text-dim text-xs text-center">Крути мышкой. Обрати внимание, как меняется форма облака при каждом шаге.</p>
    </div>
  );
}

// ── 3D rotation matrix around arbitrary axis (Rodrigues) ──
function makeRotation3D(ax, ay, az, angle) {
  const len = Math.sqrt(ax*ax + ay*ay + az*az);
  const ux = ax/len, uy = ay/len, uz = az/len;
  const c = Math.cos(angle), s = Math.sin(angle), t = 1-c;
  return [
    [t*ux*ux + c,    t*ux*uy - s*uz, t*ux*uz + s*uy],
    [t*uy*ux + s*uz, t*uy*uy + c,    t*uy*uz - s*ux],
    [t*uz*ux - s*uy, t*uz*uy + s*ux, t*uz*uz + c   ],
  ];
}

function applyRot(R, p) {
  return [
    R[0][0]*p[0] + R[0][1]*p[1] + R[0][2]*p[2],
    R[1][0]*p[0] + R[1][1]*p[1] + R[1][2]*p[2],
    R[2][0]*p[0] + R[2][1]*p[1] + R[2][2]*p[2],
  ];
}

// ── Page: Cube transform (unit cube → A·x) ──
function SquarePage() {
  const [sqStep, setSqStep] = useState(0);

  // Generate unit cube as random point cloud (not a grid)
  const cubePoints = useMemo(() => {
    let seed = 123;
    const rand = () => { seed = (seed * 16807 + 0) % 2147483647; return seed / 2147483647; };
    const pts = [];
    // Random points filling the cube volume
    for (let i = 0; i < 600; i++) {
      pts.push([rand()*2-1, rand()*2-1, rand()*2-1]);
    }
    // Extra points on faces (with small noise) for visible cube shape
    for (let i = 0; i < 200; i++) {
      const a = rand()*2-1, b = rand()*2-1, n = (rand()-0.5)*0.04;
      const face = Math.floor(rand()*6);
      if (face===0) pts.push([-1+n, a, b]);
      else if (face===1) pts.push([1+n, a, b]);
      else if (face===2) pts.push([a, -1+n, b]);
      else if (face===3) pts.push([a, 1+n, b]);
      else if (face===4) pts.push([a, b, -1+n]);
      else pts.push([a, b, 1+n]);
    }
    return pts;
  }, []);

  // V^T: rotation around axis (1,1,1) by 35°
  const rotV = useMemo(() => makeRotation3D(1, 1, 1, Math.PI / 5), []);
  // Σ: scale (2.5, 0.8, 0.3)
  const sigma = [2.2, 0.7, 0.3];
  // U: rotation around axis (0,1,0) by 55°
  const rotU = useMemo(() => makeRotation3D(0, 1, 0.3, Math.PI * 0.31), []);

  const allStates = useMemo(() => {
    const st0 = cubePoints;
    const st1 = st0.map(p => applyRot(rotV, p));
    const st2 = st1.map(([x,y,z]) => [x*sigma[0], y*sigma[1], z*sigma[2]]);
    const st3 = st2.map(p => applyRot(rotU, p));
    return [st0, st1, st2, st3];
  }, [cubePoints, rotV, sigma, rotU]);

  const SQ_STEPS = [
    {
      title: 'Единичный куб',
      text: 'Начинаем с куба [-1,1]³. Точки равномерно заполняют объём + плотные рёбра. Это наши «исходные данные».',
      formula: 'X',
      color: '#da7756',
    },
    {
      title: 'V^T · X (поворот)',
      text: 'Первый поворот — V^T. Куб повернулся в 3D, но форма не изменилась: рёбра равные, углы 90°. Ортогональная матрица сохраняет форму.',
      formula: 'V^T \\cdot X',
      color: '#c0392b',
    },
    {
      title: 'Σ · V^T · X (масштаб)',
      text: 'Σ растянул по одной оси и сжал по двум другим. Куб превратился в параллелепипед — вытянутый «кирпич». σ₁=2.2 растянул, σ₂=0.7 чуть сжал, σ₃=0.3 сильно сплющил.',
      formula: '\\Sigma \\cdot V^T \\cdot X',
      color: '#588157',
    },
    {
      title: 'U · Σ · V^T · X (ещё поворот)',
      text: 'Финальный поворот U — параллелепипед повернулся в новое положение. Форма не изменилась (U ортогональна). Итог: куб → поворот → растяжение → поворот = A·X.',
      formula: 'U \\cdot \\Sigma \\cdot V^T \\cdot X = A \\cdot X',
      color: '#6a9bcc',
    },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-accent">Куб → A·x: SVD по шагам</h2>

      <div className="bg-card rounded-xl p-5 border border-border space-y-3">
        <p className="text-text-dim leading-relaxed">
          Берём <strong>единичный куб</strong> в 3D и применяем
          матрицу <K m="A = U\Sigma V^T" /> по шагам. Видно, как каждая из трёх матриц
          трансформирует фигуру: поворот → растяжение → поворот.
        </p>

        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide flex-nowrap">
          {SQ_STEPS.map((s, i) => (
            <button
              key={i}
              onClick={() => setSqStep(i)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                sqStep === i ? 'bg-accent text-white' : 'text-text-dim hover:text-text hover:bg-surface'
              }`}
            >
              {i}. {s.title}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-xl p-4 border border-border flex items-center gap-4 flex-wrap">
        <div className="text-center shrink-0">
          <K m={SQ_STEPS[sqStep].formula} d />
        </div>
        <p className="text-text-dim text-sm flex-1 min-w-48">
          {SQ_STEPS[sqStep].text}
        </p>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden" style={{ height: 500 }}>
        <Canvas camera={{ position: [0, 0, 6], fov: 45 }} orthographic={false}>
          <SquareScene states={allStates} targetStep={sqStep} color={SQ_STEPS[sqStep].color} />
        </Canvas>
      </div>

      <p className="text-text-dim text-xs text-center">
        Крути мышкой. Обрати внимание: повороты сохраняют форму, масштаб — нет.
      </p>

      <div className="bg-card rounded-xl p-5 border border-border space-y-3">
        <h3 className="text-lg font-semibold">Что видно</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div className="bg-coral/5 rounded-lg p-3 border border-coral/20">
            <p className="text-coral font-bold text-xs mb-1">V^T (поворот)</p>
            <p className="text-text-dim text-xs">Куб повернулся, но остался кубом. Углы 90°, рёбра равны.</p>
          </div>
          <div className="bg-green/5 rounded-lg p-3 border border-green/20">
            <p className="text-green font-bold text-xs mb-1">Σ (масштаб)</p>
            <p className="text-text-dim text-xs">Куб стал параллелепипедом. σ₁ растянул, σ₂ и σ₃ сжали. Единственный шаг, меняющий форму.</p>
          </div>
          <div className="bg-[#6a9bcc]/5 rounded-lg p-3 border border-[#6a9bcc]/20">
            <p className="text-[#6a9bcc] font-bold text-xs mb-1">U (поворот)</p>
            <p className="text-text-dim text-xs">Параллелепипед повернулся. Форма та же, только ориентация другая.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Square animation scene ──
function SquareScene({ states, targetStep, color }) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={0.6} />

      <AnimatedPoints states={states} targetStep={targetStep} color={color} />

      {/* Grid axes */}
      <Line points={[[-4, 0, 0], [4, 0, 0]]} color="#ddd" lineWidth={0.5} />
      <Line points={[[0, -4, 0], [0, 4, 0]]} color="#ddd" lineWidth={0.5} />

      {/* Axis labels */}
      <Html position={[4.2, 0, 0]} center distanceFactor={6} style={{ pointerEvents: 'none' }}>
        <span className="text-[9px] text-text-dim select-none">x</span>
      </Html>
      <Html position={[0, 4.2, 0]} center distanceFactor={6} style={{ pointerEvents: 'none' }}>
        <span className="text-[9px] text-text-dim select-none">y</span>
      </Html>

      {/* Z axis */}
      <Line points={[[0, 0, -4], [0, 0, 4]]} color="#ddd" lineWidth={0.5} />

      <OrbitControls enablePan={false} minDistance={3} maxDistance={12} />
    </>
  );
}

// ── Page: LoRA visualization ──
// ── 2D LoRA matrix visualization (heatmaps with CSS transitions) ──
function MatrixHeatmap({ matrix, rows, cols, maxV, label, color, keptCols, keptRows }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] font-bold" style={{ color: color || '#da7756' }}>{label}</span>
      <div className="grid gap-[1px]" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {Array.from({ length: rows }, (_, i) =>
          Array.from({ length: cols }, (_, j) => {
            const val = matrix?.[i]?.[j] ?? 0;
            const t = val / maxV;
            const kept = (keptCols == null || j < keptCols) && (keptRows == null || i < keptRows);
            const bg = t > 0
              ? `rgba(218, 119, 86, ${Math.abs(t) * 0.9})`
              : `rgba(106, 155, 204, ${Math.abs(t) * 0.9})`;
            return (
              <div
                key={`${i}-${j}`}
                className="transition-all duration-500"
                style={{
                  width: 20, height: 20,
                  backgroundColor: kept ? bg : '#f0efeb',
                  opacity: kept ? 1 : 0.2,
                  borderRadius: 2,
                }}
              />
            );
          })
        )}
      </div>
      <span className="text-[9px] text-text-dim">{rows}×{cols}</span>
    </div>
  );
}

function LoRA2DViz({ matrixData, step, rank }) {
  const { W, singularValues, n, U, V } = matrixData;

  const maxVal = useMemo(() => {
    let m = 0;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) m = Math.max(m, Math.abs(W[i][j]));
    return m;
  }, [W, n]);

  const maxSV = singularValues[0];

  // Precompute all matrices as n×n (pad with 0 for consistency)
  const matrices = useMemo(() => {
    const uM = Array.from({length:n},(_,i)=>[...U[i]]);
    const vtM = Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>V[j][i]));
    const sigM = Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>i===j?singularValues[i]:0));
    // A = U·√Σ (always n×n, unused cols are 0)
    const aM = (r) => Array.from({length:n},(_,i)=>Array.from({length:n},(_,k)=>
      k < r ? U[i][k]*Math.sqrt(singularValues[k]) : 0));
    // B = √Σ·V^T (always n×n, unused rows are 0)
    const bM = (r) => Array.from({length:n},(_,k)=>Array.from({length:n},(_,j)=>
      k < r ? V[j][k]*Math.sqrt(singularValues[k]) : 0));
    // Wapprox
    const wA = (r) => {
      const res = Array.from({length:n},()=>Array(n).fill(0));
      for(let i=0;i<n;i++) for(let j=0;j<n;j++) for(let k=0;k<r;k++) res[i][j]+=U[i][k]*singularValues[k]*V[j][k];
      return res;
    };
    return { uM, vtM, sigM, aM, bM, wA };
  }, [U, V, singularValues, n]);

  const aMatrix = matrices.aM(rank);
  const bMatrix = matrices.bM(rank);
  const Wapprox = matrices.wA(rank);

  const cs = 20; // cell size
  const g = 1;   // gap

  // Each cell's value and color depends on step
  // Grid: fixed 5 blocks of n×n, always rendered
  // [W] [=] [Left n×n] [×] [Right n×n] [=] [Result n×n]

  // What matrix goes in each slot + what cols/rows are "active"
  const leftMatrix = step <= 1 ? matrices.uM : aMatrix;
  const leftLabel = step === 0 ? '' : step === 1 ? 'U' : (step === 2 ? 'A = U·√Σ' : `A`);
  const leftColor = '#c0392b';
  const leftKeptCols = step <= 1 ? n : rank;

  const rightMatrix = step <= 1 ? matrices.vtM : bMatrix;
  const rightLabel = step === 0 ? '' : step === 1 ? 'V^T' : (step === 2 ? 'B = √Σ·V^T' : `B`);
  const rightColor = step === 1 ? '#6a9bcc' : '#588157';
  const rightKeptRows = step <= 1 ? n : rank;

  const resultMatrix = step <= 1 ? W : Wapprox;
  const resultLabel = step <= 1 ? '' : `A·B${rank < n ? ` (ранг ${rank})` : ''}`;

  const showDecomp = step >= 1;

  function cellBg(val, maxV, active) {
    if (!active) return '#f0efeb';
    const t = val / maxV;
    return t > 0
      ? `rgba(192, 63, 60, ${Math.min(Math.abs(t)*0.85+0.1, 0.95)})`
      : `rgba(106, 155, 204, ${Math.min(Math.abs(t)*0.85+0.1, 0.95)})`;
  }

  function Grid({ matrix, maxV, keptCols = n, keptRows = n, tintColor }) {
    return (
      <div className="grid" style={{ gridTemplateColumns: `repeat(${n}, ${cs}px)`, gap: g }}>
        {Array.from({length:n},(_, i) =>
          Array.from({length:n},(_, j) => {
            const val = matrix[i]?.[j] ?? 0;
            const active = j < keptCols && i < keptRows;
            const bg = tintColor && active
              ? `rgba(${tintColor}, ${Math.min(Math.abs(val / maxV)*0.85+0.1, 0.95)})`
              : cellBg(val, maxV, active);
            return (
              <div key={`${i}-${j}`} style={{
                width: cs, height: cs, backgroundColor: bg,
                opacity: active ? 1 : 0.12,
                borderRadius: 2,
                transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
              }} />
            );
          })
        )}
      </div>
    );
  }

  // Grid layout: 9 columns
  // Step 0:  [W] [.] [.] [.] [.] [.] [.] [.] [.]  — W centered (col 1)
  // Step 1:  [W] [=] [U] [×] [Σ] [×] [V^T] [.] [.]  — full SVD
  // Step 2+: [W] [=] [A] [×] [B] [.] [.] [=] [A·B]  — A,B on slots 3,5; result on 9
  //
  // To avoid jumps: use absolute positioning within a fixed container

  function Slot({ children, visible = true }) {
    return (
      <div className="flex flex-col items-center gap-1" style={{
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.6s',
        pointerEvents: visible ? 'auto' : 'none',
      }}>
        {children}
      </div>
    );
  }

  function Sign({ text, visible = true }) {
    return (
      <span className="text-xl text-text-dim self-center" style={{
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.5s',
        minWidth: 16, textAlign: 'center',
      }}>{text}</span>
    );
  }

  // Step 1: slots are W = U × Σ × V^T (5 matrices, 4 signs = 9 items)
  // Step 2+: slots are W = A × B = A·B  (4 matrices, 3 signs, but position A at slot 3, B at slot 5)
  // We render ALL 9 slots always. Content changes, opacity animates.

  const slot3Matrix = step <= 1 ? matrices.uM : leftMatrix;
  const slot3MaxV = step <= 1 ? 1.5 : 3;
  const slot3Label = step <= 1 ? 'U' : leftLabel;
  const slot3Color = '#c0392b';
  const slot3KeptCols = step <= 1 ? n : leftKeptCols;

  const slot5Matrix = step <= 1 ? matrices.sigM : rightMatrix;
  const slot5MaxV = step <= 1 ? maxSV : 3;
  const slot5Label = step <= 1 ? 'Σ' : rightLabel;
  const slot5Color = step <= 1 ? '#da7756' : rightColor;
  const slot5KeptRows = step <= 1 ? n : rightKeptRows;
  const slot5KeptCols = step <= 1 ? n : n;

  return (
    <div className="bg-card rounded-xl p-5 border border-border overflow-x-auto">
      <div className="flex items-center justify-center min-w-fit" style={{ gap: 10 }}>

        {/* Slot 1: W (always) */}
        <Slot>
          <span className="text-[10px] font-bold text-text-dim">{step === 0 ? 'W' : 'W ориг.'}</span>
          <Grid matrix={W} maxV={maxVal} />
          <span className="text-[9px] text-text-dim">{n}×{n}</span>
        </Slot>

        {/* Slot 2: = */}
        <Sign text="=" visible={showDecomp} />

        {/* Slot 3: U (step 1) or A (step 2+) */}
        <Slot visible={showDecomp}>
          <span className="text-[10px] font-bold" style={{ color: slot3Color, transition: 'color 0.5s' }}>{slot3Label}</span>
          <Grid matrix={slot3Matrix} maxV={slot3MaxV} keptCols={slot3KeptCols} tintColor="192, 63, 60" />
          <span className="text-[9px] text-text-dim">{n}×{slot3KeptCols}</span>
        </Slot>

        {/* Slot 4: × */}
        <Sign text="×" visible={showDecomp} />

        {/* Slot 5: Σ (step 1) or B (step 2+) */}
        <Slot visible={showDecomp}>
          <span className="text-[10px] font-bold" style={{ color: slot5Color, transition: 'color 0.5s' }}>{slot5Label}</span>
          <Grid matrix={slot5Matrix} maxV={slot5MaxV} keptRows={slot5KeptRows} keptCols={slot5KeptCols}
            tintColor={step <= 1 ? '218, 119, 86' : '88, 129, 87'} />
          <span className="text-[9px] text-text-dim">{step <= 1 ? n : slot5KeptRows}×{n}</span>
        </Slot>

        {/* Slot 6: × (step 1) or = (step 2+) */}
        <Sign text={step <= 1 ? '×' : '='} visible={step >= 1} />

        {/* Slot 7: V^T (step 1) or A·B result (step 2+) */}
        <Slot visible={step >= 1}>
          {step <= 1 ? (
            <>
              <span className="text-[10px] font-bold text-[#6a9bcc]">V^T</span>
              <Grid matrix={matrices.vtM} maxV={1.5} tintColor="106, 155, 204" />
              <span className="text-[9px] text-text-dim">{n}×{n}</span>
            </>
          ) : (
            <>
              <span className="text-[10px] font-bold text-accent">{resultLabel}</span>
              <Grid matrix={resultMatrix} maxV={maxVal} />
              <span className="text-[9px] text-text-dim">{n}×{n}</span>
            </>
          )}
        </Slot>

      </div>

      {/* Color legend */}
      <div className="mt-4 flex items-start gap-4 flex-wrap text-xs text-text-dim">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: 'rgba(192, 63, 60, 0.7)' }} />
          <span>положительное значение</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: 'rgba(106, 155, 204, 0.7)' }} />
          <span>отрицательное значение</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: '#f0efeb' }} />
          <span>отброшено (ранг снижен)</span>
        </div>
      </div>
      <p className="mt-2 text-xs text-text-dim leading-relaxed">
        Каждая клетка — вес связи между нейронами. Яркость = абсолютное значение.
        {step >= 2 && ' При склеивании U·√Σ → A и √Σ·V^T → B цвета «смешиваются»: каждая клетка A·B — это сумма произведений столбца A на строку B. Три матрицы (U, Σ, V^T) сливаются в две (A, B), но результат A·B воспроизводит оригинал W.'}
        {step >= 3 && ` При снижении ранга до ${rank} отбрасываем столбцы A и строки B с маленькими σ — клетки гаснут. Оставшиеся ${rank} столбец(ов) × ${rank} строк(а) всё ещё дают близкое приближение к W.`}
      </p>
    </div>
  );
}

// ── Animated bar that lerps height ──
function AnimBar({ position, targetHeight, width = 0.8, depth = 0.8, color, opacity = 0.85 }) {
  const meshRef = useRef();
  const currentH = useRef(targetHeight);

  useFrame((_, dt) => {
    const h = currentH.current;
    const diff = targetHeight - h;
    if (Math.abs(diff) > 0.001) {
      currentH.current += diff * Math.min(1, dt * 4);
      const nh = currentH.current;
      meshRef.current.scale.y = Math.max(nh, 0.01);
      meshRef.current.position.y = nh / 2;
    }
  });

  return (
    <mesh ref={meshRef} position={[position[0], targetHeight / 2, position[2]]}>
      <boxGeometry args={[width, 1, depth]} />
      <meshStandardMaterial color={color} transparent opacity={opacity} />
    </mesh>
  );
}

function LoRAPage() {
  const [loraStep, setLoraStep] = useState(0);

  const matrixData = useMemo(() => {
    let seed = 77;
    const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

    const singularValues = [5.0, 3.5, 2.8, 1.5, 0.4, 0.15, 0.08, 0.03];
    const n = 8;

    // Generate random orthogonal matrices via Gram-Schmidt
    function randomOrtho() {
      const vecs = [];
      for (let i = 0; i < n; i++) {
        let v = Array.from({ length: n }, () => rand() - 0.5);
        for (const u of vecs) {
          const dot = v.reduce((s, vi, k) => s + vi * u[k], 0);
          v = v.map((vi, k) => vi - dot * u[k]);
        }
        const norm = Math.sqrt(v.reduce((s, vi) => s + vi * vi, 0));
        vecs.push(v.map(vi => vi / norm));
      }
      return vecs;
    }

    const U = randomOrtho();
    const V = randomOrtho();

    // W = U * diag(σ) * V^T
    const W = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) =>
        U[i].reduce((s, uik, k) => s + uik * singularValues[k] * V[j][k], 0)
      )
    );

    return { W, U, V, singularValues, n };
  }, []);

  const LORA_STEPS = [
    {
      title: 'W — полная матрица',
      desc: 'Матрица весов слоя. 64 параметра. В LLM таких матриц тысячи, каждая 4096×4096.',
    },
    {
      title: 'W = U · Σ · V^T',
      desc: 'SVD-разложение. Σ — диагональная: σ₁=5.0, σ₂=3.5, σ₃=2.8 большие, остальные мизерные. Большая часть информации в 3 направлениях.',
    },
    {
      title: 'Склеиваем: A = U·√Σ, B = √Σ·V^T',
      desc: 'Σ — просто числа на диагонали. Впитываем их: домножаем столбцы U на √σᵢ → получаем A. Домножаем строки V^T на √σᵢ → получаем B. Три матрицы → две. A·B = U·Σ·V^T = W.',
    },
    {
      title: 'Отрезаем: ранг 3 → A(8×3) · B(3×8)',
      desc: 'Берём только 3 столбца A и 3 строки B (соответствующие большим σ). 48 параметров вместо 64. Для 4096×4096: 24K вместо 16M.',
    },
    {
      title: 'Максимум: ранг 1 → A(8×1) · B(1×8)',
      desc: 'Один столбец × одна строка. 16 параметров. Для 4096×4096: 8K вместо 16M = экономия 2000×. Потеря точности, но для fine-tuning хватает.',
    },
  ];

  const ranks = [8, 8, 8, 3, 1];
  const currentRank = ranks[loraStep];
  const { n } = matrixData;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-accent">LoRA: от SVD к двум матрицам</h2>

      <div className="bg-card rounded-xl p-5 border border-border space-y-3">
        <p className="text-text-dim leading-relaxed">
          Как три матрицы SVD превращаются в две матрицы LoRA?
          Переключай шаги — смотри, как <K m="U \cdot \Sigma \cdot V^T" /> склеивается в <K m="A \cdot B" />,
          а потом ранг снижается.
        </p>
      </div>

      <div className="bg-card rounded-xl p-4 border border-border">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide flex-nowrap">
          {LORA_STEPS.map((s, i) => (
            <button key={i} onClick={() => setLoraStep(i)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                loraStep === i ? 'bg-accent text-white' : 'text-text-dim hover:text-text hover:bg-surface'
              }`}
            >{i}. {s.title}</button>
          ))}
        </div>
      </div>

      <LoRA2DViz matrixData={matrixData} step={loraStep} rank={currentRank} />

      <div className="bg-card rounded-xl p-4 border border-border" style={{ minHeight: 80 }}>
        <h3 className="font-semibold text-sm text-accent mb-1">{LORA_STEPS[loraStep].title}</h3>
        <p className="text-text-dim text-sm">{LORA_STEPS[loraStep].desc}</p>
      </div>

      {/* SV chart */}
      <div className="bg-card rounded-xl p-5 border border-border space-y-3">
        <h3 className="text-lg font-semibold">Сингулярные значения</h3>
        <div className="flex items-end gap-2" style={{ height: 128 }}>
          {matrixData.singularValues.map((sv, i) => {
            const maxSV = matrixData.singularValues[0];
            const kept = i < currentRank;
            const barH = Math.round((sv / maxSV) * 100);
            return (
              <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
                <span className="text-[10px] font-mono text-text-dim">{sv.toFixed(1)}</span>
                <div className="w-full rounded-t-sm transition-all duration-500"
                  style={{ height: barH, backgroundColor: kept ? '#da7756' : '#d4d0c8', opacity: kept ? 1 : 0.3 }} />
                <span className={`text-[10px] ${kept ? 'text-accent font-bold' : 'text-text-dim'}`}>σ{i+1}</span>
              </div>
            );
          })}
        </div>
        <p className="text-text-dim text-xs text-center">
          Ранг {currentRank}: сохраняем {currentRank} из {n} сингулярных значений.
          {currentRank < n && ` Параметров: ${n}×${currentRank} + ${currentRank}×${n} = ${n*currentRank*2} вместо ${n**2}.`}
        </p>
        <div className="bg-bg/50 rounded-lg p-3 mt-2">
          <p className="text-text-dim text-xs leading-relaxed">
            <span className="text-accent font-semibold">Сингулярные значения (σ)</span> — это числа, которые показывают,
            сколько «информации» несёт каждое направление в матрице. Большое σ = важное направление (много данных вдоль него).
            Маленькое σ = шум, можно выбросить. В LoRA мы оставляем только направления с большими σ —
            поэтому A и B маленькие, но результат A·B близок к оригиналу W.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── LoRA 3D Scene — animated transitions ──
function LoRAScene({ matrixData, step, rank }) {
  const { W, singularValues, n, U, V } = matrixData;

  const maxVal = useMemo(() => {
    let m = 0;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) m = Math.max(m, Math.abs(W[i][j]));
    return m;
  }, [W, n]);

  const valColor = (val, maxV) => {
    const t = val / maxV;
    return t > 0
      ? `rgb(${Math.round(218-t*80)},${Math.round(119+t*60)},${Math.round(86+t*40)})`
      : `rgb(${Math.round(106+Math.abs(t)*60)},${Math.round(155-Math.abs(t)*80)},${Math.round(204-Math.abs(t)*40)})`;
  };

  function AnimGroup({ targetPos, children }) {
    const ref = useRef();
    useFrame((_, dt) => {
      if (!ref.current) return;
      const s = Math.min(1, dt * 3.5);
      ref.current.position.x += (targetPos[0] - ref.current.position.x) * s;
      ref.current.position.y += (targetPos[1] - ref.current.position.y) * s;
      ref.current.position.z += (targetPos[2] - ref.current.position.z) * s;
    });
    return <group ref={ref} position={targetPos}>{children}</group>;
  }

  function Block({ matrix, maxV, color, rows, cols, colSp = 1 }) {
    return Array.from({ length: rows }, (_, i) =>
      Array.from({ length: cols }, (_, j) => {
        const val = matrix[i]?.[j] ?? 0;
        const h = Math.abs(val) / maxV * 2 + 0.05;
        const c = typeof color === 'string' ? color : valColor(val, maxV);
        return <AnimBar key={`${i}-${j}`} position={[j*colSp, 0, i]} targetHeight={h} color={c} />;
      })
    );
  }

  const gap = 3;
  const half = n / 2 - 0.5;
  const maxSV = singularValues[0];
  const origX = -(n + gap + half + 2);

  const uMatrix = useMemo(() => Array.from({length:n},(_,i)=>[...U[i]]), [U,n]);
  const vtMatrix = useMemo(() => Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>V[j][i])), [V,n]);
  const sigmaMatrix = useMemo(() => Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>i===j?singularValues[i]:0)), [singularValues,n]);
  const aMatrix = useMemo(() => Array.from({length:n},(_,i)=>Array.from({length:rank},(_,k)=>U[i][k]*Math.sqrt(singularValues[k]))), [U,singularValues,rank,n]);
  const bMatrix = useMemo(() => Array.from({length:rank},(_,k)=>Array.from({length:n},(_,j)=>V[j][k]*Math.sqrt(singularValues[k]))), [V,singularValues,rank,n]);
  const Wapprox = useMemo(() => {
    const r = Array.from({length:n},()=>Array(n).fill(0));
    for(let i=0;i<n;i++) for(let j=0;j<n;j++) for(let k=0;k<rank;k++) r[i][j]+=U[i][k]*singularValues[k]*V[j][k];
    return r;
  }, [U,V,singularValues,rank,n]);

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={0.7} />

      {/* LEFT: Original W — always visible from step 1+ as reference */}
      {step >= 1 && (
        <AnimGroup targetPos={[origX, 0, -half]}>
          <Block matrix={W} maxV={maxVal} color={null} rows={n} cols={n} />
          <Html position={[half, 3.5, half]} center distanceFactor={8} style={{pointerEvents:'none'}}>
            <span className="text-xs font-bold text-text-dim select-none bg-white/80 px-2 py-1 rounded">W оригинал</span>
          </Html>
        </AnimGroup>
      )}
      {step >= 1 && (
        <Html position={[origX + n + 1.2, 1.5, 0]} center distanceFactor={8} style={{pointerEvents:'none'}}>
          <span className="text-2xl text-accent select-none">{'\u2192'}</span>
        </Html>
      )}

      {/* Step 0: W alone in center */}
      {step === 0 && (
        <AnimGroup targetPos={[-half, 0, -half]}>
          <Block matrix={W} maxV={maxVal} color={null} rows={n} cols={n} />
          <Html position={[half, 3.5, half]} center distanceFactor={8} style={{pointerEvents:'none'}}>
            <span className="text-sm font-bold text-accent select-none bg-white/80 px-2 py-1 rounded">W (8{'\u00d7'}8)</span>
          </Html>
        </AnimGroup>
      )}

      {/* Step 1: U × Σ × V^T on the right side */}
      {step === 1 && (() => {
        const sp = n + 2;
        return (
          <>
            <AnimGroup targetPos={[-half, 0, -half]}>
              <Block matrix={uMatrix} maxV={1.5} color="#c0392b" rows={n} cols={n} />
              <Html position={[half, 3.5, half]} center distanceFactor={8} style={{pointerEvents:'none'}}>
                <span className="text-xs font-bold text-coral select-none bg-white/80 px-2 py-1 rounded">U</span>
              </Html>
            </AnimGroup>
            <Html position={[n+0.5, 1.5, 0]} center distanceFactor={8} style={{pointerEvents:'none'}}>
              <span className="text-xl text-text-dim select-none">{'\u00d7'}</span>
            </Html>
            <AnimGroup targetPos={[sp - half, 0, -half]}>
              <Block matrix={sigmaMatrix} maxV={maxSV} color="#da7756" rows={n} cols={n} />
              <Html position={[half, 3.5, half]} center distanceFactor={8} style={{pointerEvents:'none'}}>
                <span className="text-xs font-bold text-accent select-none bg-white/80 px-2 py-1 rounded">{'\u03a3'}</span>
              </Html>
            </AnimGroup>
            <Html position={[sp + n + 0.5, 1.5, 0]} center distanceFactor={8} style={{pointerEvents:'none'}}>
              <span className="text-xl text-text-dim select-none">{'\u00d7'}</span>
            </Html>
            <AnimGroup targetPos={[sp*2 - half, 0, -half]}>
              <Block matrix={vtMatrix} maxV={1.5} color="#6a9bcc" rows={n} cols={n} />
              <Html position={[half, 3.5, half]} center distanceFactor={8} style={{pointerEvents:'none'}}>
                <span className="text-xs font-bold text-[#6a9bcc] select-none bg-white/80 px-2 py-1 rounded">V^T</span>
              </Html>
            </AnimGroup>
          </>
        );
      })()}

      {/* Steps 2+: A × B = ΔW (A left, B below, result center) */}
      {step >= 2 && (() => {
        const aW = rank * 1.2;
        return (
          <>
            <AnimGroup targetPos={[-(half + gap + aW), 0, -half]}>
              <Block matrix={aMatrix} maxV={3} color="#c0392b" rows={n} cols={rank} colSp={1.2} />
              <Html position={[aW/2, 3.5, half]} center distanceFactor={8} style={{pointerEvents:'none'}}>
                <span className="text-xs font-bold text-coral select-none bg-white/80 px-2 py-1 rounded">A ({n}{'\u00d7'}{rank})</span>
              </Html>
            </AnimGroup>
            <Html position={[-(half + gap/2), 1.5, 0]} center distanceFactor={8} style={{pointerEvents:'none'}}>
              <span className="text-xl text-text-dim select-none">{'\u00d7'}</span>
            </Html>
            <AnimGroup targetPos={[-half, 0, half + 1 + gap]}>
              <Block matrix={bMatrix} maxV={3} color="#588157" rows={rank} cols={n} />
              <Html position={[half, 3.5, rank*0.6]} center distanceFactor={8} style={{pointerEvents:'none'}}>
                <span className="text-xs font-bold text-green select-none bg-white/80 px-2 py-1 rounded">B ({rank}{'\u00d7'}{n})</span>
              </Html>
            </AnimGroup>
            <Html position={[n + 1, 1.5, 0]} center distanceFactor={8} style={{pointerEvents:'none'}}>
              <span className="text-xl text-text-dim select-none">=</span>
            </Html>
            <AnimGroup targetPos={[-half, 0, -half]}>
              <Block matrix={Wapprox} maxV={maxVal} color={null} rows={n} cols={n} />
              <Html position={[half, 3.5, half]} center distanceFactor={8} style={{pointerEvents:'none'}}>
                <span className="text-xs font-bold text-accent select-none bg-white/80 px-2 py-1 rounded">A{'\u00b7'}B (ранг {rank})</span>
              </Html>
            </AnimGroup>
          </>
        );
      })()}

      <OrbitControls enablePan minDistance={8} maxDistance={40} autoRotate autoRotateSpeed={0.4} />
    </>
  );
}

// ── Page: Dimensionality reduction intuition ──
function DimensionalityPage() {
  const [dimStep, setDimStep] = useState(0);

  // Wide spread on PC3 so the 3D→2D collapse is visually dramatic
  const data = useMemo(() => {
    let s = 99;
    const rand = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    const randn = () => { const u1 = rand(), u2 = rand(); return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2); };
    const pts = [];
    for (let i = 0; i < 100; i++) {
      const t1 = randn() * 2.5;   // PC1: big spread
      const t2 = randn() * 1.5;   // PC2: medium spread
      const t3 = randn() * 1.2;   // PC3: noticeable spread (will get squished)
      pts.push([
        t1 * 2 + t2 * 0.0 + t3 * (-0.5),
        t1 * 1 + t2 * 1.0 + t3 * 0.3,
        t1 * 0.5 + t2 * 0.5 + t3 * 2.0,
      ]);
    }
    return pts;
  }, []);
  const svd = useMemo(() => computeSVD(data), [data]);

  const totalVar = svd.eigenvalues.reduce((a, b) => a + b, 0);
  const var1 = (svd.eigenvalues[0] / totalVar * 100).toFixed(1);
  const var12 = ((svd.eigenvalues[0] + svd.eigenvalues[1]) / totalVar * 100).toFixed(1);

  const DIM_STEPS = [
    {
      title: '3D: все данные',
      text: `80 точек в трёхмерном пространстве. Все 3 измерения. 100% информации.`,
      info: '3 измерения → 100%',
    },
    {
      title: '3D → 2D: проекция на плоскость',
      text: `Проецируем на плоскость PC1×PC2. Отбрасываем PC3 (σ₃ маленькое). Сохранили ${var12}% дисперсии. Потеряли только ${(100 - parseFloat(var12)).toFixed(1)}%.`,
      info: `2 измерения → ${var12}%`,
    },
    {
      title: '2D → 1D: проекция на линию',
      text: `Проецируем на линию PC1. Отбрасываем и PC2. Сохранили ${var1}% дисперсии. Расстояния между точками примерно сохранились — потому что основная вариация была вдоль PC1.`,
      info: `1 измерение → ${var1}%`,
    },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-accent">Снижение размерности: интуиция</h2>

      <div className="bg-card rounded-xl p-5 border border-border space-y-3">
        <p className="text-text-dim leading-relaxed">
          Главная идея: данные <em>выглядят</em> трёхмерными, но на самом деле <strong>почти</strong> лежат
          в плоскости (или даже на линии). SVD находит эти скрытые направления, и мы можем
          отбросить «лишние» измерения, почти не теряя информации.
        </p>
        <p className="text-text-dim leading-relaxed">
          <span className="text-accent font-semibold">Ключевое:</span> расстояния между точками
          примерно сохраняются при проекции. Если две точки были далеко — они останутся далеко.
          Если близко — останутся близко. Именно поэтому снижение размерности работает.
        </p>
      </div>

      <div className="bg-card rounded-xl p-4 border border-border">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide flex-nowrap">
          {DIM_STEPS.map((s, i) => (
            <button
              key={i}
              onClick={() => setDimStep(i)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                dimStep === i ? 'bg-accent text-white' : 'text-text-dim hover:text-text hover:bg-surface'
              }`}
            >
              {i}. {s.title}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden" style={{ height: 500 }}>
        <Canvas camera={{ position: [7, 5, 7], fov: 45 }}>
          <DimReductionScene
            data={data}
            svd={svd}
            dimStep={dimStep}
          />
        </Canvas>
      </div>

      <div className="bg-card rounded-xl p-4 border border-border" style={{ minHeight: 80 }}>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-mono text-accent font-bold">{DIM_STEPS[dimStep].info}</span>
          <p className="text-text-dim text-sm">{DIM_STEPS[dimStep].text}</p>
        </div>
      </div>

      {/* Variance bar */}
      <div className="bg-card rounded-xl p-5 border border-border space-y-3">
        <h3 className="text-lg font-semibold">Сколько информации сохранили</h3>
        <div className="space-y-2">
          {[
            { label: '3D (всё)', pct: 100, color: '#da7756', active: dimStep >= 0 },
            { label: '2D (PC1+PC2)', pct: parseFloat(var12), color: '#588157', active: dimStep >= 1 },
            { label: '1D (только PC1)', pct: parseFloat(var1), color: '#6a9bcc', active: dimStep >= 2 },
          ].map((bar) => (
            <div key={bar.label} className="flex items-center gap-3">
              <span className="text-xs text-text-dim w-28 shrink-0">{bar.label}</span>
              <div className="flex-1 h-6 bg-border/30 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${bar.pct}%`,
                    backgroundColor: bar.active ? bar.color : '#d4d0c8',
                    opacity: bar.active ? 1 : 0.3,
                  }}
                />
              </div>
              <span className={`text-xs font-mono w-12 text-right ${bar.active ? 'text-text' : 'text-text-dim'}`}>
                {bar.pct.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Animated dimensionality reduction scene ──
function DimReductionScene({ data, svd, dimStep }) {
  const { mean, pc1, pc2, pc3, singularValues } = svd;
  const pointsRef = useRef();
  const prevStep = useRef(0);
  const progress = useRef(1);
  const fromPositions = useRef(null);

  // Compute positions for all 3 states
  const allPositions = useMemo(() => {
    const n = data.length;
    // State 0: original 3D
    const pos3d = data.map(p => [p[0], p[1], p[2]]);

    // State 1: projected onto PC1-PC2 plane
    const pos2d = data.map(p => {
      const d = [p[0]-mean[0], p[1]-mean[1], p[2]-mean[2]];
      const c1 = d[0]*pc1[0] + d[1]*pc1[1] + d[2]*pc1[2];
      const c2 = d[0]*pc2[0] + d[1]*pc2[1] + d[2]*pc2[2];
      return [
        mean[0] + c1*pc1[0] + c2*pc2[0],
        mean[1] + c1*pc1[1] + c2*pc2[1],
        mean[2] + c1*pc1[2] + c2*pc2[2],
      ];
    });

    // State 2: projected onto PC1 line
    const pos1d = data.map(p => {
      const d = [p[0]-mean[0], p[1]-mean[1], p[2]-mean[2]];
      const c1 = d[0]*pc1[0] + d[1]*pc1[1] + d[2]*pc1[2];
      return [
        mean[0] + c1*pc1[0],
        mean[1] + c1*pc1[1],
        mean[2] + c1*pc1[2],
      ];
    });

    return [pos3d, pos2d, pos1d];
  }, [data, mean, pc1, pc2]);

  const n = data.length;

  // Detect step change
  useEffect(() => {
    if (dimStep !== prevStep.current) {
      // Save current positions as "from"
      if (pointsRef.current) {
        const pos = pointsRef.current.geometry.attributes.position.array;
        fromPositions.current = new Float32Array(pos);
      }
      prevStep.current = dimStep;
      progress.current = 0;
    }
  }, [dimStep]);

  // Animate
  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    const positions = pointsRef.current.geometry.attributes.position;

    if (progress.current < 1) {
      progress.current = Math.min(1, progress.current + delta * 1.0);
      const t = easeInOut(progress.current);
      const target = allPositions[dimStep];
      const from = fromPositions.current;

      if (from) {
        for (let i = 0; i < n; i++) {
          positions.array[i*3]   = from[i*3]   + (target[i][0] - from[i*3]) * t;
          positions.array[i*3+1] = from[i*3+1] + (target[i][1] - from[i*3+1]) * t;
          positions.array[i*3+2] = from[i*3+2] + (target[i][2] - from[i*3+2]) * t;
        }
      }
      positions.needsUpdate = true;
    }
  });

  // Initial geometry
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i*3] = allPositions[0][i][0];
      pos[i*3+1] = allPositions[0][i][1];
      pos[i*3+2] = allPositions[0][i][2];
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, [allPositions, n]);

  const tex = useMemo(() => getCircleTexture(), []);

  const scale = 2;
  const maxSV = Math.max(...singularValues);
  const sv1 = (singularValues[0] / maxSV) * scale;
  const sv2 = (singularValues[1] / maxSV) * scale;
  const sv3 = (singularValues[2] / maxSV) * scale;

  // Colors per step
  const pointColor = ['#da7756', '#588157', '#6a9bcc'][dimStep];

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={0.6} />

      {/* Points */}
      <points ref={pointsRef} geometry={geo}>
        <pointsMaterial
          color={pointColor}
          size={0.16}
          transparent opacity={0.8}
          sizeAttenuation
          map={tex} alphaMap={tex} alphaTest={0.1} depthWrite={false}
        />
      </points>

      {/* PC1 axis — always visible */}
      <AxisArrow
        from={[mean[0]-pc1[0]*sv1*1.5, mean[1]-pc1[1]*sv1*1.5, mean[2]-pc1[2]*sv1*1.5]}
        to={[mean[0]+pc1[0]*sv1*1.5, mean[1]+pc1[1]*sv1*1.5, mean[2]+pc1[2]*sv1*1.5]}
        color="#c0392b" label="PC1" thickness={dimStep === 2 ? 3 : 2}
      />

      {/* PC2 axis — visible in steps 0,1 */}
      {dimStep <= 1 && (
        <AxisArrow
          from={[mean[0]-pc2[0]*sv2*1.5, mean[1]-pc2[1]*sv2*1.5, mean[2]-pc2[2]*sv2*1.5]}
          to={[mean[0]+pc2[0]*sv2*1.5, mean[1]+pc2[1]*sv2*1.5, mean[2]+pc2[2]*sv2*1.5]}
          color="#588157" label="PC2" thickness={2}
        />
      )}

      {/* PC3 axis — visible only in step 0 */}
      {dimStep === 0 && (
        <AxisArrow
          from={[mean[0]-pc3[0]*sv3, mean[1]-pc3[1]*sv3, mean[2]-pc3[2]*sv3]}
          to={[mean[0]+pc3[0]*sv3, mean[1]+pc3[1]*sv3, mean[2]+pc3[2]*sv3]}
          color="#6a9bcc" label="PC3" thickness={1}
        />
      )}

      {/* PCA plane — visible in step 1 */}
      {dimStep === 1 && (
        <PCAPlane pc1={pc1} pc2={pc2} mean={mean} size={3} />
      )}

      {/* Projection lines — visible during transitions */}
      {dimStep === 1 && (
        <ProjectionLines points={data} pc1={pc1} pc2={pc2} mean={mean} />
      )}

      {/* Grid */}
      <Line points={[[-5, 0, 0], [5, 0, 0]]} color="#ddd" lineWidth={0.5} />
      <Line points={[[0, -5, 0], [0, 5, 0]]} color="#ddd" lineWidth={0.5} />
      <Line points={[[0, 0, -5], [0, 0, 5]]} color="#ddd" lineWidth={0.5} />

      {/* Mean */}
      <mesh position={mean}>
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshStandardMaterial color="#6a9bcc" />
      </mesh>

      <OrbitControls enablePan={false} minDistance={5} maxDistance={15} autoRotate autoRotateSpeed={0.5} />
    </>
  );
}

// ── Router ──
import { Routes, Route, Navigate } from 'react-router-dom';

export default function SvdPca() {
  return (
    <Routes>
      <Route index element={<Navigate to="theory" replace />} />
      <Route path="theory" element={<TheoryPage />} />
      <Route path="pca-3d" element={<PCA3DPage />} />
      <Route path="transform" element={<TransformPage />} />
      <Route path="square" element={<SquarePage />} />
      <Route path="applications" element={<ApplicationsPage />} />
      <Route path="lora" element={<LoRAPage />} />
      <Route path="dimensionality" element={<DimensionalityPage />} />
    </Routes>
  );
}

// ── Page: Where SVD is used in ML ──
function ApplicationsPage() {
  const areas = [
    {
      title: 'Снижение размерности',
      color: '#c0392b',
      items: [
        { name: 'PCA', desc: 'Главные компоненты = правые сингулярные векторы V. Отбрасываем маленькие σᵢ — снижаем размерность с минимальной потерей информации.', hot: true },
        { name: 'Truncated SVD', desc: 'То же что PCA, но без центрирования. Работает с разреженными матрицами (текст, рейтинги).', hot: true },
        { name: 't-SNE / UMAP препроцессинг', desc: 'Перед t-SNE/UMAP часто сначала делают SVD до 50 компонент — ускоряет в разы.', hot: false },
      ],
    },
    {
      title: 'NLP и текст',
      color: '#da7756',
      items: [
        { name: 'LSA / LSI', desc: 'SVD на матрице «документ × слово» (TF-IDF). Получаем латентные семантические темы. Предшественник topic modeling.', hot: true },
        { name: 'Сжатие эмбеддингов', desc: 'Word2Vec/GloVe матрица 50000×300 → SVD → оставляем топ-100 компонент. Быстрее, меньше памяти.', hot: false },
        { name: 'BM25 + SVD', desc: 'Классический пайплайн поиска: BM25 для retrieval, SVD для re-ranking через латентное пространство.', hot: false },
      ],
    },
    {
      title: 'Рекомендательные системы',
      color: '#588157',
      items: [
        { name: 'Collaborative Filtering', desc: 'SVD на матрице «пользователь × товар». Разреженную матрицу рейтингов раскладываем, заполняем пропуски. Netflix Prize.', hot: true },
        { name: 'SVD++', desc: 'Расширение SVD с учётом implicit feedback (не только рейтинги, но и клики, просмотры).', hot: true },
        { name: 'Funk SVD', desc: 'Аппроксимация SVD через SGD — не считаем полное разложение, а учим факторы градиентным спуском.', hot: false },
      ],
    },
    {
      title: 'Deep Learning',
      color: '#6a9bcc',
      items: [
        { name: 'LoRA', desc: 'Low-Rank Adaptation — дообучение LLM через низкоранговое разложение весов. По сути SVD-идея: W + ΔW, где ΔW = AB (ранг << размерность).', hot: true },
        { name: 'Сжатие нейросетей', desc: 'SVD на матрицах весов слоёв. Убираем маленькие σᵢ — сеть становится меньше и быстрее, качество почти не падает.', hot: false },
        { name: 'Weight initialization', desc: 'Ортогональная инициализация весов (через SVD) помогает избежать vanishing/exploding gradients.', hot: false },
      ],
    },
    {
      title: 'Обработка изображений',
      color: '#b8860b',
      items: [
        { name: 'Сжатие изображений', desc: 'SVD на матрице пикселей. Оставляем топ-k сингулярных значений — картинка почти та же, но данных в разы меньше.', hot: false },
        { name: 'Шумоподавление (denoising)', desc: 'Шум сидит в маленьких σᵢ. Отрезаем их — убираем шум, сохраняем сигнал.', hot: false },
        { name: 'Eigenfaces', desc: 'PCA на лицах = SVD на матрице «пиксели × фотографии». Получаем базисные лица для распознавания.', hot: false },
      ],
    },
    {
      title: 'Линейная алгебра / Классический ML',
      color: '#6b6b66',
      items: [
        { name: 'Псевдообратная матрица', desc: 'Moore-Penrose: A⁺ = VΣ⁻¹Uᵀ. Единственный правильный способ «обратить» прямоугольную матрицу.', hot: true },
        { name: 'Линейная регрессия', desc: 'Решение через SVD численно стабильнее чем через (AᵀA)⁻¹. NumPy lstsq использует SVD внутри.', hot: true },
        { name: 'Ridge regression', desc: 'SVD позволяет эффективно перебирать λ регуляризации без пересчёта разложения.', hot: false },
        { name: 'Определение ранга', desc: 'Ранг матрицы = количество ненулевых сингулярных значений. Численный ранг = количество σᵢ > ε.', hot: false },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-accent">Где используется SVD в ML</h2>

      <div className="bg-card rounded-xl p-5 border border-border">
        <p className="text-text-dim leading-relaxed">
          SVD — это «швейцарский нож» линейной алгебры. Везде, где есть матрица и хочется
          <strong> найти главное</strong>, <strong>сжать</strong> или <strong>убрать шум</strong> — там SVD.
          Ниже — конкретные применения в ML, NLP, RecSys и Deep Learning.
        </p>
        <p className="text-text-dim text-sm mt-2">
          <span className="inline-block w-2 h-2 rounded-full bg-accent mr-1" /> — часто спрашивают на собесах MLE
        </p>
      </div>

      {areas.map((area) => (
        <div key={area.title} className="bg-card rounded-xl p-5 border border-border space-y-3">
          <h3 className="text-lg font-semibold" style={{ color: area.color }}>{area.title}</h3>
          <div className="space-y-2">
            {area.items.map((item) => (
              <div key={item.name} className="flex gap-3 items-start">
                {item.hot && <span className="w-2 h-2 rounded-full bg-accent mt-2 shrink-0" />}
                {!item.hot && <span className="w-2 h-2 rounded-full bg-border mt-2 shrink-0" />}
                <div>
                  <p className="font-medium text-sm">{item.name}</p>
                  <p className="text-text-dim text-xs leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="bg-accent-light/30 rounded-xl p-5 border border-accent/20">
        <h3 className="text-lg font-semibold mb-2">Общий паттерн</h3>
        <p className="text-text-dim leading-relaxed text-sm">
          Во всех этих случаях SVD делает одно и то же: находит <strong>наиболее важные направления</strong> в данных
          (большие σᵢ) и отделяет их от шума (маленькие σᵢ). Разница только в том, что за матрица подаётся на вход:
          пиксели, слова, рейтинги, веса нейросети — принцип один.
        </p>
      </div>
    </div>
  );
}
