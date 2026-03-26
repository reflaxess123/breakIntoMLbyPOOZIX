import { useState, useRef, useEffect, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import { K } from '../../components/Latex';
import * as THREE from 'three';

// ══════════════════════════════════════════════════════════════
// Dirichlet distribution on a 2-simplex (3 categories → triangle)
// ══════════════════════════════════════════════════════════════

function lnGamma(z) {
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lnGamma(1 - z);
  z -= 1;
  let x = c[0];
  for (let i = 1; i < 9; i++) x += c[i] / (z + i);
  const t = z + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

function dirichletPDF(x1, x2, x3, a1, a2, a3) {
  if (x1 <= 0 || x2 <= 0 || x3 <= 0) return 0;
  if (Math.abs(x1 + x2 + x3 - 1) > 0.01) return 0;
  const lnB = lnGamma(a1) + lnGamma(a2) + lnGamma(a3) - lnGamma(a1 + a2 + a3);
  return Math.exp((a1 - 1) * Math.log(x1) + (a2 - 1) * Math.log(x2) + (a3 - 1) * Math.log(x3) - lnB);
}

// Convert barycentric (on simplex) to 3D cartesian
// Equilateral triangle with vertices at:
// v0 = (0, 0, 0), v1 = (1, 0, 0), v2 = (0.5, 0, sqrt(3)/2)
const V0 = [0, 0, 0];
const V1 = [2, 0, 0];
const V2 = [1, 0, Math.sqrt(3)];

function baryToXYZ(p1, p2, p3) {
  return [
    p1 * V0[0] + p2 * V1[0] + p3 * V2[0],
    0, // Y will be the density (height)
    p1 * V0[2] + p2 * V1[2] + p3 * V2[2],
  ];
}

// ══════════════════════════════════════════════════════════════
// 3D Surface mesh
// ══════════════════════════════════════════════════════════════

function DirichletSurface({ alpha }) {
  const meshRef = useRef();
  const [a1, a2, a3] = alpha;

  const { positions, colors, indices } = useMemo(() => {
    const res = 60; // resolution
    const pts = [];
    const cols = [];
    const idx = [];

    // Generate points on the simplex
    const grid = [];
    for (let i = 0; i <= res; i++) {
      for (let j = 0; j <= res - i; j++) {
        const k = res - i - j;
        const p1 = Math.max(0.005, i / res);
        const p2 = Math.max(0.005, j / res);
        const p3 = Math.max(0.005, k / res);
        const sum = p1 + p2 + p3;
        grid.push([p1 / sum, p2 / sum, p3 / sum]);
      }
    }

    // Compute densities
    let maxD = 0;
    const densities = grid.map(([p1, p2, p3]) => {
      const d = dirichletPDF(p1, p2, p3, a1, a2, a3);
      const clamped = Math.min(d, 50); // clamp for display
      if (clamped > maxD) maxD = clamped;
      return clamped;
    });

    const scale = maxD > 0 ? 1.5 / maxD : 1;

    // Build positions and colors
    grid.forEach(([p1, p2, p3], i) => {
      const [x, , z] = baryToXYZ(p1, p2, p3);
      const y = densities[i] * scale;
      pts.push(x, y, z);

      // Color: terracotta for high density, cream for low
      const t = maxD > 0 ? densities[i] / maxD : 0;
      cols.push(
        0.85 * (1 - t) + 0.85 * t,  // R
        0.84 * (1 - t) + 0.47 * t,  // G
        0.80 * (1 - t) + 0.34 * t,  // B
      );
    });

    // Build triangle indices
    let row = 0;
    let rowStart = 0;
    for (let i = 0; i <= res; i++) {
      const rowLen = res - i + 1;
      const nextRowStart = rowStart + rowLen;
      for (let j = 0; j < rowLen - 1; j++) {
        const a = rowStart + j;
        const b = rowStart + j + 1;
        const c = nextRowStart + j;
        if (c < grid.length) {
          idx.push(a, b, c);
          if (c + 1 < grid.length && j + 1 < rowLen - 1) {
            // Check next row has this point
            const d = nextRowStart + j + 1;
            if (d < grid.length) {
              // Only add if d is in the next row
              const nextRowLen = res - i - 1 + 1;
              if (j + 1 < nextRowLen) {
                // skip — the triangle mesh is already handled
              }
            }
          }
        }
      }
      // Upward triangles
      const nextRowLen = res - i;
      for (let j = 0; j < nextRowLen - 1; j++) {
        const a = nextRowStart + j;
        const b = rowStart + j + 1;
        const c = nextRowStart + j + 1;
        if (a < grid.length && b < grid.length && c < grid.length) {
          idx.push(a, b, c);
        }
      }
      rowStart = nextRowStart;
    }

    return {
      positions: new Float32Array(pts),
      colors: new Float32Array(cols),
      indices: new Uint32Array(idx),
    };
  }, [a1, a2, a3]);

  return (
    <mesh ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="index" array={indices} count={indices.length} itemSize={1} />
        <bufferAttribute attach="attributes-position" array={positions} count={positions.length / 3} itemSize={3} />
        <bufferAttribute attach="attributes-color" array={colors} count={colors.length / 3} itemSize={3} />
      </bufferGeometry>
      <meshStandardMaterial vertexColors side={THREE.DoubleSide} flatShading />
    </mesh>
  );
}

// ══════════════════════════════════════════════════════════════
// Triangle base (wireframe simplex)
// ══════════════════════════════════════════════════════════════

function SimplexBase() {
  const points = useMemo(() => {
    return [
      new THREE.Vector3(...V0),
      new THREE.Vector3(...V1),
      new THREE.Vector3(...V2),
      new THREE.Vector3(...V0),
    ];
  }, []);

  const geometry = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [points]);

  return (
    <group>
      <line geometry={geometry}>
        <lineBasicMaterial color="#6b6b66" linewidth={1} />
      </line>
      <Text position={[V0[0] - 0.15, 0, V0[2] - 0.15]} fontSize={0.18} color="#da7756" anchorX="center">
        p₁
      </Text>
      <Text position={[V1[0] + 0.15, 0, V1[2] - 0.15]} fontSize={0.18} color="#588157" anchorX="center">
        p₂
      </Text>
      <Text position={[V2[0], 0, V2[2] + 0.15]} fontSize={0.18} color="#3498db" anchorX="center">
        p₃
      </Text>
    </group>
  );
}

// ══════════════════════════════════════════════════════════════
// Scene
// ══════════════════════════════════════════════════════════════

function Scene({ alpha }) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 5, 3]} intensity={0.8} />
      <directionalLight position={[-2, 3, -1]} intensity={0.3} />
      <DirichletSurface alpha={alpha} />
      <SimplexBase />
      <OrbitControls
        target={[1, 0.5, 0.6]}
        minDistance={1.5}
        maxDistance={8}
        enablePan={false}
      />
    </>
  );
}

