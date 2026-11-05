import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Compass,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  MousePointerClick,
  Sparkles,
} from 'lucide-react';
import {
  useResearchStore,
  determineAssumptionQuadrant,
} from '../store/useResearchStore';
import {
  AssumptionCartesianMap,
  AssumptionMapNodeItem,
  ASSUMPTION_QUADRANT_INFO,
} from '../components/assumptions/AssumptionCartesianMap';
import {
  AssumptionCoordinate,
  getFindingCategoryBadgeStyle,
  getFindingCategoryLabel,
} from '../types';

export const AssumptionCanvasPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    projects,
    assumptionSessions,
    activeAssumptionSessionId,
    updateFindingCoordinates,
    completeAssumptionSession,
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

  const [activeFindingIndex, setActiveFindingIndex] = useState<number>(0);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(true);

  useEffect(() => {
    if (findings.length === 0) {
      setActiveFindingIndex(0);
      return;
    }
    const firstPendingIdx = findings.findIndex((f) => !f.coordinates);
    setActiveFindingIndex(firstPendingIdx >= 0 ? firstPendingIdx : 0);
  }, [activeSession?.id, findings.length]);

  const safeFindingIndex =
    findings.length > 0
      ? Math.max(0, Math.min(activeFindingIndex, findings.length - 1))
      : 0;

  const activeFinding =
    findings.length > 0 ? findings[safeFindingIndex] ?? null : null;

  const selectedFindingId = activeFinding?.id ?? null;

  const positionedCount = useMemo(
    () => findings.filter((f) => Boolean(f.coordinates)).length,
    [findings]
  );

  const totalFindings = findings.length;
  const allFindingsPositioned =
    totalFindings > 0 && positionedCount === totalFindings;

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

  // Guarda de navegación defensiva estricta
  if (
    !activeSession ||
    !currentProject ||
    findings.length === 0 ||
    !activeFinding
  ) {
    return <Navigate to="/assumptions/setup" replace />;
  }

  const handleSelectCoordinate = (coord: AssumptionCoordinate) => {
    if (!activeFinding) return;
    const currentId = activeFinding.id;
    updateFindingCoordinates(currentId, coord, activeSession.id);

    // Auto-avanzar al siguiente supuesto pendiente
    const total = findings.length;
    let nextPendingIndex = -1;
    for (let offset = 1; offset < total; offset++) {
      const candidateIdx = (safeFindingIndex + offset) % total;
      const candidate = findings[candidateIdx];
      if (candidate && candidate.id !== currentId && !candidate.coordinates) {
        nextPendingIndex = candidateIdx;
        break;
      }
    }

    if (nextPendingIndex >= 0) {
      setActiveFindingIndex(nextPendingIndex);
    }
  };

  const handleUpdateNodeCoordinate = (
    findingId: string,
    coord: AssumptionCoordinate
  ) => {
    updateFindingCoordinates(findingId, coord, activeSession.id);
  };

  const handleSelectNodeById = (findingId: string) => {
    const idx = findings.findIndex((f) => f.id === findingId);
    if (idx >= 0) {
      setActiveFindingIndex(idx);
    }
  };

  const handleFinishSession = () => {
    if (!allFindingsPositioned) return;
    completeAssumptionSession(activeSession.id);
    navigate('/assumptions/results');
  };

  const progressPercentage =
    totalFindings > 0 ? Math.round((positionedCount / totalFindings) * 100) : 0;

  const activeFindingCode =
    activeFinding.code ?? `S${String(safeFindingIndex + 1).padStart(2, '0')}`;

  return (
    <div className="space-y-5 pb-12">
      {/* Sticky Consensus Status Header */}
      <div className="sticky top-16 z-30 rounded-2xl border border-slate-200/90 bg-white/90 p-4 shadow-md backdrop-blur-md">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Left: Session Info */}
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/assumptions/setup')}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Setup
            </button>

            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-500/25">
                <Compass className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
                    {currentProject.name}
                  </span>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-500/20">
                    Consenso en Vivo
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                  {activeSession.title}
                </h2>
              </div>
            </div>
          </div>

          {/* Center: Progress Bar */}
          <div className="flex flex-1 max-w-md flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">
                {positionedCount}/{totalFindings} supuestos ubicados
              </span>
              <span className="font-mono font-bold text-indigo-600">
                {progressPercentage}%
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 ring-1 ring-inset ring-slate-200">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercentage}%` }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className={`h-full rounded-full ${
                  allFindingsPositioned
                    ? 'bg-emerald-500'
                    : 'bg-gradient-to-r from-indigo-600 to-indigo-500'
                }`}
              />
            </div>
          </div>

          {/* Right: Complete Session Button */}
          <div className="flex items-center justify-end">
            <button
              type="button"
              disabled={!allFindingsPositioned}
              onClick={handleFinishSession}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
            >
              <span>Generar Plan de Validación</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Collapsible Help Banner Explaining Axes (100% Conceptual) */}
      <div className="overflow-hidden rounded-2xl border border-indigo-200/80 bg-gradient-to-r from-indigo-50/90 via-white to-sky-50/80 shadow-sm">
        <button
          type="button"
          onClick={() => setIsHelpOpen((prev) => !prev)}
          className="flex w-full items-center justify-between px-5 py-3 text-left transition hover:bg-indigo-50/50"
        >
          <div className="flex items-center gap-2.5">
            <HelpCircle className="h-4 w-4 text-indigo-600 shrink-0" />
            <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-900">
              Eje Y: ¿Qué tan grave es si no lo resolvemos? | Eje X: ¿Tenemos datos reales o es un supuesto?
            </span>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600">
            {isHelpOpen ? (
              <>
                Ocultar <ChevronUp className="h-4 w-4" />
              </>
            ) : (
              <>
                Guía <ChevronDown className="h-4 w-4" />
              </>
            )}
          </span>
        </button>

        <AnimatePresence initial={false}>
          {isHelpOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t border-indigo-100/80 px-5 py-3"
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 text-xs text-slate-600">
                <div className="rounded-xl bg-white/90 p-3 border border-slate-200/70">
                  <span className="font-bold text-slate-900">
                    Eje Y (Riesgo de Negocio):
                  </span>{' '}
                  Impacto marginal abajo vs. riesgo crítico para el negocio arriba.
                </div>
                <div className="rounded-xl bg-white/90 p-3 border border-slate-200/70">
                  <span className="font-bold text-slate-900">
                    Eje X (Nivel de Evidencia):
                  </span>{' '}
                  Intuición o rumor a la izquierda vs. métricas y datos reales a la derecha.
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Split Workspace */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Left Column: Findings List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between px-1">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                Hallazgos y Supuestos ({positionedCount}/{totalFindings})
              </h3>
              <p className="text-xs text-slate-500">
                Haz clic o arrastra las tarjetas para ubicarlas en el cuadrante.
              </p>
            </div>
          </div>

          <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1 py-1">
            {findings.map((finding, index) => {
              const code =
                finding.code ?? `S${String(index + 1).padStart(2, '0')}`;
              const coord = finding.coordinates;
              const isPositioned = Boolean(coord);
              const isSelected = safeFindingIndex === index;
              const quadrant = coord
                ? determineAssumptionQuadrant(coord.x, coord.y)
                : null;

              let cardClasses =
                'border-slate-200/90 bg-white hover:border-indigo-300';
              if (isSelected && isPositioned) {
                cardClasses =
                  'border-2 border-indigo-600 bg-indigo-50/30 shadow-lg shadow-indigo-500/15 ring-4 ring-indigo-500/15';
              } else if (isSelected) {
                cardClasses =
                  'border-2 border-indigo-600 bg-white shadow-lg shadow-indigo-500/15 ring-4 ring-indigo-500/15';
              } else if (isPositioned) {
                cardClasses =
                  'border-2 border-emerald-500/70 bg-emerald-50/15 hover:border-emerald-600';
              }

              return (
                <motion.div
                  key={finding.id}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setActiveFindingIndex(index)}
                  className={`cursor-pointer rounded-2xl border p-4 transition-all ${cardClasses}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center justify-center rounded-lg px-2.5 py-1 font-mono text-xs font-bold ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                            : isPositioned
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {code}
                      </span>
                      <span
                        className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${getFindingCategoryBadgeStyle(
                          finding.category
                        )}`}
                      >
                        {getFindingCategoryLabel(finding.category)}
                      </span>
                    </div>

                    {isPositioned && quadrant ? (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${ASSUMPTION_QUADRANT_INFO[quadrant].badgeBg}`}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {ASSUMPTION_QUADRANT_INFO[quadrant].shortTitle}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 ring-1 ring-amber-500/25">
                        <Clock className="h-3 w-3 text-amber-500" />
                        Pendiente
                      </span>
                    )}
                  </div>

                  <h4 className="mt-2.5 text-sm font-bold text-slate-900">
                    {finding.title}
                  </h4>

                  {finding.description && (
                    <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                      {finding.description}
                    </p>
                  )}

                  {isSelected && (
                    <div className="mt-3 flex items-center justify-between border-t border-indigo-100 pt-2 text-[11px] font-semibold text-indigo-600">
                      <span className="inline-flex items-center gap-1">
                        <MousePointerClick className="h-3.5 w-3.5" />
                        {isPositioned
                          ? 'Haz clic o arrastra en el plano para reubicar'
                          : 'Haz clic en el cuadrante correspondiente para ubicarlo'}
                      </span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Interactive Assumption Cartesian Plane */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Mapa de Supuestos (Evidencia vs. Riesgo)
              </h3>
              <p className="text-xs text-slate-500">
                Ubica cada tarjeta según su nivel de certeza e impacto de negocio.
              </p>
            </div>

            {activeFinding && (
              <div className="inline-flex items-center gap-2 rounded-xl bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-900 ring-1 ring-indigo-500/20">
                <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                Activo: <span className="font-mono">{activeFindingCode}</span>
              </div>
            )}
          </div>

          <AssumptionCartesianMap
            nodes={mapNodes}
            selectedFindingId={selectedFindingId}
            selectedFindingCode={activeFindingCode}
            interactive={true}
            showCoordinates={false}
            onSelectCoordinate={handleSelectCoordinate}
            onUpdateNodeCoordinate={handleUpdateNodeCoordinate}
            onSelectNode={handleSelectNodeById}
          />
        </div>
      </div>
    </div>
  );
};
