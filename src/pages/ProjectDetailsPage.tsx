import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Calendar,
  Compass,
  Edit3,
  Eye,
  FilePlus2,
  FolderKanban,
  Grid,
  Layers,
  Plus,
  Sparkles,
  Tag,
  Trash2,
  Trophy,
  X,
  CheckCircle2,
  BarChart3,
} from 'lucide-react';
import { useResearchStore } from '../store/useResearchStore';
import {
  Activity,
  AssumptionSession,
  Finding,
  FindingCategory,
  FINDING_CATEGORY_GROUPS,
  getFindingCategoryBadgeStyle,
  getFindingCategoryLabel,
} from '../types';

type ActiveTab = 'activities' | 'findings';

export const ProjectDetailsPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const {
    projects,
    assumptionSessions,
    addProjectFinding,
    updateProjectFinding,
    deleteProjectFinding,
    deleteProject,
    deleteActivity,
    resetSession,
    setSessionProjectId,
    loadActivityIntoSession,
    createAssumptionSession,
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

  const [activeTab, setActiveTab] = useState<ActiveTab>('activities');

  // Estado del formulario de hallazgos (Crear / Editar)
  const [findingTitle, setFindingTitle] = useState('');
  const [findingCategory, setFindingCategory] =
    useState<FindingCategory>('saas_dataviz');
  const [findingDescription, setFindingDescription] = useState('');
  const [editingFinding, setEditingFinding] = useState<Finding | null>(null);

  const safeProjects = useMemo(
    () => (Array.isArray(projects) ? projects.filter(Boolean) : []),
    [projects]
  );

  const project = useMemo(
    () => safeProjects.find((p) => p.id === projectId) ?? null,
    [safeProjects, projectId]
  );

  const projectAssumptions = useMemo(() => {
    if (!project) return [];
    const safeSessions = Array.isArray(assumptionSessions)
      ? assumptionSessions.filter(Boolean)
      : [];
    return safeSessions.filter((s) => s.projectId === project.id);
  }, [assumptionSessions, project]);

  if (!hasHydrated) {
    return null;
  }

  if (!project) {
    return <Navigate to="/" replace />;
  }

  const projectFindings = Array.isArray(project.findings)
    ? project.findings
    : [];
  const projectActivities = Array.isArray(project.activities)
    ? project.activities
    : [];
  const totalActivitiesCount =
    projectActivities.length + projectAssumptions.length;

  const handleStartNewPrioritization = () => {
    resetSession();
    setSessionProjectId(project.id);
    navigate('/prioritization/setup');
  };

  const handleStartNewAssumption = () => {
    createAssumptionSession({
      projectId: project.id,
      title: `Mapa de Supuestos - ${project.name}`,
    });
    navigate('/assumptions/setup');
  };

  const handleReviewPrioritization = (activity: Activity) => {
    loadActivityIntoSession(activity.data, project.id);
    navigate('/prioritization/results');
  };

  const handleReviewAssumption = (session: AssumptionSession) => {
    setActiveAssumptionSession(session.id);
    navigate(
      session.isCompleted ? '/assumptions/results' : '/assumptions/canvas'
    );
  };

  const handleDeleteCurrentProject = () => {
    if (
      window.confirm(
        '¿Estás seguro de eliminar este elemento? Esta acción no se puede deshacer.'
      )
    ) {
      deleteProject(project.id);
      navigate('/');
    }
  };

  const handleDeleteActivityItem = (
    activityId: string,
    activityType: 'prioritization' | 'assumption'
  ) => {
    if (
      window.confirm(
        '¿Estás seguro de eliminar este elemento? Esta acción no se puede deshacer.'
      )
    ) {
      deleteActivity(project.id, activityId, activityType);
    }
  };

  const handleSaveFinding = (e: React.FormEvent) => {
    e.preventDefault();
    if (!findingTitle.trim()) return;

    if (editingFinding) {
      updateProjectFinding(project.id, editingFinding.id, {
        title: findingTitle,
        category: findingCategory,
        description: findingDescription,
      });
      setEditingFinding(null);
    } else {
      addProjectFinding(project.id, {
        title: findingTitle,
        category: findingCategory,
        description: findingDescription,
      });
    }

    setFindingTitle('');
    setFindingDescription('');
    setFindingCategory('saas_dataviz');
  };

  const handleStartEditFinding = (finding: Finding) => {
    setEditingFinding(finding);
    setFindingTitle(finding.title);
    setFindingCategory((finding.category as FindingCategory) || 'saas_dataviz');
    setFindingDescription(finding.description ?? '');
  };

  const handleCancelEdit = () => {
    setEditingFinding(null);
    setFindingTitle('');
    setFindingDescription('');
    setFindingCategory('saas_dataviz');
  };

  const handleDeleteFinding = (findingId: string) => {
    if (
      window.confirm(
        '¿Estás seguro de eliminar este elemento? Esta acción no se puede deshacer.'
      )
    ) {
      if (editingFinding?.id === findingId) {
        handleCancelEdit();
      }
      deleteProjectFinding(project.id, findingId);
    }
  };

  const handleLoadSampleFindings = () => {
    const samples: Omit<Finding, 'id' | 'code'>[] = [
      {
        title: 'Añadir filtros combinados con persistencia de URL en el buscador',
        category: 'saas_busqueda',
        description:
          'Los analistas pierden sus criterios de filtrado al compartir enlaces de consulta.',
      },
      {
        title: 'Normalización de esquemas históricos de comercio exterior',
        category: 'daas_calidad',
        description:
          'Inconsistencias de formato en registros previos reducen la precisión de cruces.',
      },
      {
        title: 'Optimizar paginación cursor-based en endpoints de alto volumen',
        category: 'daas_rendimiento',
        description:
          'Necesario para reducir la latencia en extracciones mayores a 100k filas.',
      },
      {
        title: 'Guía interactiva de primeros pasos para lectura de matrices BI',
        category: 'saas_onboarding',
        description:
          'Nuevos usuarios requieren asistencia para interpretar indicadores clave.',
      },
    ];

    samples.forEach((s) => addProjectFinding(project.id, s));
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Breadcrumb & Project Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/90 pb-6">
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 transition hover:text-indigo-600"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver al Dashboard
          </button>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
              <FolderKanban className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
                  Espacio de Proyecto
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                  <Calendar className="h-3 w-3" />
                  {new Date(project.createdAt).toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                {project.name}
              </h2>
            </div>
          </div>
        </div>

        {/* Quick Actions in Header */}
        <div className="flex flex-wrap items-center gap-2.5 self-start">
          <button
            type="button"
            onClick={handleStartNewPrioritization}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm shadow-indigo-500/20 transition hover:bg-indigo-500"
          >
            <Grid className="h-3.5 w-3.5" />
            Nueva Priorización
          </button>

          <button
            type="button"
            onClick={handleStartNewAssumption}
            className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/80 px-4 py-2.5 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100"
          >
            <Compass className="h-3.5 w-3.5" />
            Nuevo Mapa de Supuestos
          </button>

          <button
            type="button"
            onClick={handleDeleteCurrentProject}
            title="Eliminar proyecto"
            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-2.5 text-xs font-bold text-rose-600 transition hover:bg-rose-50"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200/80">
        <button
          type="button"
          onClick={() => setActiveTab('activities')}
          className={`relative inline-flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold transition ${
            activeTab === 'activities'
              ? 'text-indigo-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          <span>Actividades</span>
          <span
            className={`rounded-full px-2 py-0.5 font-mono text-[11px] font-bold ${
              activeTab === 'activities'
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {totalActivitiesCount}
          </span>
          {activeTab === 'activities' && (
            <motion.div
              layoutId="project-tab-underline"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"
            />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('findings')}
          className={`relative inline-flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold transition ${
            activeTab === 'findings'
              ? 'text-indigo-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Repositorio de Hallazgos</span>
          <span
            className={`rounded-full px-2 py-0.5 font-mono text-[11px] font-bold ${
              activeTab === 'findings'
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {projectFindings.length}
          </span>
          {activeTab === 'findings' && (
            <motion.div
              layoutId="project-tab-underline"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"
            />
          )}
        </button>
      </div>

      {/* TAB 1: ACTIVIDADES DEL PROYECTO */}
      {activeTab === 'activities' && (
        <div className="space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Sesiones Metodológicas del Proyecto
              </h3>
              <p className="text-xs text-slate-500">
                Consulta los resultados de tus Matrices de Priorización y Mapas de Supuestos.
              </p>
            </div>
          </div>

          {totalActivitiesCount === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/80 py-16 px-6 text-center shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <BarChart3 className="h-6 w-6" />
              </div>
              <h4 className="text-base font-bold text-slate-800">
                Este proyecto aún no tiene sesiones registradas
              </h4>
              <p className="mt-1 max-w-md text-xs text-slate-500">
                Puedes registrar hallazgos primero en la pestaña &ldquo;Repositorio de Hallazgos&rdquo; o iniciar directamente una herramienta.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('findings')}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  <Plus className="h-4 w-4 text-indigo-600" />
                  Ir al Repositorio de Hallazgos
                </button>
                <button
                  type="button"
                  onClick={handleStartNewPrioritization}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-500"
                >
                  <Grid className="h-4 w-4" />
                  Crear Matriz de Priorización
                </button>
                <button
                  type="button"
                  onClick={handleStartNewAssumption}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
                >
                  <Compass className="h-4 w-4" />
                  Crear Mapa de Supuestos
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Matrices de Priorización */}
              {projectActivities.map((activity) => {
                const quickWinsCount = (activity.data?.results ?? []).filter(
                  (r) => r.quadrant === 'quick_win'
                ).length;

                return (
                  <div
                    key={activity.id}
                    className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow-md"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="inline-flex items-center gap-1.5 rounded-md bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                            <Grid className="h-3 w-3" />
                            Matriz de Priorización
                          </span>
                          <h4 className="mt-2 text-base font-bold text-slate-900">
                            {activity.name}
                          </h4>
                          <p className="text-[11px] text-slate-400">
                            {new Date(activity.createdAt).toLocaleString(
                              'es-ES',
                              {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              }
                            )}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleReviewPrioritization(activity)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-500"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Resultados
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteActivityItem(
                                activity.id,
                                'prioritization'
                              )
                            }
                            title="Eliminar matriz"
                            className="rounded-xl p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3.5">
                      <div className="rounded-xl bg-slate-50 px-3 py-2 border border-slate-200/60">
                        <span className="block text-[10px] font-semibold uppercase text-slate-400">
                          Participantes
                        </span>
                        <span className="font-mono text-sm font-bold text-slate-800">
                          {activity.data?.participants?.length ?? 0}
                        </span>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2 border border-slate-200/60">
                        <span className="block text-[10px] font-semibold uppercase text-slate-400">
                          Hallazgos
                        </span>
                        <span className="font-mono text-sm font-bold text-slate-800">
                          {activity.data?.findings?.length ?? 0}
                        </span>
                      </div>
                      <div className="rounded-xl bg-amber-50/80 px-3 py-2 border border-amber-200/70">
                        <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-amber-800">
                          <Trophy className="h-3 w-3 text-amber-600" />
                          Quick Wins
                        </span>
                        <span className="font-mono text-sm font-bold text-amber-900">
                          {quickWinsCount}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Sesiones de Mapa de Supuestos */}
              {projectAssumptions.map((session) => (
                <div
                  key={session.id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                          <Compass className="h-3 w-3" />
                          Mapa de Supuestos
                        </span>
                        <h4 className="mt-2 text-base font-bold text-slate-900">
                          {session.title}
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          {new Date(session.date).toLocaleString('es-ES', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleReviewAssumption(session)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-500"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          {session.isCompleted ? 'Ver Plan' : 'Continuar'}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteActivityItem(session.id, 'assumption')
                          }
                          title="Eliminar sesión"
                          className="rounded-xl p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3.5">
                    <div className="rounded-xl bg-slate-50 px-3 py-2 border border-slate-200/60">
                      <span className="block text-[10px] font-semibold uppercase text-slate-400">
                        Supuestos
                      </span>
                      <span className="font-mono text-sm font-bold text-slate-800">
                        {session.findings?.length ?? 0}
                      </span>
                    </div>
                    <div className="rounded-xl bg-emerald-50/70 px-3 py-2 border border-emerald-200/70">
                      <span className="block text-[10px] font-bold uppercase text-emerald-800">
                        Estado
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-900">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        {session.isCompleted
                          ? 'Plan Completado'
                          : 'En progreso'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: REPOSITORIO CENTRAL DE HALLAZGOS */}
      {activeTab === 'findings' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
          {/* Columna Izquierda: Formulario Crear / Editar Hallazgo */}
          <div className="lg:col-span-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sticky top-20">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  {editingFinding ? (
                    <Edit3 className="h-4 w-4" />
                  ) : (
                    <FilePlus2 className="h-4 w-4" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    {editingFinding
                      ? `Editar ${editingFinding.code}`
                      : 'Nuevo Hallazgo del Proyecto'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Disponible para importar en cualquier matriz.
                  </p>
                </div>
              </div>

              {editingFinding && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <form onSubmit={handleSaveFinding} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Título del hallazgo *
                  </label>
                  <span className="font-mono text-[10px] text-slate-400">
                    {findingTitle.length}/80
                  </span>
                </div>
                <input
                  type="text"
                  required
                  maxLength={80}
                  value={findingTitle}
                  onChange={(e) => setFindingTitle(e.target.value)}
                  placeholder="Ej. Fricción al validar API Keys en sandbox"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Categoría (SaaS / DaaS)
                </label>
                <select
                  value={findingCategory}
                  onChange={(e) =>
                    setFindingCategory(e.target.value as FindingCategory)
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  {FINDING_CATEGORY_GROUPS.map((group) => (
                    <optgroup key={group.label} label={group.label}>
                      {group.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Descripción / Evidencia
                  </label>
                  <span className="font-mono text-[10px] text-slate-400">
                    {findingDescription.length}/300
                  </span>
                </div>
                <textarea
                  rows={3}
                  maxLength={300}
                  value={findingDescription}
                  onChange={(e) => setFindingDescription(e.target.value)}
                  placeholder="Contexto observado en entrevistas, analítica o soporte..."
                  className="w-full resize-none rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                {editingFinding && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  type="submit"
                  disabled={!findingTitle.trim()}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" />
                  {editingFinding
                    ? 'Guardar cambios'
                    : 'Guardar en repositorio'}
                </button>
              </div>
            </form>
          </div>

          {/* Columna Derecha: Tabla / Lista del Repositorio Central */}
          <div className="lg:col-span-8 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Repositorio Central de Hallazgos ({projectFindings.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Estos hallazgos están disponibles para importarse en Matrices de Priorización y Mapas de Supuestos.
                </p>
              </div>

              {projectFindings.length === 0 && (
                <button
                  type="button"
                  onClick={handleLoadSampleFindings}
                  className="inline-flex items-center gap-1.5 self-start rounded-xl border border-indigo-200 bg-indigo-50/70 px-3 py-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100"
                >
                  <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                  Cargar hallazgos de ejemplo
                </button>
              )}
            </div>

            {projectFindings.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-14 text-center">
                <Layers className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                <p className="text-sm font-bold text-slate-700">
                  El repositorio de este proyecto está vacío
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Usa el formulario lateral para registrar hallazgos y reutilizarlos en tus sesiones.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200/80">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                      <th className="px-4 py-3 w-20">Código</th>
                      <th className="px-4 py-3">Hallazgo</th>
                      <th className="px-4 py-3 w-52">Categoría</th>
                      <th className="px-4 py-3 text-right w-28">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/70">
                    {projectFindings.map((finding, idx) => {
                      const code =
                        finding.code ?? `F${String(idx + 1).padStart(2, '0')}`;
                      const isBeingEdited = editingFinding?.id === finding.id;

                      return (
                        <tr
                          key={finding.id}
                          className={`transition-colors ${
                            isBeingEdited
                              ? 'bg-indigo-50/60'
                              : 'hover:bg-slate-50/80'
                          }`}
                        >
                          <td className="px-4 py-3.5 align-top">
                            <span className="inline-flex items-center rounded-lg bg-slate-900 px-2.5 py-1 font-mono text-xs font-bold text-white">
                              {code}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 align-top">
                            <p className="font-bold text-slate-900 text-xs sm:text-sm">
                              {finding.title}
                            </p>
                            {finding.description && (
                              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                                {finding.description}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3.5 align-top">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${getFindingCategoryBadgeStyle(
                                finding.category
                              )}`}
                            >
                              <Tag className="h-3 w-3" />
                              {getFindingCategoryLabel(finding.category)}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 align-top text-right">
                            <div className="inline-flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => handleStartEditFinding(finding)}
                                title="Editar hallazgo"
                                className="rounded-lg p-1.5 text-slate-500 transition hover:bg-indigo-50 hover:text-indigo-600"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteFinding(finding.id)}
                                title="Eliminar hallazgo"
                                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
