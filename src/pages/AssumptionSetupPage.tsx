import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Compass,
  FolderKanban,
  FilePlus2,
  Download,
  Sparkles,
  Play,
  Trash2,
  Plus,
  Tag,
  X,
  CheckCircle2,
  Layers,
  RotateCcw,
} from 'lucide-react';
import { useResearchStore } from '../store/useResearchStore';
import {
  FindingCategory,
  FINDING_CATEGORY_GROUPS,
  getFindingCategoryBadgeStyle,
  getFindingCategoryLabel,
} from '../types';

export const AssumptionSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    projects,
    addProject,
    assumptionSessions,
    activeAssumptionSessionId,
    createAssumptionSession,
    setActiveAssumptionSession,
    updateAssumptionSessionMeta,
    addFindingToAssumption,
    removeFindingFromAssumption,
    importFindingsToAssumption,
  } = useResearchStore();

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
      safeSessions.find((s) => s.id === activeAssumptionSessionId) ?? null,
    [safeSessions, activeAssumptionSessionId]
  );

  const [sessionTitle, setSessionTitle] = useState<string>(
    activeSession?.title ??
      `Mapa de Supuestos (${new Date().toLocaleDateString('es-ES')})`
  );
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    activeSession?.projectId || safeProjects[0]?.id || ''
  );

  // Nuevo proyecto rápido
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  // Modal de importación de hallazgos (Checklist desde selectedProject.findings)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [checkedFindingIds, setCheckedFindingIds] = useState<string[]>([]);
  const [importFeedback, setImportFeedback] = useState<string | null>(null);

  // Formulario de hallazgo manual
  const [findingTitle, setFindingTitle] = useState('');
  const [findingCategory, setFindingCategory] =
    useState<FindingCategory>('saas_dataviz');
  const [findingDescription, setFindingDescription] = useState('');

  // Sincronizar cuando cambia la sesión activa
  useEffect(() => {
    if (activeSession) {
      setSessionTitle(activeSession.title);
      if (activeSession.projectId) {
        setSelectedProjectId(activeSession.projectId);
      }
    }
  }, [activeSession?.id]);

  // Seleccionar primer proyecto disponible si no había uno
  useEffect(() => {
    if (!selectedProjectId && safeProjects.length > 0) {
      const firstId = safeProjects[0].id;
      setSelectedProjectId(firstId);
      if (activeSession && !activeSession.projectId) {
        updateAssumptionSessionMeta(activeSession.id, { projectId: firstId });
      }
    }
  }, [safeProjects, selectedProjectId, activeSession, updateAssumptionSessionMeta]);

  const selectedProject = useMemo(
    () => safeProjects.find((p) => p.id === selectedProjectId) ?? null,
    [safeProjects, selectedProjectId]
  );

  const repoFindings = useMemo(
    () =>
      Array.isArray(selectedProject?.findings) ? selectedProject!.findings : [],
    [selectedProject]
  );

  const findings = activeSession?.findings ?? [];

  const ensureActiveSession = (): string => {
    let targetProjectId = selectedProjectId;
    if (!targetProjectId) {
      if (safeProjects.length > 0) {
        targetProjectId = safeProjects[0].id;
        setSelectedProjectId(targetProjectId);
      } else {
        const defaultProj = addProject('Proyecto General Research');
        targetProjectId = defaultProj.id;
        setSelectedProjectId(targetProjectId);
      }
    }

    if (activeSession && !activeSession.isCompleted) {
      updateAssumptionSessionMeta(activeSession.id, {
        title: sessionTitle.trim() || activeSession.title,
        projectId: targetProjectId,
      });
      return activeSession.id;
    }

    const created = createAssumptionSession({
      projectId: targetProjectId,
      title:
        sessionTitle.trim() ||
        `Mapa de Supuestos (${new Date().toLocaleDateString('es-ES')})`,
    });
    return created.id;
  };

  const handleTitleChange = (val: string) => {
    setSessionTitle(val);
    if (activeSession) {
      updateAssumptionSessionMeta(activeSession.id, { title: val });
    }
  };

  const handleProjectChange = (projId: string) => {
    setSelectedProjectId(projId);
    setCheckedFindingIds([]);
    if (activeSession) {
      updateAssumptionSessionMeta(activeSession.id, { projectId: projId });
    }
  };

  const handleCreateQuickProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    const created = addProject(newProjectName);
    setSelectedProjectId(created.id);
    if (activeSession) {
      updateAssumptionSessionMeta(activeSession.id, { projectId: created.id });
    }
    setNewProjectName('');
    setIsNewProjectModalOpen(false);
  };

  const handleAddFinding = (e: React.FormEvent) => {
    e.preventDefault();
    if (!findingTitle.trim()) return;
    const sessionId = ensureActiveSession();
    addFindingToAssumption(
      {
        title: findingTitle,
        category: findingCategory,
        description: findingDescription,
      },
      sessionId
    );
    setFindingTitle('');
    setFindingDescription('');
  };

  const handleOpenImportModal = () => {
    setImportFeedback(null);
    const existingTitles = new Set(
      findings.map((f) => f.title.trim().toLowerCase())
    );
    const preselected = repoFindings
      .filter((rf) => !existingTitles.has(rf.title.trim().toLowerCase()))
      .map((rf) => rf.id);
    setCheckedFindingIds(preselected);
    setIsImportModalOpen(true);
  };

  const handleToggleCheckFinding = (id: string) => {
    setCheckedFindingIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllRepoFindings = () => {
    if (checkedFindingIds.length === repoFindings.length) {
      setCheckedFindingIds([]);
    } else {
      setCheckedFindingIds(repoFindings.map((rf) => rf.id));
    }
  };

  const handleImportFromProject = () => {
    if (!selectedProject) return;
    const sessionId = ensureActiveSession();
    const selectedItems = repoFindings.filter((rf) =>
      checkedFindingIds.includes(rf.id)
    );
    const count = importFindingsToAssumption(
      { findings: selectedItems },
      sessionId
    );

    setImportFeedback(
      count > 0
        ? `Se importaron ${count} hallazgos del repositorio central.`
        : 'Los hallazgos seleccionados ya estaban incluidos en la sesión.'
    );
    setTimeout(() => {
      setImportFeedback(null);
      setIsImportModalOpen(false);
    }, 1100);
  };

  const handleLoadQuickPreset = () => {
    let targetProjectId = selectedProjectId;
    if (!targetProjectId) {
      if (safeProjects.length > 0) {
        targetProjectId = safeProjects[0].id;
      } else {
        const createdProj = addProject('Ecosistema B2B DataCorp 2026');
        targetProjectId = createdProj.id;
      }
      setSelectedProjectId(targetProjectId);
    }

    const presetTitle = 'Validación de Supuestos - Discovery Q3';
    setSessionTitle(presetTitle);

    createAssumptionSession({
      projectId: targetProjectId,
      title: presetTitle,
      findings: [
        {
          title:
            'Los analistas B2B abandonan el onboarding por falta de plantillas preconfiguradas',
          category: 'saas_onboarding',
          description:
            'Hipótesis levantada por Customer Success sin métricas de embudo confirmadas aún.',
        },
        {
          title:
            'Reducir latencia P95 en API de enriquecimiento aumentará la retención mensual',
          category: 'daas_rendimiento',
          description:
            'Registros de soporte muestran 42 tickets de timeout en clientes Enterprise.',
        },
        {
          title:
            'Los usuarios requieren filtros avanzados con persistencia en URL para compartir vistas',
          category: 'saas_busqueda',
          description:
            'Validado en 8 entrevistas y logs de uso frecuente del botón compartir.',
        },
        {
          title:
            'Un modo oscuro personalizado incrementará el tiempo de sesión en analistas senior',
          category: 'saas_dataviz',
          description:
            'Comentario aislado de 1 usuario durante prueba de guerrilla.',
        },
      ],
    });
  };

  const handleStartNewBlankSession = () => {
    setActiveAssumptionSession(null);
    setSessionTitle(
      `Mapa de Supuestos (${new Date().toLocaleDateString('es-ES')})`
    );
  };

  const canStartCanvas =
    Boolean(sessionTitle.trim()) &&
    (Boolean(selectedProjectId) || safeProjects.length > 0) &&
    findings.length > 0;

  const handleContinueToCanvas = () => {
    if (!canStartCanvas) return;
    ensureActiveSession();
    navigate('/assumptions/canvas');
  };

  return (
    <div className="space-y-8 pb-24">
      {/* Top Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-5">
        <div className="space-y-1">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 transition hover:text-indigo-600"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver al inicio
          </button>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Configuración de Mapa de Supuestos
            </h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700 ring-1 ring-inset ring-indigo-500/20">
              <Compass className="h-3.5 w-3.5" />
              Assumption Mapping
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Vincula la sesión a un proyecto y registra o importa los supuestos a evaluar.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start">
          <button
            type="button"
            onClick={handleLoadQuickPreset}
            className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 px-3.5 py-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100"
          >
            <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
            Cargar ejemplo rápido
          </button>

          {activeSession && (
            <button
              type="button"
              onClick={handleStartNewBlankSession}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/60 px-3 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Nueva sesión
            </button>
          )}
        </div>
      </div>

      {/* Section 1: Datos de la Sesión y Proyecto */}
      <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <FolderKanban className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              1. Información de la sesión y proyecto
            </h3>
            <p className="text-xs text-slate-500">
              Define el nombre de la actividad y el proyecto al que pertenece.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          <div className="md:col-span-6">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Nombre de la sesión *
            </label>
            <input
              type="text"
              required
              maxLength={80}
              value={sessionTitle}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Ej. Mapeo de Hipótesis Checkout B2B Q3"
              className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="md:col-span-6">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Proyecto asociado *
              </label>
              <button
                type="button"
                onClick={() => setIsNewProjectModalOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-500"
              >
                <Plus className="h-3.5 w-3.5" />
                Crear proyecto
              </button>
            </div>

            {safeProjects.length === 0 ? (
              <div className="flex items-center justify-between rounded-xl border border-dashed border-amber-300 bg-amber-50/60 px-3.5 py-2 text-xs text-amber-900">
                <span>
                  No hay proyectos aún. Se creará uno automáticamente o créalo ahora.
                </span>
                <button
                  type="button"
                  onClick={() => setIsNewProjectModalOpen(true)}
                  className="ml-2 shrink-0 rounded-lg bg-amber-600 px-2.5 py-1 font-bold text-white hover:bg-amber-500"
                >
                  + Nuevo
                </button>
              </div>
            ) : (
              <select
                value={selectedProjectId}
                onChange={(e) => handleProjectChange(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {safeProjects.map((proj) => (
                  <option key={proj.id} value={proj.id}>
                    {proj.name} ({(proj.findings ?? []).length}{' '}
                    {(proj.findings ?? []).length === 1
                      ? 'hallazgo en repositorio'
                      : 'hallazgos en repositorio'}
                    )
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </section>

      {/* Section 2: Registro o Importación de Hallazgos / Supuestos */}
      <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <FilePlus2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                2. Hallazgos e Hipótesis a evaluar
              </h3>
              <p className="text-xs text-slate-500">
                Importa hallazgos del repositorio central del proyecto o agrega nuevos manualmente.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleOpenImportModal}
              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/80 px-3.5 py-2 text-xs font-bold text-indigo-700 shadow-sm transition hover:bg-indigo-100"
            >
              <Download className="h-3.5 w-3.5 text-indigo-600" />
              Importar hallazgos ({repoFindings.length})
            </button>

            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 font-mono text-xs font-bold text-slate-700">
              {findings.length} {findings.length === 1 ? 'hallazgo' : 'hallazgos'}
            </span>
          </div>
        </div>

        {/* Manual Finding Form */}
        <form
          onSubmit={handleAddFinding}
          className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 lg:grid-cols-12"
        >
          <div className="lg:col-span-7">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Título del supuesto o hallazgo *
              </label>
              <span className="font-mono text-[11px] text-slate-400">
                {findingTitle.length}/80
              </span>
            </div>
            <input
              type="text"
              required
              maxLength={80}
              value={findingTitle}
              onChange={(e) => setFindingTitle(e.target.value)}
              placeholder="Ej. Los clientes Enterprise necesitan exportación directa a Snowflake"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="lg:col-span-5">
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

          <div className="lg:col-span-9">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Descripción / Evidencia actual (Opcional)
              </label>
              <span className="font-mono text-[11px] text-slate-400">
                {findingDescription.length}/300
              </span>
            </div>
            <textarea
              rows={2}
              maxLength={300}
              value={findingDescription}
              onChange={(e) => setFindingDescription(e.target.value)}
              placeholder="Describe qué sabemos hasta ahora o qué riesgo implica para el negocio..."
              className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="lg:col-span-3 flex items-end">
            <button
              type="submit"
              disabled={!findingTitle.trim()}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <FilePlus2 className="h-4 w-4" />
              Agregar supuesto
            </button>
          </div>
        </form>

        {/* List of Findings */}
        <div className="mt-6">
          {findings.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-10 text-center text-xs text-slate-400">
              Agrega hallazgos manualmente o impórtalos del repositorio del proyecto.
            </div>
          ) : (
            <motion.div
              layout
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              <AnimatePresence>
                {findings.map((finding, index) => {
                  const code =
                    finding.code ?? `S${String(index + 1).padStart(2, '0')}`;
                  return (
                    <motion.div
                      key={finding.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="group relative flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm transition hover:border-indigo-300 hover:shadow-md"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center rounded-lg bg-indigo-600 px-2.5 py-1 font-mono text-xs font-bold text-white shadow-sm">
                            {code}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${getFindingCategoryBadgeStyle(
                              finding.category
                            )}`}
                          >
                            <Tag className="h-3 w-3" />
                            {getFindingCategoryLabel(finding.category)}
                          </span>
                        </div>

                        <h4 className="mt-3 text-sm font-bold text-slate-900 leading-snug">
                          {finding.title}
                        </h4>

                        {finding.description && (
                          <p className="mt-2 text-xs text-slate-500 line-clamp-3 leading-relaxed">
                            {finding.description}
                          </p>
                        )}
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-2.5">
                        <span className="font-mono text-[10px] text-slate-400">
                          {finding.coordinates
                            ? 'Ubicado en el mapa'
                            : 'Sin posicionar'}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            removeFindingFromAssumption(
                              finding.id,
                              activeSession?.id
                            )
                          }
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Eliminar
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </section>

      {/* Sticky Footer */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200/90 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
            <span className="font-semibold text-slate-900">Sesión:</span>
            <span className="rounded-md bg-slate-100 px-2.5 py-0.5 font-semibold text-slate-800 truncate max-w-[240px]">
              {sessionTitle || 'Sin título'}
            </span>
            <span>•</span>
            <span className="rounded-md bg-indigo-50 px-2.5 py-0.5 font-mono font-bold text-indigo-700">
              {findings.length}{' '}
              {findings.length === 1 ? 'supuesto' : 'supuestos'}
            </span>
          </div>

          <button
            type="button"
            disabled={!canStartCanvas}
            onClick={handleContinueToCanvas}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
          >
            <Play className="h-4 w-4 fill-current" />
            Ir al Lienzo de Consenso
          </button>
        </div>
      </div>

      {/* Modal: Checklist para Importar Hallazgos desde selectedProject.findings */}
      <AnimatePresence>
        {isImportModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsImportModalOpen(false)}
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
                    <Download className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900">
                      Importar desde Repositorio del Proyecto
                    </h3>
                    <p className="text-xs text-slate-500">
                      {selectedProject
                        ? `Proyecto: ${selectedProject.name}`
                        : 'Selecciona los hallazgos para llevar a esta matriz.'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsImportModalOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-5 space-y-4">
                {!selectedProject || repoFindings.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center">
                    <Layers className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                    <p className="text-sm font-bold text-slate-700">
                      El repositorio de este proyecto no tiene hallazgos aún
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Puedes registrarlos en la vista del proyecto o agregarlos manualmente.
                    </p>
                    {selectedProject && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsImportModalOpen(false);
                          navigate(`/project/${selectedProject.id}`);
                        }}
                        className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500"
                      >
                        Ir al Repositorio del Proyecto
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700">
                        Selecciona los hallazgos a importar ({checkedFindingIds.length}/
                        {repoFindings.length})
                      </span>
                      <button
                        type="button"
                        onClick={handleSelectAllRepoFindings}
                        className="font-bold text-indigo-600 hover:underline"
                      >
                        {checkedFindingIds.length === repoFindings.length
                          ? 'Deseleccionar todos'
                          : 'Seleccionar todos'}
                      </button>
                    </div>

                    <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200/80 bg-slate-50/60 p-3 space-y-2">
                      {repoFindings.map((rf, idx) => {
                        const isChecked = checkedFindingIds.includes(rf.id);
                        const alreadyInSession = findings.some(
                          (f) =>
                            f.title.trim().toLowerCase() ===
                            rf.title.trim().toLowerCase()
                        );

                        return (
                          <label
                            key={rf.id}
                            className={`flex cursor-pointer items-start justify-between gap-3 rounded-xl border p-3 transition ${
                              isChecked
                                ? 'border-indigo-500 bg-indigo-50/40'
                                : 'border-slate-200/70 bg-white hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-start gap-2.5 min-w-0">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleCheckFinding(rf.id)}
                                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="rounded bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">
                                    {rf.code ??
                                      `F${String(idx + 1).padStart(2, '0')}`}
                                  </span>
                                  <span className="truncate text-xs font-bold text-slate-900">
                                    {rf.title}
                                  </span>
                                </div>
                                {rf.description && (
                                  <p className="mt-1 text-[11px] text-slate-500 line-clamp-1">
                                    {rf.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <span className="text-[10px] font-semibold text-slate-400">
                                {getFindingCategoryLabel(rf.category)}
                              </span>
                              {alreadyInSession && (
                                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                  Ya incluido
                                </span>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </>
                )}

                {importFeedback && (
                  <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-xs font-bold text-emerald-800 ring-1 ring-emerald-500/20">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>{importFeedback}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsImportModalOpen(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Cerrar
                  </button>
                  {selectedProject && repoFindings.length > 0 && (
                    <button
                      type="button"
                      disabled={checkedFindingIds.length === 0}
                      onClick={handleImportFromProject}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Importar seleccionados ({checkedFindingIds.length})
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal: Crear Nuevo Proyecto Rápido */}
      <AnimatePresence>
        {isNewProjectModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsNewProjectModalOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-900">
                  Crear nuevo proyecto
                </h3>
                <button
                  onClick={() => setIsNewProjectModalOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form
                onSubmit={handleCreateQuickProject}
                className="mt-4 space-y-4"
              >
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Nombre del proyecto
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={60}
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Ej. Discovery Plataforma DaaS Q3"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsNewProjectModalOpen(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-500"
                  >
                    Crear proyecto
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
