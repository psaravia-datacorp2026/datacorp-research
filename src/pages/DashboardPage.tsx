import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Grid,
  Compass,
  Users,
  CheckCircle2,
  ArrowUpRight,
  Folder,
  FolderKanban,
  Calendar,
  Layers,
  X,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useResearchStore } from '../store/useResearchStore';

const METHODOLOGY_TOOLS = [
  {
    id: 'prioritization-map',
    title: 'Mapa de priorización',
    subtitle: 'Factibilidad vs. Relevancia',
    description:
      'Prioriza hallazgos mediante votación ponderada por turnos.',
    icon: Grid,
    active: true,
    route: '/prioritization/setup',
    accent: 'from-indigo-600 to-indigo-500',
  },
  {
    id: 'assumptions-map',
    title: 'Mapa de supuestos',
    subtitle: 'Evidencia vs. Riesgo de Negocio',
    description:
      'Evalúa hipótesis en consenso para definir tu Plan de Validación.',
    icon: Compass,
    active: true,
    route: '/assumptions/setup',
    accent: 'from-emerald-600 to-teal-500',
  },
  {
    id: 'stakeholders-map',
    title: 'Mapa de actores',
    subtitle: 'Influencia vs. Interés Sistémico',
    description:
      'Modela la red de decisores y usuarios clave del servicio.',
    icon: Users,
    active: false,
  },
  {
    id: 'good-services-check',
    title: 'Chequeo buenos servicios',
    subtitle: 'Auditoría de 15 Principios UX',
    description:
      'Evalúa la madurez del servicio mediante indicadores de fricción.',
    icon: CheckCircle2,
    active: false,
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: 'easeOut' as const },
  },
};

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    projects,
    assumptionSessions,
    addProject,
    deleteProject,
    currentSession,
  } = useResearchStore();

  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  const safeProjects = useMemo(
    () => (Array.isArray(projects) ? projects.filter(Boolean) : []),
    [projects]
  );

  const safeAssumptionSessions = useMemo(
    () =>
      Array.isArray(assumptionSessions)
        ? assumptionSessions.filter(Boolean)
        : [],
    [assumptionSessions]
  );

  const hasActiveDraft =
    (currentSession?.participants?.length ?? 0) > 0 ||
    (currentSession?.findings?.length ?? 0) > 0;

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    const created = addProject(newProjectName);
    setNewProjectName('');
    setIsNewProjectModalOpen(false);
    navigate(`/project/${created.id}`);
  };

  const handleDeleteProject = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (
      window.confirm(
        '¿Estás seguro de eliminar este elemento? Esta acción no se puede deshacer.'
      )
    ) {
      deleteProject(projectId);
    }
  };

  return (
    <div className="space-y-12 pb-12">
      {/* Hero & Methodology Section */}
      <section className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600 ring-1 ring-inset ring-indigo-500/20 mb-3">
              <Sparkles className="h-3.5 w-3.5" />
              Metodologías Digitales Cuantificadas
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              ¿Cómo deseas comenzar tu investigación?
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Elige una metodología para transformar hallazgos en decisiones accionables.
            </p>
          </div>

          {hasActiveDraft && (
            <button
              onClick={() => navigate('/prioritization/setup')}
              className="inline-flex items-center gap-2 self-start rounded-xl border border-amber-300 bg-amber-50/90 px-4 py-2.5 text-xs font-bold text-amber-900 shadow-sm transition hover:bg-amber-100"
            >
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              Continuar sesión en curso ({currentSession?.findings?.length ?? 0} hallazgos)
            </button>
          )}
        </div>

        {/* 4-Column Methodology Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          {METHODOLOGY_TOOLS.map((tool) => {
            const Icon = tool.icon;

            if (tool.active) {
              return (
                <motion.div
                  key={tool.id}
                  variants={itemVariants}
                  whileHover={{ y: -4 }}
                  onClick={() => tool.route && navigate(tool.route)}
                  className="group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border-2 border-indigo-500/80 bg-white p-6 shadow-lg shadow-indigo-500/10 transition-all hover:border-indigo-600 hover:shadow-xl hover:shadow-indigo-500/15"
                >
                  <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-indigo-500/10 blur-2xl transition-all group-hover:bg-indigo-500/20" />

                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-500/30 transition-transform duration-200 group-hover:scale-105">
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-500/20">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Disponible
                      </span>
                    </div>

                    <h3 className="mt-5 text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {tool.title}
                    </h3>
                    <p className="mt-0.5 text-xs font-semibold text-indigo-600">
                      {tool.subtitle}
                    </p>
                    <p className="mt-3 text-xs leading-relaxed text-slate-600">
                      {tool.description}
                    </p>
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-bold text-indigo-600">
                    <span>Configurar actividad</span>
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:bg-indigo-600 group-hover:text-white">
                      <ArrowUpRight className="h-4 w-4" />
                    </span>
                  </div>
                </motion.div>
              );
            }

            return (
              <motion.div
                key={tool.id}
                variants={itemVariants}
                className="relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-slate-100/75 p-6 opacity-75 select-none"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-200/90 text-slate-500">
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="inline-flex items-center rounded-full bg-slate-200/90 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                      Próximamente
                    </span>
                  </div>

                  <h3 className="mt-5 text-lg font-bold text-slate-600">
                    {tool.title}
                  </h3>
                  <p className="mt-0.5 text-xs font-medium text-slate-500">
                    {tool.subtitle}
                  </p>
                  <p className="mt-3 text-xs leading-relaxed text-slate-500">
                    {tool.description}
                  </p>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-slate-200/70 pt-4 text-[11px] font-medium text-slate-400">
                  <span>En desarrollo</span>
                  <span>Roadmap Q2</span>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* Bottom Section: Local Projects */}
      <section className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
              <FolderKanban className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold tracking-tight text-slate-900">
                Proyectos
              </h3>
              <p className="text-xs text-slate-500">
                Repositorio central de hallazgos y sesiones guardadas por proyecto.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsNewProjectModalOpen(true)}
            className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:border-indigo-300 hover:text-indigo-600"
          >
            <Plus className="h-4 w-4 text-indigo-600" />
            Nuevo proyecto
          </button>
        </div>

        {safeProjects.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300/90 bg-white/75 py-16 px-6 text-center shadow-sm backdrop-blur-sm"
          >
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 ring-1 ring-inset ring-indigo-500/20">
              <Folder className="h-7 w-7" />
            </div>
            <p className="max-w-md text-sm sm:text-base font-semibold text-slate-700">
              Aún no tienes proyectos creados.
            </p>
          </motion.div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {safeProjects.map((project) => {
              const projAssumptions = safeAssumptionSessions.filter(
                (s) => s.projectId === project.id
              );
              const totalActivitiesCount =
                (project.activities ?? []).length + projAssumptions.length;

              const repoFindingsCount = Array.isArray(project.findings)
                ? project.findings.length
                : 0;

              return (
                <motion.div
                  key={project.id}
                  variants={itemVariants}
                  whileHover={{ y: -3 }}
                  onClick={() => navigate(`/project/${project.id}`)}
                  className="group cursor-pointer rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition-all hover:border-indigo-400 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <Folder className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="truncate font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {project.name}
                        </h4>
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                          <Calendar className="h-3 w-3" />
                          {new Date(project.createdAt).toLocaleDateString(
                            'es-ES',
                            {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            }
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 font-mono text-[11px] font-bold text-slate-700 group-hover:bg-indigo-50 group-hover:text-indigo-700">
                        {totalActivitiesCount}{' '}
                        {totalActivitiesCount === 1
                          ? 'actividad'
                          : 'actividades'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteProject(e, project.id)}
                        title="Eliminar proyecto"
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3.5 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-slate-400" />
                      {repoFindingsCount}{' '}
                      {repoFindingsCount === 1
                        ? 'hallazgo en repositorio'
                        : 'hallazgos en repositorio'}
                    </span>
                    <span className="font-semibold text-indigo-600 group-hover:underline">
                      Ver Proyecto →
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </section>

      {/* Modal Crear Nuevo Proyecto */}
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

              <form onSubmit={handleCreateProject} className="mt-4 space-y-4">
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
                    placeholder="Ej. Investigación Checkout Mobile 2026"
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
