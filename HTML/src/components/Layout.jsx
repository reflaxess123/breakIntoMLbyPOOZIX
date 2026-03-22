import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { VISUALIZATIONS } from '../App';
import { useRoadmapList } from './RoadmapViewer';

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
    <div className="min-h-screen bg-bg flex">
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
        <div className="p-4 border-t border-border" />
      </aside>

      {/* Mobile header */}
      <div className="fixed top-0 left-0 right-0 z-50 md:hidden bg-surface border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-sm font-bold text-text">Тайная комната Пузикса</h1>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 -mr-2 text-text-dim hover:text-text"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {menuOpen ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <path d="M3 12h18M3 6h18M3 18h18" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={closeMenu} />
          <div className="absolute inset-0 bg-surface flex flex-col">
            <div className="pt-20 px-4 pb-4 flex-1 overflow-y-auto">
              <nav className="space-y-0.5">
                <SidebarContent onNavigate={closeMenu} />
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 pt-20 md:pt-8">
          {children}
        </div>
      </main>
    </div>
  );
}
