import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Line, Html } from '@react-three/drei';
import * as THREE from 'three';

// H₀ surface: a curved surface in 3D parameter space
// X = P(bars), Y = P(sevens), Z = P(diamonds)
// All points on the surface satisfy E[R] = 0.92

function H0Surface() {
  const mesh = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const res = 40;
    const positions = [];
    const colors = [];
    const indices = [];

    for (let i = 0; i <= res; i++) {
      for (let j = 0; j <= res; j++) {
        const u = i / res;
        const v = j / res;

        // Parametric surface: constraint E[R] = 0.92
        const x = (u - 0.5) * 4;
        const z = (v - 0.5) * 4;
        const y = -0.3 + 0.15 * Math.sin(u * Math.PI * 2) * Math.cos(v * Math.PI) +
                  0.1 * Math.cos(u * Math.PI * 3 + v * Math.PI);

        positions.push(x, y, z);

        // Color gradient across surface
        const r = 0.85 - u * 0.3;
        const g = 0.47 + v * 0.2;
        const b = 0.34 + u * 0.2;
        colors.push(r, g, b);
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
  }, []);

  return (
    <mesh geometry={mesh}>
      <meshStandardMaterial
        vertexColors
        transparent
        opacity={0.35}
        side={THREE.DoubleSide}
        roughness={0.8}
      />
    </mesh>
  );
}

// Wireframe grid on the H0 surface for depth perception
function H0Wireframe() {
  const lines = useMemo(() => {
    const result = [];
    const res = 12;

    for (let i = 0; i <= res; i++) {
      const u = i / res;
      const pts = [];
      for (let j = 0; j <= 30; j++) {
        const v = j / 30;
        const x = (u - 0.5) * 4;
        const z = (v - 0.5) * 4;
        const y = -0.3 + 0.15 * Math.sin(u * Math.PI * 2) * Math.cos(v * Math.PI) +
                  0.1 * Math.cos(u * Math.PI * 3 + v * Math.PI);
        pts.push([x, y, z]);
      }
      result.push(pts);
    }

    for (let j = 0; j <= res; j++) {
      const v = j / res;
      const pts = [];
      for (let i = 0; i <= 30; i++) {
        const u = i / 30;
        const x = (u - 0.5) * 4;
        const z = (v - 0.5) * 4;
        const y = -0.3 + 0.15 * Math.sin(u * Math.PI * 2) * Math.cos(v * Math.PI) +
                  0.1 * Math.cos(u * Math.PI * 3 + v * Math.PI);
        pts.push([x, y, z]);
      }
      result.push(pts);
    }

    return result;
  }, []);

  return lines.map((pts, i) => (
    <Line key={i} points={pts} color="#da7756" lineWidth={0.5} opacity={0.2} transparent />
  ));
}

// Model points on the H₀ surface
function ModelPoint({ position, color, label, sublabel }) {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <Html distanceFactor={8} position={[0, 0.3, 0]} center>
        <div className="text-center whitespace-nowrap pointer-events-none select-none">
          <p className="text-xs font-bold" style={{ color }}>{label}</p>
          <p className="text-[10px] text-text-dim">{sublabel}</p>
        </div>
      </Html>
    </group>
  );
}

// Data point (journalist's data) floating above the surface
function DataPoint({ position }) {
  const ref = useRef();

  useFrame((state) => {
    ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 1.5) * 0.08;
  });

  return (
    <group ref={ref} position={position}>
      <mesh>
        <sphereGeometry args={[0.16, 16, 16]} />
        <meshStandardMaterial color="#c0392b" emissive="#c0392b" emissiveIntensity={0.3} />
      </mesh>
      {/* Glow ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.22, 0.28, 32]} />
        <meshBasicMaterial color="#c0392b" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
      <Html distanceFactor={8} position={[0, 0.4, 0]} center>
        <div className="text-center whitespace-nowrap pointer-events-none select-none">
          <p className="text-xs font-bold text-red">Данные журналиста</p>
          <p className="text-[10px] text-red/70">T = расстояние до поверхности</p>
        </div>
      </Html>
    </group>
  );
}

// Dashed lines from each model to the data point
function DistanceLine({ from, to, color }) {
  const mid = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2];

  return (
    <group>
      <Line
        points={[from, to]}
        color={color}
        lineWidth={2}
        dashed
        dashSize={0.15}
        gapSize={0.1}
      />
      <Html distanceFactor={10} position={mid} center>
        <div className="pointer-events-none select-none">
          <span className="text-[10px] font-mono px-1 py-0.5 rounded"
            style={{ color, backgroundColor: 'rgba(255,255,255,0.85)' }}>
            T ≈ далеко
          </span>
        </div>
      </Html>
    </group>
  );
}

// Axis labels
function AxisLabels() {
  return (
    <>
      <Text position={[2.5, -0.8, 0]} fontSize={0.18} color="#6b6b66" anchorX="center">
        P(бары) →
      </Text>
      <Text position={[0, -0.8, 2.5]} fontSize={0.18} color="#6b6b66" anchorX="center" rotation={[0, -Math.PI / 2, 0]}>
        P(бриллианты) →
      </Text>
      <Text position={[-2.3, 1.2, 0]} fontSize={0.18} color="#6b6b66" anchorX="center" rotation={[0, 0, Math.PI / 2]}>
        P(семёрки) →
      </Text>
    </>
  );
}

// The full 3D scene
function Scene({ tReal }) {
  // Model positions on the H₀ surface
  const modelA = [-1.2, -0.15, -0.8];
  const modelB = [0.5, -0.25, 1.0];
  const modelC = [1.5, -0.18, -0.5];

  // Data point — far above the surface
  const dataPos = [0.3, 2.2, 0.2];

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <directionalLight position={[-3, 3, -3]} intensity={0.3} />

      {/* H₀ constraint surface */}
      <H0Surface />
      <H0Wireframe />

      {/* Surface label */}
      <Html distanceFactor={10} position={[1.8, -0.5, 1.8]} center>
        <div className="pointer-events-none select-none bg-white/80 px-2 py-1 rounded">
          <p className="text-xs font-bold text-accent">Поверхность H₀</p>
          <p className="text-[10px] text-text-dim">все модели с E[R] = 0.92</p>
        </div>
      </Html>

      {/* Three model points */}
      <ModelPoint position={modelA} color="#da7756" label="Модель A" sublabel="джекпотный" />
      <ModelPoint position={modelB} color="#6a9bcc" label="Модель B" sublabel="бриллиантовый" />
      <ModelPoint position={modelC} color="#588157" label="Модель C" sublabel="баровый" />

      {/* Data point */}
      <DataPoint position={dataPos} />

      {/* Distance lines */}
      <DistanceLine from={modelA} to={dataPos} color="#da7756" />
      <DistanceLine from={modelB} to={dataPos} color="#6a9bcc" />
      <DistanceLine from={modelC} to={dataPos} color="#588157" />

      {/* Axes */}
      <Line points={[[-2.2, -0.7, -2.2], [2.2, -0.7, -2.2]]} color="#ccc" lineWidth={1} />
      <Line points={[[-2.2, -0.7, -2.2], [-2.2, -0.7, 2.2]]} color="#ccc" lineWidth={1} />
      <Line points={[[-2.2, -0.7, -2.2], [-2.2, 2.5, -2.2]]} color="#ccc" lineWidth={1} />
      <AxisLabels />

      <OrbitControls
        enablePan={false}
        minDistance={4}
        maxDistance={12}
        autoRotate
        autoRotateSpeed={0.8}
      />
    </>
  );
}

