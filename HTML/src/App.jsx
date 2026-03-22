import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';

// ── Visualization registry ──────────────────────────────────────
// To add a new visualization:
//   1. Create src/vis/<slug>/index.jsx  (export default component)
//   2. Add an entry below
export const VISUALIZATIONS = [
  {
    id: 'hypothesis-testing',
    title: 'Проверка гипотез: Игровой автомат',
    component: lazy(() => import('./vis/hypothesis-testing/index.jsx')),
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
          {/* Root → redirect to first viz */}
          <Route index element={<Navigate to={`/vis/${VISUALIZATIONS[0].id}`} replace />} />

          {/* Each visualization gets /vis/<slug> and /vis/<slug>/:step */}
          {VISUALIZATIONS.map((viz) => (
            <Route
              key={viz.id}
              path={`/vis/${viz.id}/*`}
              element={<viz.component />}
            />
          ))}

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}

export default App;
