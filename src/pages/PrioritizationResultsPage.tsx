import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Wrench,
  Clock,
  Trash2,
  Save,
  ArrowLeft,
  Table,
  BarChart3,
  FolderPlus,
  CheckCircle2,
  X,
  RotateCcw,
} from 'lucide-react';
import {
  useResearchStore,
  determineQuadrant,
} from '../store/useResearchStore';
import {
  CartesianMap,
  MapNodeItem,
} from '../components/prioritization/CartesianMap';
import {
  QuadrantType,
  getFindingCategoryBadgeStyle,
  getFindingCategoryLabel,
} from '../types';

interface QuadrantMeta {
  key: QuadrantType;
  title: string;
  subtitle: string;
  ruleLabel: string;
  icon: React.ElementType;
  badgeClass: string;
  cardBorderClass: string;
  headerBgClass: string;
  iconBgClass: string;
}

const QUADRANT_CONFIG: Record<QuadrantType, QuadrantMeta> = {
  quick_win: {
    key: 'quick_win',
    title: 'Quick win - Máxima prioridad',
    subtitle: 'Alta Relevancia y Alta Factibilidad',
    ruleLabel: 'R ≥ 0, F ≥ 0',
    icon: Trophy,
    badgeClass:
      'bg-amber-100 text-amber-900 ring-1 ring-inset ring-amber-500/40',
    cardBorderClass: 'border-amber-300/90 bg-amber-50/30',
    headerBgClass: 'bg-gradient-to-r from-amber-500/15 to-yellow-500/5',
    iconBgClass: 'bg-amber-400 text-slate-950 shadow-sm shadow-amber-500/30',
  },
  strategic: {
    key: 'strategic',
    title: 'Estratégico - Deuda técnica',
    subtitle: 'Menor Relevancia Directa y Alta Factibilidad',
    ruleLabel: 'R < 0, F ≥ 0',
    icon: Wrench,
    badgeClass:
      'bg-orange-100 text-orange-900 ring-1 ring-inset ring-orange-500/30',
    cardBorderClass: 'border-orange-300/90 bg-orange-50/25',
    headerBgClass: 'bg-gradient-to-r from-orange-500/15 to-transparent',
    iconBgClass: 'bg-orange-500 text-white shadow-sm shadow-orange-500/30',
  },
  operational_fill: {
    key: 'operational_fill',
    title: 'Bajo impacto - Relleno operativo',
    subtitle: 'Alta Relevancia y Baja Factibilidad Técnica',
    ruleLabel: 'R ≥ 0, F < 0',
    icon: Clock,
    badgeClass:
      'bg-amber-100/80 text-amber-800 ring-1 ring-inset ring-amber-600/30',
    cardBorderClass: 'border-amber-300/80 bg-amber-50/20',
    headerBgClass: 'bg-gradient-to-r from-amber-600/15 to-transparent',
    iconBgClass: 'bg-amber-600 text-white shadow-sm shadow-amber-600/30',
  },
  discard: {
    key: 'discard',
    title: 'Baja prioridad - Descartar',
    subtitle: 'Baja Relevancia y Baja Factibilidad',
    ruleLabel: 'R < 0, F < 0',
    icon: Trash2,
    badgeClass:
      'bg-violet-100 text-violet-900 ring-1 ring-inset ring-violet-500/30',
    cardBorderClass: 'border-violet-300/90 bg-violet-50/25',
    headerBgClass: 'bg-gradient-to-r from-violet-500/15 to-transparent',
    iconBgClass: 'bg-violet-600 text-white shadow-sm shadow-violet-500/30',
  },
};