export function Step6({ tReal }) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-accent">3D: Пространство моделей</h2>

      <p className="text-text-dim leading-relaxed">
        Каждая возможная модель автомата — это точка в многомерном пространстве параметров
        (вероятности каждого символа на каждом барабане). Ниже — упрощение до 3D:
      </p>

      <div className="bg-card rounded-xl p-4 border border-border space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div className="flex items-start gap-2">
            <div className="w-3 h-3 rounded-full bg-accent mt-1 shrink-0" />
            <div>
              <p className="font-semibold">Поверхность</p>
              <p className="text-text-dim text-xs">Все модели с E[R] = 0.92 (H₀). Разные точки = разные автоматы, но все «честные».</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-3 h-3 rounded-full bg-red mt-1 shrink-0" />
            <div>
              <p className="font-semibold">Красная точка</p>
              <p className="text-text-dim text-xs">Данные журналиста. Висит <em>далеко</em> от поверхности. Расстояние до неё — это T.</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-3 h-3 rounded-full bg-[#6a9bcc] mt-1 shrink-0" />
            <div>
              <p className="font-semibold">Пунктирные линии</p>
              <p className="text-text-dim text-xs">Расстояние от каждой модели до данных. Все примерно одинаковые → робастно.</p>
            </div>
          </div>
        </div>
      </div>

      {/* 3D Canvas */}
      <div className="bg-card rounded-xl border border-border overflow-hidden" style={{ height: 500 }}>
        <Canvas camera={{ position: [5, 4, 5], fov: 45 }}>
          <Scene tReal={tReal} />
        </Canvas>
      </div>

      <p className="text-text-dim text-sm text-center">
        Крути мышкой или пальцем. Автомат медленно вращается.
      </p>

      {/* Explanation */}
      <div className="bg-card rounded-xl p-5 border border-border space-y-4">
        <h3 className="text-lg font-semibold">Что тут видно</h3>
        <div className="space-y-3 text-text-dim text-sm leading-relaxed">
          <p>
            <span className="text-accent font-semibold">Поверхность</span> — это множество всех автоматов,
            удовлетворяющих H₀ (E[R] = 0.92). На ней бесконечно много точек. Модели A, B, C — три
            конкретные точки, которые мы выбрали для проверки.
          </p>
          <p>
            <span className="text-red font-semibold">Красная точка</span> — данные журналиста (его T).
            Она висит <em>высоко над</em> поверхностью. Расстояние от неё до поверхности — это и есть
            наша статистика T: насколько данные «далеки» от мира, где казино не врёт.
          </p>
          <p>
            <span className="font-semibold">Ключевое наблюдение:</span> от красной точки до
            <em> любой</em> точки на поверхности — далеко. Не только до A, не только до B, а до
            всей поверхности целиком. Это значит, что данные несовместимы с <em>любым</em> честным
            автоматом, а не только с одним конкретным.
          </p>
        </div>
      </div>

      <div className="bg-accent-light/30 rounded-xl p-5 border border-accent/20 space-y-3">
        <h3 className="text-lg font-semibold">Когда робастность провалилась бы</h3>
        <p className="text-text-dim text-sm leading-relaxed">
          Представь, что красная точка висела бы <em>низко</em> — почти касаясь поверхности.
          Тогда от одной точки на поверхности (модель A) до неё было бы далеко (T большое, p маленький),
          а от другой точки (модель C) — близко (T маленькое, p большой).
          Вывод зависел бы от выбора модели → не робастно.
        </p>
        <p className="text-text-dim text-sm leading-relaxed">
          Но в нашем случае красная точка <strong>далеко от всей поверхности</strong> — поэтому
          от любой точки расстояние большое. Вот почему результат устойчив.
        </p>
      </div>
    </div>
  );
}
