import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Sparkles, Grid, Compass, LayoutDashboard } from 'lucide-react';

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const isPrioritizationActive = location.pathname.startsWith('/prioritization');
  const isAssumptionsActive = location.pathname.startsWith('/assumptions');
  const isHomeActive = location.pathname === '/';

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900 relative overflow-x-hidden">
      {/* Subtle Ambient Background Mesh */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      >
        <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute top-1/3 -right-32 h-96 w-96 rounded-full bg-emerald-500/5 blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 h-80 w-80 rounded-full bg-violet-500/5 blur-3xl" />
      </div>

      {/* Fixed Minimalist Glassmorphism Header */}
      <header className="sticky top-0 z-40 h-16 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="group flex items-center gap-3.5 focus:outline-none"
          >
            {/* Geometric Logo */}
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm shadow-indigo-500/20 transition-transform duration-200 group-hover:scale-105">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 opacity-90" />
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="relative z-10 h-5 w-5 text-white"
                stroke="currentColor"
                strokeWidth="2.2"
              >
                <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
                <line x1="12" y1="22" x2="12" y2="15.5" />
                <polyline points="22 8.5 12 15.5 2 8.5" />
                <circle cx="12" cy="9" r="1.5" fill="currentColor" />
              </svg>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-widest text-indigo-600">
                  DataCorp Research Hub
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 ring-1 ring-inset ring-indigo-500/20">
                  <Sparkles className="h-2.5 w-2.5" /> v2.7
                </span>
              </div>
              <h1 className="hidden sm:block text-sm sm:text-base font-bold tracking-tight text-slate-900">
                Herramientas de investigación y validación de Insights
              </h1>
            </div>
          </Link>

          {/* Header Navigation Menu */}
          <nav className="flex items-center gap-1.5 sm:gap-2">
            <Link
              to="/"
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${
                isHomeActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Inicio</span>
            </Link>

            <Link
              to="/prioritization/setup"
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${
                isPrioritizationActive
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/25'
                  : 'border border-slate-200/80 bg-white text-slate-700 hover:border-indigo-300 hover:text-indigo-600'
              }`}
            >
              <Grid className="h-3.5 w-3.5" />
              <span>Matriz de Priorización</span>
            </Link>

            <Link
              to="/assumptions/setup"
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${
                isAssumptionsActive
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/25'
                  : 'border border-slate-200/80 bg-white text-slate-700 hover:border-indigo-300 hover:text-indigo-600'
              }`}
            >
              <Compass className="h-3.5 w-3.5" />
              <span>Mapa de Supuestos</span>
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="h-full">
          <Outlet />
        </div>
      </main>

      {/* Minimalist Footer */}
      <footer className="relative z-10 border-t border-slate-200/70 bg-white/60 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="font-semibold text-slate-700">DataCorp 2026</span>
            <span className="text-slate-300">•</span>
            <span>Quantitative UX & Insight Validation Engine</span>
          </div>
          <div className="font-mono text-[11px] text-slate-400">
            DataCorp Research Methodology Suite
          </div>
        </div>
      </footer>
    </div>
  );
};