export const PrioritizationResultsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    projects,
    currentSession,
    calculateResults,
    addProject,
    addActivityToProject,
    resetSession,
  } = useResearchStore();

  const safeProjects = Array.isArray(projects) ? projects : [];
  const participants = Array.isArray(currentSession?.participants)
    ? currentSession.participants
    : [];
  const findings = Array.isArray(currentSession?.findings)
    ? currentSession.findings
    : [];
  const votes = Array.isArray(currentSession?.votes)
    ? currentSession.votes
    : [];
  const results = Array.isArray(currentSession?.results)
    ? currentSession.results
    : [];

  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(
    null
  );
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [activityName, setActivityName] = useState(
    `Matriz de Priorización (${new Date().toLocaleDateString('es-ES')})`
  );
  const [saveMode, setSaveMode] = useState<'existing' | 'new'>(
    safeProjects.length > 0 ? 'existing' : 'new'
  );
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    currentSession?.projectId || safeProjects[0]?.id || ''
  );
  const [newProjectName, setNewProjectName] = useState('');

  useEffect(() => {
    if (safeProjects.length === 0) {
      setSaveMode('new');
    } else if (currentSession?.projectId) {
      setSelectedProjectId(currentSession.projectId);
    } else if (!selectedProjectId && safeProjects[0]?.id) {
      setSelectedProjectId(safeProjects[0].id);
    }
  }, [safeProjects, selectedProjectId, currentSession?.projectId]);

  // Asegurar que los promedios estén calculados al montar la vista
  useEffect(() => {
    if (findings.length > 0 && participants.length > 0) {
      calculateResults();
    }
  }, [findings.length, participants.length, calculateResults]);

  const computedResults = useMemo(() => {
    if (results.length === findings.length && results.length > 0) {
      return results;
    }
    const pCount = Math.max(1, participants.length);
    return findings.map((f) => {
      let sumR = 0;
      let sumF = 0;
      participants.forEach((pName) => {
        const vote = votes.find((v) => v?.participantName === pName);
        const pos = vote?.positions?.[f.id];
        if (pos) {
          sumR += Number(pos.relevance ?? 0);
          sumF += Number(pos.feasibility ?? 0);
        }
      });
      const avgRelevance = Math.round((sumR / pCount) * 100) / 100;
      const avgFeasibility = Math.round((sumF / pCount) * 100) / 100;
      return {
        findingId: f.id,
        avgRelevance,
        avgFeasibility,
        quadrant: determineQuadrant(avgRelevance, avgFeasibility),
      };
    });
  }, [results, findings, participants, votes]);

  const mapNodes: MapNodeItem[] = useMemo(() => {
    return computedResults
      .map((res) => {
        const finding = findings.find((f) => f.id === res.findingId);
        if (!finding) return null;
        return {
          id: finding.id,
          code: finding.code,
          title: finding.title,
          category: finding.category,
          coordinate: {
            relevance: res.avgRelevance,
            feasibility: res.avgFeasibility,
          },
          quadrant: res.quadrant,
          isSelected: selectedFindingId === finding.id,
        };
      })
      .filter(Boolean) as MapNodeItem[];
  }, [computedResults, findings, selectedFindingId]);

  if (!currentSession || findings.length === 0 || participants.length === 0) {
    return <Navigate to="/" replace />;
  }

  const handleSaveActivitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityName.trim()) return;

    let targetProjectId = selectedProjectId;

    if (saveMode === 'new' || safeProjects.length === 0) {
      if (!newProjectName.trim()) return;
      const createdProj = addProject(newProjectName);
      targetProjectId = createdProj.id;
    }

    if (!targetProjectId) return;

    addActivityToProject(targetProjectId, activityName, {
      participants,
      findings,
      votes,
      results: computedResults,
    });

    setIsSaveModalOpen(false);
    resetSession();
    navigate(`/project/${targetProjectId}`);
  };

  const quadrantOrder: QuadrantType[] = [
    'quick_win',
    'strategic',
    'operational_fill',
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
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Resultados Consolidados de Priorización
            </h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-bold text-emerald-800">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              Cálculo Completado
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Promedios aritméticos calculados sobre {participants.length}{' '}
            {participants.length === 1 ? 'participante' : 'participantes'} y{' '}
            {findings.length} {findings.length === 1 ? 'hallazgo' : 'hallazgos'}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start">
          <button
            type="button"
            onClick={() => {
              resetSession();
              navigate('/prioritization/setup');
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Nueva sesión
          </button>

          <button
            type="button"
            onClick={() => setIsSaveModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-500"
          >
            <Save className="h-4 w-4" />
            Guardar actividad
          </button>
        </div>
      </div>

      {/* Top Section: Final Cartesian Map + Grouped Quadrant Cards */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
        {/* Final Consolidated Cartesian Plane */}
        <div className="lg:col-span-6 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Mapa Cartesiano Promedio
              </h3>
              <p className="text-xs text-slate-500">
                Ubicación exacta del centroide <code className="font-mono">(R̄, F̄)</code> de cada hallazgo
              </p>
            </div>
            <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-[11px] font-bold text-slate-700">
              Vista Consolidada
            </span>
          </div>

          <CartesianMap
            nodes={mapNodes}
            selectedFindingId={selectedFindingId}
            interactive={false}
            onSelectNode={(id) =>
              setSelectedFindingId((prev) => (prev === id ? null : id))
            }
          />
        </div>

        {/* Grouped Findings by Quadrant */}
        <div className="lg:col-span-6 space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Clasificación Estratégica por Cuadrantes
            </h3>
            <p className="text-xs text-slate-500">
              Hallazgos agrupados automáticamente según su coordenada promedio.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {quadrantOrder.map((qKey) => {
              const meta = QUADRANT_CONFIG[qKey];
              const Icon = meta.icon;
              const itemsInQuadrant = computedResults
                .filter((r) => r.quadrant === qKey)
                .map((r) => ({
                  result: r,
                  finding: findings.find((f) => f.id === r.findingId)!,
                }))
                .filter((item) => Boolean(item.finding));

              return (
                <div
                  key={qKey}
                  className={`overflow-hidden rounded-2xl border ${meta.cardBorderClass} bg-white shadow-sm`}
                >
                  <div
                    className={`flex items-center justify-between border-b border-slate-200/60 px-4 py-3 ${meta.headerBgClass}`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-xl ${meta.iconBgClass}`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-900">
                          {meta.title}
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          {meta.subtitle} •{' '}
                          <span className="font-mono font-semibold">
                            {meta.ruleLabel}
                          </span>
                        </p>
                      </div>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-0.5 font-mono text-xs font-bold ${meta.badgeClass}`}
                    >
                      {itemsInQuadrant.length}
                    </span>
                  </div>

                  <div className="p-3">
                    {itemsInQuadrant.length === 0 ? (
                      <p className="py-3 text-center text-xs text-slate-400">
                        Ningún hallazgo clasificado en este cuadrante.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {itemsInQuadrant.map(({ finding, result }) => (
                          <div
                            key={finding.id}
                            onClick={() =>
                              setSelectedFindingId((prev) =>
                                prev === finding.id ? null : finding.id
                              )
                            }
                            className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 transition ${
                              selectedFindingId === finding.id
                                ? 'border-indigo-500 bg-indigo-50/40 ring-2 ring-indigo-500/20'
                                : 'border-slate-100 bg-slate-50/70 hover:border-slate-300 hover:bg-white'
                            }`}
                          >
                            <div className="flex items-start gap-2.5 min-w-0">
                              <span className="mt-0.5 rounded-lg bg-slate-900 px-2 py-0.5 font-mono text-xs font-bold text-white">
                                {finding.code}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate text-xs sm:text-sm font-bold text-slate-900">
                                  {finding.title}
                                </p>
                                <span className="text-[11px] font-medium text-slate-500">
                                  {getFindingCategoryLabel(finding.category)}
                                </span>
                              </div>
                            </div>

                            <div className="flex shrink-0 items-center gap-2 font-mono text-xs">
                              <span className="rounded-md bg-white px-2 py-1 font-bold text-slate-700 border border-slate-200/80">
                                R: {Number(result.avgRelevance ?? 0).toFixed(2)}
                              </span>
                              <span className="rounded-md bg-white px-2 py-1 font-bold text-slate-700 border border-slate-200/80">
                                F: {Number(result.avgFeasibility ?? 0).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Summary Table 1: Resultado votaciones por usuario (Horizontal Scroll) */}
      <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Table className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Resultado votaciones por usuario
              </h3>
              <p className="text-xs text-slate-500">
                Matriz detallada de coordenadas individuales <code className="font-mono">(Relevancia, Factibilidad)</code> asignadas por cada participante.
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200/80">
          <table className="w-full min-w-[680px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <th className="sticky left-0 z-10 bg-slate-50 px-4 py-3.5 border-r border-slate-200">
                  Participante
                </th>
                {findings.map((finding) => (
                  <th
                    key={finding.id}
                    className="px-4 py-3.5 text-center font-mono"
                    title={finding.title}
                  >
                    <div className="flex flex-col items-center">
                      <span className="rounded bg-indigo-100 px-2 py-0.5 text-indigo-900 font-bold">
                        {finding.code}
                      </span>
                      <span className="mt-1 max-w-[140px] truncate font-sans text-[10px] font-normal text-slate-500">
                        {finding.title}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70">
              {participants.map((participantName) => {
                const vote = votes.find(
                  (v) => v?.participantName === participantName
                );
                return (
                  <tr
                    key={participantName}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="sticky left-0 z-10 bg-white px-4 py-3 font-bold text-slate-900 border-r border-slate-200 whitespace-nowrap">
                      {participantName}
                    </td>
                    {findings.map((finding) => {
                      const pos = vote?.positions?.[finding.id];
                      return (
                        <td
                          key={finding.id}
                          className="px-4 py-3 text-center font-mono"
                        >
                          {pos ? (
                            <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-800">
                              <span>
                                R: {Number(pos.relevance ?? 0).toFixed(2)}
                              </span>
                              <span className="text-slate-300">|</span>
                              <span>
                                F: {Number(pos.feasibility ?? 0).toFixed(2)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Summary Table 2: Puntaje final promedio */}
      <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Puntaje final promedio
            </h3>
            <p className="text-xs text-slate-500">
              Consolidado cuantitativo ordenado por hallazgo y cuadrante estratégico resultante.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200/80">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <th className="px-4 py-3.5">Código</th>
                <th className="px-4 py-3.5">Hallazgo</th>
                <th className="px-4 py-3.5">Categoría</th>
                <th className="px-4 py-3.5 text-center">Promedio Relevancia (X)</th>
                <th className="px-4 py-3.5 text-center">Promedio Factibilidad (Y)</th>
                <th className="px-4 py-3.5 text-right">Cuadrante Asignado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70">
              {computedResults.map((res) => {
                const finding = findings.find((f) => f.id === res.findingId);
                if (!finding) return null;
                const qMeta = QUADRANT_CONFIG[res.quadrant];
                const Icon = qMeta.icon;

                return (
                  <tr
                    key={finding.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="px-4 py-3.5 font-mono font-bold text-indigo-600">
                      {finding.code}
                    </td>
                    <td className="px-4 py-3.5 font-bold text-slate-900">
                      {finding.title}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${getFindingCategoryBadgeStyle(
                          finding.category
                        )}`}
                      >
                        {getFindingCategoryLabel(finding.category)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center font-mono font-bold">
                      <span
                        className={`rounded-md px-2 py-0.5 ${
                          res.avgRelevance >= 0
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {res.avgRelevance > 0
                          ? `+${res.avgRelevance.toFixed(2)}`
                          : res.avgRelevance.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center font-mono font-bold">
                      <span
                        className={`rounded-md px-2 py-0.5 ${
                          res.avgFeasibility >= 0
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {res.avgFeasibility > 0
                          ? `+${res.avgFeasibility.toFixed(2)}`
                          : res.avgFeasibility.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ${qMeta.badgeClass}`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {qMeta.title}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal: Guardar Actividad en Proyecto */}
      <AnimatePresence>
        {isSaveModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSaveModalOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
                    <FolderPlus className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900">
                      Guardar actividad de priorización
                    </h3>
                    <p className="text-xs text-slate-500">
                      Almacena los resultados en un proyecto local y reinicia la sesión activa.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsSaveModalOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveActivitySubmit} className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Nombre de la actividad *
                  </label>
                  <input
                    type="text"
                    required
                    value={activityName}
                    onChange={(e) => setActivityName(e.target.value)}
                    placeholder="Ej. Priorización Sprint 14 - Checkout"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                {/* Toggle: Proyecto existente vs Crear nuevo */}
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
                  <button
                    type="button"
                    disabled={safeProjects.length === 0}
                    onClick={() => setSaveMode('existing')}
                    className={`rounded-lg py-2 text-xs font-bold transition ${
                      saveMode === 'existing'
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 disabled:opacity-40'
                    }`}
                  >
                    Proyecto existente ({safeProjects.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSaveMode('new')}
                    className={`rounded-lg py-2 text-xs font-bold transition ${
                      saveMode === 'new'
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    + Crear nuevo proyecto
                  </button>
                </div>

                {saveMode === 'existing' && safeProjects.length > 0 ? (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      Selecciona el proyecto destino
                    </label>
                    <select
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      {safeProjects.map((proj) => (
                        <option key={proj.id} value={proj.id}>
                          {proj.name} ({(proj.activities ?? []).length} actividades)
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      Nombre del nuevo proyecto *
                    </label>
                    <input
                      type="text"
                      required
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      placeholder="Ej. Investigación Discovery Pagos Q3"
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsSaveModalOpen(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-500/25 hover:bg-indigo-500"
                  >
                    <Save className="h-4 w-4" />
                    Confirmar y guardar
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
