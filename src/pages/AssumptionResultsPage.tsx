import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Compass,
  Search,
  Rocket,
  CalendarClock,
  Archive,
  RotateCcw,
  Edit3,
  Tag,
  Sparkles,
} from 'lucide-react';
import {
  useResearchStore,
  determineAssumptionQuadrant,
} from '../store/useResearchStore';
import {
  AssumptionCartesianMap,
  AssumptionMapNodeItem,
} from '../components/assumptions/AssumptionCartesianMap';
import {
  AssumptionQuadrantType,
  getFindingCategoryBadgeStyle,
  getFindingCategoryLabel,
} from '../types';

interface ActionQuadrantMeta {
  key: AssumptionQuadrantType;
  title: string;
  ruleLabel: string;
  suggestedAction: string;
  description: string;
  icon: React.ElementType;
  badgeClass: string;
  cardBorderClass: string;
  headerBgClass: string;
  iconBgClass: string;
  actionPillClass: string;
}

const ACTION_QUADRANT_CONFIG: Record<
  AssumptionQuadrantType,
  ActionQuadrantMeta
> = {
  investigate: {
    key: 'investigate',
    title: '1. Investigar Urgente',
    ruleLabel: 'Riesgo Alto • Evidencia Baja',
    suggestedAction: 'Entrevistas / Data Discovery',
    description:
      'Hipótesis críticas sin respaldo empírico; priorizar experimentos antes de desarrollar.',
    icon: Search,
    badgeClass:
      'bg-rose-100 text-rose-900 ring-1 ring-inset ring-rose-500/40',
    cardBorderClass: 'border-rose-300/90 bg-rose-50/20',
    headerBgClass: 'bg-gradient-to-r from-rose-500/15 to-transparent',
    iconBgClass: 'bg-rose-600 text-white shadow-sm shadow-rose-500/30',
    actionPillClass:
      'bg-rose-50 text-rose-800 border border-rose-200/80 font-bold',
  },
  execute: {
    key: 'execute',
    title: '2. Ejecutar (Directo a Backlog)',
    ruleLabel: 'Riesgo Alto • Evidencia Alta',
    suggestedAction: 'Especificación técnica / Diseño',
    description:
      'Hallazgos validados con datos sólidos y alto impacto, listos para diseño e implementación.',
    icon: Rocket,
    badgeClass:
      'bg-emerald-100 text-emerald-900 ring-1 ring-inset ring-emerald-500/40',
    cardBorderClass: 'border-emerald-300/90 bg-emerald-50/20',
    headerBgClass: 'bg-gradient-to-r from-emerald-500/15 to-transparent',
    iconBgClass: 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/30',
    actionPillClass:
      'bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-bold',
  },
  secondary: {
    key: 'secondary',
    title: '3. Seguimiento Secundario',
    ruleLabel: 'Riesgo Bajo • Evidencia Alta',
    suggestedAction: 'Backlog de mejoras',
    description:
      'Certezas comprobadas de impacto moderado para planificar en iteraciones futuras.',
    icon: CalendarClock,
    badgeClass:
      'bg-sky-100 text-sky-900 ring-1 ring-inset ring-sky-500/40',
    cardBorderClass: 'border-sky-300/90 bg-sky-50/20',
    headerBgClass:
      'bg-gradient-to-r from-sky-500/15 via-amber-500/5 to-transparent',
    iconBgClass: 'bg-sky-600 text-white shadow-sm shadow-sky-500/30',
    actionPillClass:
      'bg-sky-50 text-sky-800 border border-sky-200/80 font-bold',
  },
  discard: {
    key: 'discard',
    title: '4. Descartar',
    ruleLabel: 'Riesgo Bajo • Evidencia Baja',
    suggestedAction: 'Archivar',
    description:
      'Supuestos sin evidencia y de bajo impacto; evitar invertir esfuerzo técnico.',
    icon: Archive,
    badgeClass:
      'bg-slate-200 text-slate-800 ring-1 ring-inset ring-slate-400/40',
    cardBorderClass: 'border-slate-300/90 bg-slate-50/40',
    headerBgClass: 'bg-gradient-to-r from-slate-500/15 to-transparent',
    iconBgClass: 'bg-slate-600 text-white shadow-sm shadow-slate-500/30',
    actionPillClass:
      'bg-slate-100 text-slate-700 border border-slate-200/90 font-bold',
  },
};

