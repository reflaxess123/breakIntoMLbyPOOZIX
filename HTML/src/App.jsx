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
  {
    id: 'information',
    title: 'Где хранится информация',
    component: lazy(() => import('./vis/information/index.jsx')),
  },
  {
    id: 'glivenko-cantelli',
    title: 'Эмпирические распределения',
    component: lazy(() => import('./vis/glivenko-cantelli/index.jsx')),
    pages: [
      { path: 'empirical', label: 'Эмпирическая CDF' },
      { path: 'supremum', label: 'Что такое супремум' },
      { path: 'theorem', label: 'Теорема Гливенко–Кантелли' },
      { path: 'kolmogorov', label: 'Теорема Колмогорова' },
      { path: 'dkw', label: 'Неравенство DKW' },
    ],
  },
  {
    id: 'bayesian',
    title: 'Байесовская оценка',
    component: lazy(() => import('./vis/bayesian/index.jsx')),
    pages: [
      { path: 'intuition', label: 'Интуиция' },
      { path: 'beta', label: 'Бета-распределение' },
      { path: 'posterior', label: 'Posterior в деле' },
      { path: 'credible-interval', label: 'Достоверный интервал' },
      { path: 'mle-vs-map', label: 'MLE vs MAP' },
      { path: 'complex-hypothesis', label: 'Сложная гипотеза' },
      { path: 'freq-vs-bayes', label: 'Частотный vs Байесовский' },
      { path: 'history', label: 'История и контекст' },
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
