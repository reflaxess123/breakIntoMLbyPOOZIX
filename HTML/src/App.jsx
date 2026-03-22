import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { RoadmapViewer } from './components/RoadmapViewer';

// ── Visualization registry ──────────────────────────────────────
export const VISUALIZATIONS = [
  {
    id: 'hypothesis-testing',
    title: 'Проверка гипотез: Игровой автомат',
    component: lazy(() => import('./vis/hypothesis-testing/index.jsx')),
  },
  {
    id: 'svd-pca',
    title: 'SVD и PCA',
    component: lazy(() => import('./vis/svd-pca/index.jsx')),
    // Sub-pages shown in sidebar when this viz is active
    pages: [
      { path: 'theory', label: 'Основа и формулы' },
      { path: 'pca-3d', label: 'PCA: главные компоненты' },
      { path: 'transform', label: 'V^T → Σ → U анимация' },
      { path: 'square', label: 'V^T → Σ → U анимация 2 (куб)' },
      { path: 'lora', label: 'LoRA: низкоранговая адаптация' },
      { path: 'dimensionality', label: 'Снижение размерности: интуиция' },
      { path: 'applications', label: 'Где используется SVD' },
    ],
  },
];

function App() {
  return (
    <Layout>
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-64 text-text-dim">
            Загрузка...
          </div>
        }
      >
        <Routes>
          <Route index element={<Navigate to={`/vis/${VISUALIZATIONS[0].id}`} replace />} />

          {VISUALIZATIONS.map((viz) => (
            <Route
              key={viz.id}
              path={`/vis/${viz.id}/*`}
              element={<viz.component />}
            />
          ))}

          {/* Roadmaps */}
          <Route path="/roadmaps" element={<RoadmapViewer />} />
          <Route path="/roadmaps/:slug" element={<RoadmapViewer />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}

export default App;
