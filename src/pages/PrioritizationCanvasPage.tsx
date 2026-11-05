import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Clock,
  ArrowRight,
  UserCheck,
  Sparkles,
  ArrowLeft,
  MousePointerClick,
} from 'lucide-react';
import { useResearchStore } from '../store/useResearchStore';
import {
  CartesianMap,
  MapNodeItem,
} from '../components/prioritization/CartesianMap';
import {
  Coordinate,
  getFindingCategoryBadgeStyle,
  getFindingCategoryLabel,
} from '../types';

export const PrioritizationCanvasPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    currentSession,
    setFindingPosition,
    nextParticipantTurn,
    calculateResults,
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

  // Extracción defensiva para evitar crasheos si el estado aún no se ha hidratado o está incompleto
  const participants = useMemo(
    () =>
      Array.isArray(currentSession?.participants)
        ? currentSession.participants.filter(Boolean)
        : [],
    [currentSession?.participants]
  );

  const findings = useMemo(
    () =>
      Array.isArray(currentSession?.findings)
        ? currentSession.findings.filter((f) => Boolean(f && f.id))
        : [],
    [currentSession?.findings]
  );

  const votes = useMemo(
    () =>
      Array.isArray(currentSession?.votes)
        ? currentSession.votes.filter(Boolean)
        : [],
    [currentSession?.votes]
  );

  const rawParticipantIndex =
    typeof currentSession?.currentParticipantIndex === 'number' &&
    !Number.isNaN(currentSession.currentParticipantIndex)
      ? currentSession.currentParticipantIndex
      : 0;

  const activeParticipantIndex =
    participants.length > 0
      ? Math.max(0, Math.min(rawParticipantIndex, participants.length - 1))
      : 0;

  const activeParticipant =
    participants.length > 0
      ? participants[activeParticipantIndex] ?? null
      : null;

  const currentParticipantPositions = useMemo(() => {
    if (!activeParticipant) return {};
    const voteObj = votes.find(
      (v) => v?.participantName === activeParticipant
    );
    return voteObj?.positions ?? {};
  }, [votes, activeParticipant]);

  const [activeFindingIndex, setActiveFindingIndex] = useState<number>(0);

  // Al cambiar de participante o hidratarse los hallazgos, enfocar el primer hallazgo pendiente
  useEffect(() => {
    if (findings.length === 0) {
      setActiveFindingIndex(0);
      return;
    }
    const firstPendingIdx = findings.findIndex(
      (f) => !currentParticipantPositions[f.id]
    );
    setActiveFindingIndex(firstPendingIdx >= 0 ? firstPendingIdx : 0);
  }, [activeParticipantIndex, findings.length]);

  const safeFindingIndex =
    findings.length > 0
      ? Math.max(0, Math.min(activeFindingIndex, findings.length - 1))
      : 0;

  const activeFinding =
    findings.length > 0 ? findings[safeFindingIndex] ?? null : null;

  const selectedFindingId = activeFinding?.id ?? null;

  const prioritizedCount = useMemo(() => {
    return findings.filter((f) => Boolean(currentParticipantPositions[f.id]))
      .length;
  }, [findings, currentParticipantPositions]);

  const totalFindings = findings.length;
  const allFindingsPrioritized =
    totalFindings > 0 && prioritizedCount === totalFindings;
  const isLastParticipant =
    participants.length > 0 &&
    activeParticipantIndex >= participants.length - 1;

  const mapNodes: MapNodeItem[] = useMemo(() => {
    return findings
      .filter((f) => Boolean(currentParticipantPositions[f.id]))
      .map((f) => ({
        id: f.id,
        code: f.code,
        title: f.title,
        category: f.category,
        coordinate: currentParticipantPositions[f.id],
        isSelected: f.id === selectedFindingId,
      }));
  }, [findings, currentParticipantPositions, selectedFindingId]);

  if (!hasHydrated) {
    return null;
  }

  // Guarda defensiva estricta: si no hay sesión válida, participantes o hallazgos, redirigir a Setup
  if (
    !currentSession ||
    participants.length === 0 ||
    findings.length === 0 ||
    !activeParticipant ||
    !activeFinding
  ) {
    return <Navigate to="/prioritization/setup" replace />;
  }

  const handleSelectCoordinate = (coordinate: Coordinate) => {
    if (!activeFinding || !activeParticipant) return;
    const currentId = activeFinding.id;
    setFindingPosition(activeParticipant, currentId, coordinate);

    // Auto-avanzar al siguiente hallazgo pendiente de este participante
    const total = findings.length;
    let nextPendingIndex = -1;
    for (let offset = 1; offset < total; offset++) {
      const candidateIdx = (safeFindingIndex + offset) % total;
      const candidate = findings[candidateIdx];
      if (
        candidate &&
        candidate.id !== currentId &&
        !currentParticipantPositions[candidate.id]
      ) {
        nextPendingIndex = candidateIdx;
        break;
      }
    }

    if (nextPendingIndex >= 0) {
      setActiveFindingIndex(nextPendingIndex);
    }
  };

  const handleSelectFindingById = (findingId: string) => {
    const idx = findings.findIndex((f) => f.id === findingId);
    if (idx >= 0) {
      setActiveFindingIndex(idx);
    }
  };

  const handleNextParticipantOrFinish = () => {
    if (!allFindingsPrioritized) return;

    if (!isLastParticipant) {
      nextParticipantTurn();
    } else {
      calculateResults();
      navigate('/prioritization/results');
    }
  };

  const progressPercentage =
    totalFindings > 0 ? Math.round((prioritizedCount / totalFindings) * 100) : 0;

  return (
    <div className="space-y-6 pb-10">
      {/* Turn Status Header */}
      <div className="sticky top-16 z-30 rounded-2xl border border-slate-200/90 bg-white/90 p-4 shadow-md backdrop-blur-md">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Left: Current Participant & Turn Indicator */}
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/prioritization/setup')}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Setup
            </button>

            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-500/25">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
                    Participante {activeParticipantIndex + 1} de{' '}
                    {participants.length}
                  </span>
                  <span className="rounded-full bg-indigo-50 px-2 py-0.5 font-mono text-[10px] font-bold text-indigo-700">
                    Votación Individual
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                  Turno de: {activeParticipant}
                </h2>
              </div>
            </div>
          </div>

          {/* Center: Progress X/Y hallazgos priorizados */}
          <div className="flex flex-1 max-w-md flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">
                {prioritizedCount}/{totalFindings} hallazgos priorizados
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
                  allFindingsPrioritized
                    ? 'bg-emerald-500'
                    : 'bg-gradient-to-r from-indigo-600 to-indigo-500'
                }`}
              />
            </div>
          </div>

          {/* Right: Siguiente participante Button */}
          <div className="flex items-center justify-end">
            <button
              type="button"
              disabled={!allFindingsPrioritized}
              onClick={handleNextParticipantOrFinish}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
            >
              <span>
                {isLastParticipant
                  ? 'Finalizar y Ver Resultados'
                  : 'Siguiente participante'}
              </span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Split Workspace: Left Column (Findings List) + Right Column (Cartesian Map) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Left Column: Findings Cards List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between px-1">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                Hallazgos por posicionar
              </h3>
              <p className="text-xs text-slate-500">
                Haz clic en el plano para ubicar cada tarjeta en orden.
              </p>
            </div>
          </div>

          <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1 py-1">
            {findings.map((finding, idx) => {
              const coord = currentParticipantPositions[finding.id];
              const isPositioned = Boolean(coord);
              const isSelected = safeFindingIndex === idx;

              let cardClasses =
                'border-slate-200/90 bg-white hover:border-amber-300';
              if (isSelected && isPositioned) {
                cardClasses =
                  'border-2 border-indigo-600 bg-indigo-50/30 shadow-lg shadow-indigo-500/15 ring-4 ring-indigo-500/15';
              } else if (isSelected) {
                cardClasses =
                  'border-2 border-indigo-600 bg-white shadow-lg shadow-indigo-500/15 ring-4 ring-indigo-500/15';
              } else if (isPositioned) {
                cardClasses =
                  'border-2 border-emerald-500/80 bg-emerald-50/20 hover:border-emerald-600';
              }

              return (
                <motion.div
                  key={finding.id}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setActiveFindingIndex(idx)}
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
                        {finding.code}
                      </span>
                      <span
                        className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${getFindingCategoryBadgeStyle(
                          finding.category
                        )}`}
                      >
                        {getFindingCategoryLabel(finding.category)}
                      </span>
                    </div>

                    {/* State Badge */}
                    {isPositioned && coord ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100/90 px-2.5 py-0.5 font-mono text-[11px] font-bold text-emerald-800 ring-1 ring-emerald-500/30">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        R: {Number(coord.relevance ?? 0).toFixed(2)} | F:{' '}
                        {Number(coord.feasibility ?? 0).toFixed(2)}
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
                          ? 'Haz clic en el plano para reubicar este hallazgo'
                          : 'Haz clic en el plano para ubicar y avanzar al siguiente'}
                      </span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Interactive Cartesian Plane */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Matriz Cartesiana de Priorización
              </h3>
              <p className="text-xs text-slate-500">
                Evalúa cada hallazgo según su Relevancia y Factibilidad.
              </p>
            </div>

            {activeFinding && (
              <div className="inline-flex items-center gap-2 rounded-xl bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-900 ring-1 ring-indigo-500/20">
                <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                Activo: <span className="font-mono">{activeFinding.code}</span>
              </div>
            )}
          </div>

          <CartesianMap
            key={`turn-canvas-${activeParticipantIndex}`}
            nodes={mapNodes}
            selectedFindingId={selectedFindingId}
            selectedFindingCode={activeFinding?.code ?? null}
            interactive={true}
            showCoordinates={true}
            onSelectCoordinate={handleSelectCoordinate}
            onSelectNode={handleSelectFindingById}
          />
        </div>
      </div>
    </div>
  );
};
