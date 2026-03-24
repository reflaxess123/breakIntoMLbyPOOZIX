import { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { VISUALIZATIONS } from '../App';
import { useRoadmapList } from './RoadmapViewer';

function ScrollToTop() {
  const [visible, setVisible] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        // Show button if scrolled down >400px AND scrolling up
        if (y > 400 && y < lastY.current - 30) {
          setVisible(true);
        } else if (y <= 100 || y > lastY.current + 10) {
          setVisible(false);
        }
        lastY.current = y;
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-6 right-4 z-40 md:hidden w-11 h-11 rounded-full bg-accent text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform"
      aria-label="Наверх"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 15l-6-6-6 6" />
      </svg>
    </button>
  );
}

function SidebarContent({ onNavigate }) {
  const [roadmapsOpen, setRoadmapsOpen] = useState(false);
  const { files } = useRoadmapList();
  const location = useLocation();
  const isRoadmapActive = location.pathname.startsWith('/roadmaps');

  return (
    <>
      {/* Roadmaps — collapsible */}
      <div>
        <button
          onClick={() => setRoadmapsOpen(!roadmapsOpen)}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${
            isRoadmapActive
              ? 'text-accent font-medium'
              : 'text-text-dim hover:text-text hover:bg-bg'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider">Roadmaps</span>
            <span className="text-[10px] text-text-dim/60">({files.length})</span>
          </span>
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2"
            className={`transition-transform ${roadmapsOpen ? 'rotate-180' : ''}`}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {roadmapsOpen && (
          <div className="mt-1 space-y-0.5 ml-1">
            {files.map((f) => (
              <NavLink
                key={f.slug}
                to={`/roadmaps/${f.slug}`}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `block w-full text-left px-3 py-1.5 rounded-lg text-xs transition-all ${
                    isActive
                      ? 'bg-accent/10 text-accent font-medium'
                      : 'text-text-dim hover:text-text hover:bg-bg'
                  }`
                }
              >
                {f.title}
              </NavLink>
            ))}
          </div>
        )}
      </div>

      {/* Visualizations */}
      <div className="mt-3">
        <p className="px-3 pt-2 pb-1 text-[10px] font-semibold text-text-dim uppercase tracking-wider">
          Свалка
        </p>
        {VISUALIZATIONS.map((viz) => {
          const isVizActive = location.pathname.startsWith(`/vis/${viz.id}`);
          return (
            <div key={viz.id}>
              <NavLink
                to={`/vis/${viz.id}`}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `block w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                    isActive || isVizActive
                      ? 'bg-accent/10 text-accent font-medium'
                      : 'text-text-dim hover:text-text hover:bg-bg'
                  }`
                }
              >
                {viz.title}
              </NavLink>
              {/* Sub-pages when active */}
              {viz.pages && isVizActive && (
                <div className="ml-3 mt-0.5 space-y-0.5 border-l-2 border-accent/20 pl-2">
                  {viz.pages.map((page) => (
                    <NavLink
                      key={page.path}
                      to={`/vis/${viz.id}/${page.path}`}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        `block w-full text-left px-2 py-1.5 rounded-lg text-xs transition-all ${
                          isActive
                            ? 'text-accent font-medium'
                            : 'text-text-dim hover:text-text hover:bg-bg'
                        }`
                      }
                    >
                      {page.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

export function Layout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="min-h-screen bg-bg md:flex">
      <ScrollToTop />
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 bg-surface border-r border-border flex-col sticky top-0 h-screen">
        <div className="p-5 border-b border-border">
          <h1 className="text-base font-bold text-text tracking-tight">
            Тайная комната Пузикса
          </h1>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          <SidebarContent onNavigate={() => {}} />
        </nav>
      </aside>

      {/* Mobile: column layout (header on top, content below) */}
      <div className="flex flex-col md:hidden w-full">
        {/* Mobile header — not sticky, scrolls with content */}
        <div className="bg-surface border-b border-border flex items-center justify-between px-3 py-2">
          <h1 className="text-sm font-bold text-text">Тайная комната Пузикса</h1>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1.5 text-text-dim hover:text-text"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>
        </div>

        {/* Mobile content — minimal padding */}
        <main className="flex-1">
          <div className="max-w-6xl mx-auto px-0 py-2">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden bg-surface flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <h1 className="text-sm font-bold text-text">Тайная комната Пузикса</h1>
            <button onClick={closeMenu} className="p-1.5 text-text-dim hover:text-text">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
            <SidebarContent onNavigate={closeMenu} />
          </nav>
        </div>
      )}

      {/* Desktop content */}
      <main className="hidden md:block flex-1 min-w-0 overflow-x-hidden">
        <div className="max-w-6xl mx-auto px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
