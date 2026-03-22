import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { VISUALIZATIONS } from '../App';

export function Layout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = VISUALIZATIONS.map((viz) => (
    <NavLink
      key={viz.id}
      to={`/vis/${viz.id}`}
      onClick={() => setMenuOpen(false)}
      className={({ isActive }) =>
        `block w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all ${
          isActive
            ? 'bg-accent/10 text-accent font-medium'
            : 'text-text-dim hover:text-text hover:bg-bg'
        }`
      }
    >
      {viz.title}
    </NavLink>
  ));

  return (
    <div className="min-h-screen bg-bg flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 bg-surface border-r border-border flex-col sticky top-0 h-screen">
        <div className="p-5 border-b border-border">
          <h1 className="text-base font-bold text-text tracking-tight">
            Тайная комната Пузикса
          </h1>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navLinks}
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
          <div className="absolute inset-0 bg-black/30" onClick={() => setMenuOpen(false)} />
          <div className="absolute inset-0 bg-surface flex flex-col">
            <div className="pt-20 px-4 pb-4 flex-1 overflow-y-auto">
              <nav className="space-y-1">
                {navLinks}
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