export const AssumptionResultsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    projects,
    assumptionSessions,
    activeAssumptionSessionId,
    setActiveAssumptionSession,
  } = useResearchStore();

  const [hasHydrated, setHasHydrated] = useState<boolean>(() =>
    useResearchStore.persist?.hasHydrated
      ? useResearchStore.persist.hasHydrated()
      : true
  );

  useEffect(() => {
    const unsub = useResearchStore.persist?.onFinishHydration?.(() => {
      setHasHydrated(true);
    });
    setHasHydrated(true);
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(
    null
  );

  const safeProjects = useMemo(
    () => (Array.isArray(projects) ? projects.filter(Boolean) : []),
    [projects]
  );

  const safeSessions = useMemo(
    () =>
      Array.isArray(assumptionSessions)
        ? assumptionSessions.filter(Boolean)
        : [],
    [assumptionSessions]
  );

  const activeSession = useMemo(
    () =>
      safeSessions.find((s) => s.id === activeAssumptionSessionId) ??
      safeSessions[0] ??
      null,
    [safeSessions, activeAssumptionSessionId]
  );

  const currentProject = useMemo(() => {
    if (!activeSession?.projectId) return safeProjects[0] ?? null;
    return (
      safeProjects.find((p) => p.id === activeSession.projectId) ??
      safeProjects[0] ??
      null
    );
  }, [safeProjects, activeSession?.projectId]);

  const findings = useMemo(
    () =>
      Array.isArray(activeSession?.findings)
        ? activeSession!.findings.filter((f) => Boolean(f && f.id))
        : [],
    [activeSession]
  );

  const mapNodes: AssumptionMapNodeItem[] = useMemo(() => {
    return findings
      .map((f, index) => {
        if (!f.coordinates) return null;
        return {
          id: f.id,
          code: f.code ?? `S${String(index + 1).padStart(2, '0')}`,
          title: f.title,
          category: f.category,
          coordinates: f.coordinates,
          isSelected: f.id === selectedFindingId,
        };
      })
      .filter(Boolean) as AssumptionMapNodeItem[];
  }, [findings, selectedFindingId]);

  if (!hasHydrated) {
    return null;
  }

  // Guarda de navegación defensiva
  if (!activeSession || !currentProject || findings.length === 0) {
    return <Navigate to="/assumptions/setup" replace />;
  }

  const quadrantOrder: AssumptionQuadrantType[] = [
    'investigate',
    'execute',
    'secondary',
    'discard',
  ];

  return (
    <div className="space-y-10 pb-20">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/90 pb-6">
        <div>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 transition hover:text-indigo-600 mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver al Dashboard
          </button>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Plan de Validación — {activeSession.title}
            </h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-bold text-emerald-800">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              Sesión Guardada
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Proyecto:{' '}
            <span className="font-semibold text-slate-700">
              {currentProject.name}
            </span>{' '}
            • {findings.length}{' '}
            {findings.length === 1 ? 'supuesto evaluado' : 'supuestos evaluados'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start">
          <button
            type="button"
            onClick={() => navigate('/assumptions/canvas')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <Edit3 className="h-3.5 w-3.5 text-indigo-600" />
            Ajustar en el lienzo
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveAssumptionSession(null);
              navigate('/assumptions/setup');
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-500"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Nuevo Mapa de Supuestos
          </button>
        </div>
      </div>

      {/* Read-Only Assumption Cartesian Map Section */}
      <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Mapa Consolidado de Supuestos
              </h3>
              <p className="text-xs text-slate-500">
                Haz clic en cualquier nodo del plano para destacar su tarjeta de acción.
              </p>
            </div>
          </div>

          <span className="rounded-lg bg-slate-100 px-3 py-1 font-mono text-xs font-bold text-slate-700">
            Solo Lectura
          </span>
        </div>

        <AssumptionCartesianMap
          nodes={mapNodes}
          selectedFindingId={selectedFindingId}
          interactive={false}
          showCoordinates={false}
          onSelectNode={(id) =>
            setSelectedFindingId((prev) => (prev === id ? null : id))
          }
        />
      </section>

      {/* Bottom Output Board: 4 Action Cards Grouped by Final Coordinate */}
      <section className="space-y-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700 mb-2">
              <Sparkles className="h-3 w-3" />
              Hoja de Ruta Accionable
            </div>
            <h3 className="text-xl font-extrabold text-slate-900">
              Tablero de Salida — Action Cards
            </h3>
            <p className="text-xs sm:text-sm text-slate-500">
              Supuestos agrupados por cuadrante con su siguiente paso metodológico recomendado.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {quadrantOrder.map((qKey) => {
            const meta = ACTION_QUADRANT_CONFIG[qKey];
            const Icon = meta.icon;

            const itemsInQuadrant = findings
              .map((f, index) => ({
                finding: f,
                code: f.code ?? `S${String(index + 1).padStart(2, '0')}`,
                quadrant: determineAssumptionQuadrant(
                  Number(f.coordinates?.x ?? 0),
                  Number(f.coordinates?.y ?? 0)
                ),
              }))
              .filter((item) => item.quadrant === qKey);

            return (
              <div
                key={qKey}
                className={`flex flex-col justify-between overflow-hidden rounded-2xl border ${meta.cardBorderClass} bg-white shadow-sm`}
              >
                <div>
                  {/* Card Header */}
                  <div
                    className={`border-b border-slate-200/70 px-5 py-4 ${meta.headerBgClass}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.iconBgClass}`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-base font-extrabold text-slate-900">
                            {meta.title}
                          </h4>
                          <p className="text-xs font-semibold text-slate-500">
                            {meta.ruleLabel}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 font-mono text-xs font-bold ${meta.badgeClass}`}
                      >
                        {itemsInQuadrant.length}{' '}
                        {itemsInQuadrant.length === 1 ? 'hallazgo' : 'hallazgos'}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/50">
                      <span className="text-[11px] font-semibold text-slate-600">
                        Acción sugerida:
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs ${meta.actionPillClass}`}
                      >
                        {meta.suggestedAction}
                      </span>
                    </div>
                  </div>

                  {/* Findings List inside Quadrant */}
                  <div className="p-4">
                    <p className="mb-3 text-xs text-slate-500">
                      {meta.description}
                    </p>

                    {itemsInQuadrant.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-8 text-center text-xs text-slate-400">
                        Ningún supuesto ubicado en este cuadrante.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {itemsInQuadrant.map(({ finding, code }) => {
                          const isSelected = selectedFindingId === finding.id;

                          return (
                            <div
                              key={finding.id}
                              onClick={() =>
                                setSelectedFindingId((prev) =>
                                  prev === finding.id ? null : finding.id
                                )
                              }
                              className={`cursor-pointer rounded-xl border p-3.5 transition ${
                                isSelected
                                  ? 'border-indigo-500 bg-indigo-50/40 ring-2 ring-indigo-500/20'
                                  : 'border-slate-200/80 bg-slate-50/70 hover:border-slate-300 hover:bg-white'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-2.5 min-w-0">
                                  <span className="mt-0.5 rounded-lg bg-slate-900 px-2 py-0.5 font-mono text-xs font-bold text-white">
                                    {code}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                                      {finding.title}
                                    </p>
                                    {finding.description && (
                                      <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                                        {finding.description}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <span
                                  className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${getFindingCategoryBadgeStyle(
                                    finding.category
                                  )}`}
                                >
                                  <Tag className="h-2.5 w-2.5" />
                                  {getFindingCategoryLabel(finding.category)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