// ══════════════════════════════════════════════════════════════
// Presets
// ══════════════════════════════════════════════════════════════

const PRESETS = [
  { label: 'Равномерный (1,1,1)', alpha: [1, 1, 1], desc: 'Все комбинации равновероятны. Плоская поверхность.' },
  { label: 'Не знаем (0.5, 0.5, 0.5)', alpha: [0.5, 0.5, 0.5], desc: 'Jeffreys prior. Масса в углах — чистые категории вероятнее.' },
  { label: 'Симметричный (5,5,5)', alpha: [5, 5, 5], desc: 'Уверены что все категории примерно поровну. Пик в центре.' },
  { label: 'Много нулей (10,2,2)', alpha: [10, 2, 2], desc: 'Как казино: нулей много, остальное мало. Пик в углу p₁.' },
  { label: 'Много семёрок (2,2,10)', alpha: [2, 2, 10], desc: 'Много третьей категории. Пик в углу p₃.' },
  { label: 'Концентрированный (20,20,20)', alpha: [20, 20, 20], desc: 'Очень уверены: ровно по 1/3. Острый пик в центре.' },
];

// ══════════════════════════════════════════════════════════════
// Main Page
// ══════════════════════════════════════════════════════════════

export default function DirichletVizPage() {
  const [a1, setA1] = useState(1);
  const [a2, setA2] = useState(1);
  const [a3, setA3] = useState(1);

  const applyPreset = (preset) => {
    setA1(preset.alpha[0]);
    setA2(preset.alpha[1]);
    setA3(preset.alpha[2]);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-accent mb-2">Распределение Дирихле — prior для категорий</h1>
        <p className="text-text-dim italic">
          3D-визуализация: как prior распределяет вероятностную массу по симплексу.
        </p>
      </div>

      {/* Explanation */}
      <div className="bg-card rounded-2xl p-6 border border-border space-y-3">
        <h2 className="text-lg font-bold text-accent">Зачем это нужно</h2>
        <p className="text-text leading-relaxed">
          У барабана 7 символов с вероятностями <K m="p_1, p_2, \ldots, p_7" />, где <K m="\sum p_i = 1" />.
          Это <strong>категориальное распределение</strong>. Prior на такие вероятности — это <strong>распределение Дирихле</strong>.
        </p>
        <p className="text-text leading-relaxed">
          Здесь показан упрощённый случай: <strong>3 категории</strong> вместо 7. Треугольник — это симплекс
          (множество всех (p₁, p₂, p₃) где сумма = 1). Высота поверхности — плотность prior.
          Где высоко — такие комбинации вероятностей мы считаем более вероятными <em>до данных</em>.
        </p>
        <div className="bg-bg rounded-xl p-3">
          <K d m="\text{Dir}(\alpha_1, \alpha_2, \alpha_3): \quad p(p_1, p_2, p_3) \propto p_1^{\alpha_1-1} \cdot p_2^{\alpha_2-1} \cdot p_3^{\alpha_3-1}" />
        </div>
      </div>

      {/* Presets */}
      <div className="bg-card rounded-2xl p-6 border border-border space-y-4">
        <h2 className="text-lg font-bold text-accent">Пресеты</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {PRESETS.map((p, i) => (
            <button key={i} onClick={() => applyPreset(p)}
              className={`text-left p-3 rounded-xl border text-sm transition-all ${
                a1 === p.alpha[0] && a2 === p.alpha[1] && a3 === p.alpha[2]
                  ? 'border-accent bg-accent/10 text-accent font-bold'
                  : 'border-border bg-bg hover:border-accent/50'
              }`}>
              <p className="font-semibold text-xs">{p.label}</p>
              <p className="text-text-dim text-xs mt-1">{p.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Sliders */}
      <div className="bg-card rounded-2xl p-6 border border-border space-y-3">
        <h2 className="text-lg font-bold text-accent">Параметры α</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-text-dim">α₁ = <strong className="text-coral">{a1.toFixed(1)}</strong></label>
            <input type="range" min="0.1" max="30" step="0.1" value={a1}
              onChange={e => setA1(+e.target.value)} className="w-full" />
          </div>
          <div>
            <label className="text-sm text-text-dim">α₂ = <strong className="text-green">{a2.toFixed(1)}</strong></label>
            <input type="range" min="0.1" max="30" step="0.1" value={a2}
              onChange={e => setA2(+e.target.value)} className="w-full" />
          </div>
          <div>
            <label className="text-sm text-text-dim">α₃ = <strong className="text-blue-500">{a3.toFixed(1)}</strong></label>
            <input type="range" min="0.1" max="30" step="0.1" value={a3}
              onChange={e => setA3(+e.target.value)} className="w-full" />
          </div>
        </div>
      </div>

      {/* 3D Canvas */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden" style={{ height: 450 }}>
        <Suspense fallback={<div className="flex items-center justify-center h-full text-text-dim">Загрузка 3D...</div>}>
          <Canvas camera={{ position: [1, 3, 3.5], fov: 45 }}>
            <Scene alpha={[a1, a2, a3]} />
          </Canvas>
        </Suspense>
      </div>

      {/* What the corners mean */}
      <div className="bg-card rounded-2xl p-6 border border-border space-y-4">
        <h2 className="text-lg font-bold text-accent">Что означают углы треугольника</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-bg rounded-xl p-3 text-center">
            <p className="font-bold text-coral">Угол p₁ = 1</p>
            <p className="text-xs text-text-dim">100% первой категории, 0% остальных</p>
            <p className="text-xs text-text-dim">В казино: автомат выдаёт только нули</p>
          </div>
          <div className="bg-bg rounded-xl p-3 text-center">
            <p className="font-bold text-green">Угол p₂ = 1</p>
            <p className="text-xs text-text-dim">100% второй категории</p>
            <p className="text-xs text-text-dim">В казино: только бары</p>
          </div>
          <div className="bg-bg rounded-xl p-3 text-center">
            <p className="font-bold text-blue-500">Угол p₃ = 1</p>
            <p className="text-xs text-text-dim">100% третьей категории</p>
            <p className="text-xs text-text-dim">В казино: только семёрки</p>
          </div>
        </div>
        <p className="text-sm text-text-dim">
          Центр треугольника = все категории по 1/3. Рёбра = одна категория нулевая.
          Покрути 3D сцену мышкой чтобы рассмотреть поверхность.
        </p>
      </div>

      {/* Connection to casino */}
      <div className="bg-card rounded-2xl p-6 border border-border space-y-3">
        <h2 className="text-lg font-bold text-accent">Связь с казино</h2>
        <p className="text-text leading-relaxed">
          У каждого барабана 7 символов → prior = Dirichlet с 7 параметрами (не 3 как тут).
          Визуализировать 7-мерный симплекс невозможно, но принцип тот же:
        </p>
        <ul className="list-disc pl-5 space-y-1 text-text text-sm">
          <li><strong>Dir(1,1,1,1,1,1,1)</strong> — не знаем ничего, все вероятности символов равновозможны</li>
          <li><strong>Dir(10,3,2,1,1,1,1)</strong> — казино обычно ставит много нулей и мало остального</li>
          <li>Это <strong>p(θ|𝔓ᵢ)</strong> из формулы на слайде — prior на параметры внутри сложной гипотезы</li>
        </ul>
      </div>
    </div>
  );
}
