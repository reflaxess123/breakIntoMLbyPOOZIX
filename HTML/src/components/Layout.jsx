import { NavLink } from 'react-router-dom';
import { VISUALIZATIONS } from '../App';

export function Layout({ children }) {
  return (
    <div className="min-h-screen bg-bg flex">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 bg-surface border-r border-border flex flex-col sticky top-0 h-screen">
        <div className="p-5 border-b border-border">
          <h1 className="text-base font-bold text-text tracking-tight">
            Тайная комната Пузикса
          </h1>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {VISUALIZATIONS.map((viz) => (
            <NavLink
              key={viz.id}
              to={`/vis/${viz.id}`}
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
          ))}
        </nav>

        <div className="p-4 border-t border-border" />
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
