import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Activity,
  AssumptionCoordinate,
  AssumptionFinding,
  AssumptionQuadrantType,
  AssumptionSession,
  Coordinate,
  Finding,
  FINDING_CATEGORIES,
  FindingResult,
  PrioritizationActivityData,
  PrioritizationFinding,
  Project,
  QuadrantType,
} from '../types';

export interface CurrentSessionState extends PrioritizationActivityData {
  currentParticipantIndex: number;
  projectId?: string;
}

interface ResearchStoreState {
  projects: Project[];
  currentSession: CurrentSessionState;
  assumptionSessions: AssumptionSession[];
  activeAssumptionSessionId: string | null;

  // Acciones Globales de Proyecto y Repositorio Central de Hallazgos
  addProject: (name: string) => Project;
  addProjectFinding: (
    projectId: string,
    finding: Omit<Finding, 'id' | 'code'>
  ) => Finding | null;
  updateProjectFinding: (
    projectId: string,
    findingId: string,
    patch: Partial<Omit<Finding, 'id' | 'code'>>
  ) => void;
  deleteProjectFinding: (projectId: string, findingId: string) => void;
  addActivityToProject: (
    projectId: string,
    activityName: string,
    data?: PrioritizationActivityData
  ) => Activity | null;
  deleteProject: (projectId: string) => void;
  deleteActivity: (
    projectId: string,
    activityId: string,
    activityType: 'prioritization' | 'assumption'
  ) => void;

  // Acciones de Sesión Activa (currentSession - Matriz de Priorización)
  setSessionProjectId: (projectId: string) => void;
  addParticipant: (name: string) => void;
  removeParticipant: (name: string) => void;
  addFinding: (
    finding: Omit<Finding, 'id' | 'code'>,
    projectId?: string
  ) => void;
  removeFinding: (id: string) => void;
  importFindingsToPrioritization: (findingsToImport: Finding[]) => number;
  setFindingPosition: (
    participantName: string,
    findingId: string,
    coordinate: Coordinate
  ) => void;
  nextParticipantTurn: () => void;
  setCurrentParticipantIndex: (index: number) => void;
  calculateResults: () => FindingResult[];
  resetSession: () => void;
  loadActivityIntoSession: (
    data: PrioritizationActivityData,
    projectId?: string
  ) => void;

  // Acciones de Mapa de Supuestos (Assumption Mapping)
  createAssumptionSession: (payload: {
    projectId: string;
    title: string;
    findings?: Omit<AssumptionFinding, 'id' | 'code'>[];
  }) => AssumptionSession;
  setActiveAssumptionSession: (sessionId: string | null) => void;
  updateAssumptionSessionMeta: (
    sessionId: string,
    patch: { title?: string; projectId?: string }
  ) => void;
  addFindingToAssumption: (
    finding: Omit<AssumptionFinding, 'id' | 'code'>,
    sessionId?: string
  ) => void;
  removeFindingFromAssumption: (findingId: string, sessionId?: string) => void;
  importFindingsToAssumption: (
    source: {
      projectId?: string;
      activityId?: string;
      findings?: (Finding | AssumptionFinding)[];
    },
    sessionId?: string
  ) => number;
  updateFindingCoordinates: (
    findingId: string,
    coordinates: AssumptionCoordinate,
    sessionId?: string
  ) => void;
  completeAssumptionSession: (sessionId?: string) => void;
}

const createInitialSession = (): CurrentSessionState => ({
  participants: [],
  findings: [],
  votes: [],
  results: [],
  currentParticipantIndex: 0,
  projectId: undefined,
});

export const determineQuadrant = (
  relevance: number,
  feasibility: number
): QuadrantType => {
  if (relevance >= 0 && feasibility >= 0) return 'quick_win';
  if (relevance < 0 && feasibility >= 0) return 'strategic';
  if (relevance >= 0 && feasibility < 0) return 'operational_fill';
  return 'discard';
};

export const determineAssumptionQuadrant = (
  x: number,
  y: number
): AssumptionQuadrantType => {
  if (x < 0 && y >= 0) return 'investigate'; // Investigar Urgente (Riesgo Alto / Evidencia Baja)
  if (x >= 0 && y >= 0) return 'execute'; // Ejecutar (Riesgo Alto / Evidencia Alta)
  if (x >= 0 && y < 0) return 'secondary'; // Seguimiento Secundario (Riesgo Bajo / Evidencia Alta)
  return 'discard'; // Descartar (Riesgo Bajo / Evidencia Baja)
};

const roundToTwo = (num: number): number =>
  Math.round((num + Number.EPSILON) * 100) / 100;

const reindexProjectFindings = (findings: Finding[]): Finding[] =>
  findings.map((f, idx) => ({
    ...f,
    code: `F${String(idx + 1).padStart(2, '0')}`,
    description: f.description ?? '',
  }));

const reindexPrioritizationFindings = (
  findings: PrioritizationFinding[]
): PrioritizationFinding[] =>
  findings.map((f, idx) => ({
    ...f,
    code: `ID${String(idx + 1).padStart(2, '0')}`,
    description: f.description ?? '',
    scores: f.scores ?? { relevance: 0, feasibility: 0 },
  }));

const reindexAssumptionFindings = (
  findings: AssumptionFinding[]
): AssumptionFinding[] =>
  findings.map((f, idx) => ({
    ...f,
    code: `S${String(idx + 1).padStart(2, '0')}`,
    description: f.description ?? '',
  }));

const normalizeProjects = (rawProjects: Project[] | undefined): Project[] => {
  if (!Array.isArray(rawProjects)) return [];
  return rawProjects
    .filter((p) => Boolean(p && p.id !== 'proj-onboarding-b2b'))
    .map((p) => {
      const existingFindings = Array.isArray(p.findings) ? p.findings : [];
      // Si el proyecto antiguo tenía actividades con hallazgos pero findings vacío, hidratamos su repositorio central
      if (existingFindings.length === 0 && Array.isArray(p.activities)) {
        const seen = new Set<string>();
        const seeded: Finding[] = [];
        p.activities.forEach((act) => {
          (act?.data?.findings ?? []).forEach((f, idx) => {
            const cleanTitle = (f?.title ?? '').trim();
            if (!cleanTitle) return;
            const key = cleanTitle.toLowerCase();
            if (seen.has(key)) return;
            seen.add(key);
            seeded.push({
              id:
                f.id ||
                `pf-seed-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
              code: `F${String(seeded.length + 1).padStart(2, '0')}`,
              title: cleanTitle,
              description: f.description ?? '',
              category: f.category || FINDING_CATEGORIES[0],
            });
          });
        });
        return {
          ...p,
          findings: reindexProjectFindings(seeded),
          activities: Array.isArray(p.activities) ? p.activities : [],
        };
      }

      return {
        ...p,
        findings: reindexProjectFindings(existingFindings),
        activities: Array.isArray(p.activities) ? p.activities : [],
      };
    });
};

export const useResearchStore = create<ResearchStoreState>()(
  persist(
    (set, get) => ({
      projects: [],
      currentSession: createInitialSession(),
      assumptionSessions: [],
      activeAssumptionSessionId: null,

      addProject: (name: string) => {
        const trimmed = name.trim();
        const newProject: Project = {
          id: `proj-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: trimmed,
          createdAt: new Date().toISOString(),
          findings: [],
          activities: [],
        };

        set((state) => ({
          projects: [newProject, ...(state.projects ?? [])],
        }));

        return newProject;
      },

      addProjectFinding: (projectId, { title, description, category }) => {
        const cleanTitle = title.trim();
        if (!projectId || !cleanTitle) return null;

        let createdFinding: Finding | null = null;

        set((state) => ({
          projects: (state.projects ?? []).map((proj) => {
            if (proj.id !== projectId) return proj;
            const currentFindings = Array.isArray(proj.findings)
              ? proj.findings
              : [];

            const nextCode = `F${String(currentFindings.length + 1).padStart(2, '0')}`;
            createdFinding = {
              id: `pf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              code: nextCode,
              title: cleanTitle.slice(0, 80),
              description: (description ?? '').trim().slice(0, 300),
              category: category?.trim() || FINDING_CATEGORIES[0],
            };

            return {
              ...proj,
              findings: reindexProjectFindings([
                ...currentFindings,
                createdFinding,
              ]),
            };
          }),
        }));

        return createdFinding;
      },

      updateProjectFinding: (projectId, findingId, patch) => {
        if (!projectId || !findingId) return;

        set((state) => ({
          projects: (state.projects ?? []).map((proj) => {
            if (proj.id !== projectId) return proj;
            const updated = (proj.findings ?? []).map((f) => {
              if (f.id !== findingId) return f;
              return {
                ...f,
                title:
                  patch.title !== undefined
                    ? patch.title.trim().slice(0, 80)
                    : f.title,
                description:
                  patch.description !== undefined
                    ? patch.description.trim().slice(0, 300)
                    : f.description,
                category:
                  patch.category !== undefined ? patch.category : f.category,
              };
            });

            return {
              ...proj,
              findings: reindexProjectFindings(updated),
            };
          }),
        }));
      },

      deleteProjectFinding: (projectId, findingId) => {
        if (!projectId || !findingId) return;

        set((state) => ({
          projects: (state.projects ?? []).map((proj) => {
            if (proj.id !== projectId) return proj;
            const filtered = (proj.findings ?? []).filter(
              (f) => f.id !== findingId
            );
            return {
              ...proj,
              findings: reindexProjectFindings(filtered),
            };
          }),
        }));
      },

      addActivityToProject: (projectId, activityName, customData) => {
        const state = get();
        const sessionData = customData ?? {
          participants: state.currentSession?.participants ?? [],
          findings: state.currentSession?.findings ?? [],
          votes: state.currentSession?.votes ?? [],
          results:
            (state.currentSession?.results?.length ?? 0) > 0
              ? state.currentSession.results
              : state.calculateResults(),
        };

        const newActivity: Activity = {
          id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          type: 'priorization_matrix',
          name: activityName.trim(),
          createdAt: new Date().toISOString(),
          data: JSON.parse(JSON.stringify(sessionData)),
        };

        let found = false;
        set((prev) => ({
          projects: (prev.projects ?? []).map((project) => {
            if (project.id === projectId) {
              found = true;
              // También sincronizar hallazgos de la actividad con el repositorio central del proyecto
              const currentRepo = Array.isArray(project.findings)
                ? [...project.findings]
                : [];
              const existingTitles = new Set(
                currentRepo.map((f) => f.title.trim().toLowerCase())
              );

              (sessionData.findings ?? []).forEach((sf, idx) => {
                const t = (sf.title ?? '').trim();
                if (t && !existingTitles.has(t.toLowerCase())) {
                  existingTitles.add(t.toLowerCase());
                  currentRepo.push({
                    id: `pf-sync-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
                    code: `F${String(currentRepo.length + 1).padStart(2, '0')}`,
                    title: t,
                    description: sf.description ?? '',
                    category: sf.category || FINDING_CATEGORIES[0],
                  });
                }
              });

              return {
                ...project,
                findings: reindexProjectFindings(currentRepo),
                activities: [newActivity, ...(project.activities ?? [])],
              };
            }
            return project;
          }),
        }));

        return found ? newActivity : null;
      },

      deleteProject: (projectId: string) => {
        if (!projectId) return;
        set((state) => {
          const remainingSessions = (state.assumptionSessions ?? []).filter(
            (s) => s.projectId !== projectId
          );
          const isActiveRemoved = (state.assumptionSessions ?? []).some(
            (s) =>
              s.projectId === projectId &&
              s.id === state.activeAssumptionSessionId
          );

          return {
            projects: (state.projects ?? []).filter((p) => p.id !== projectId),
            assumptionSessions: remainingSessions,
            activeAssumptionSessionId: isActiveRemoved
              ? null
              : state.activeAssumptionSessionId,
          };
        });
      },

      deleteActivity: (
        projectId: string,
        activityId: string,
        activityType: 'prioritization' | 'assumption'
      ) => {
        if (!activityId) return;
        set((state) => {
          if (activityType === 'assumption') {
            const remainingSessions = (state.assumptionSessions ?? []).filter(
              (s) => s.id !== activityId
            );
            return {
              assumptionSessions: remainingSessions,
              activeAssumptionSessionId:
                state.activeAssumptionSessionId === activityId
                  ? null
                  : state.activeAssumptionSessionId,
            };
          }

          return {
            projects: (state.projects ?? []).map((proj) => {
              if (proj.id !== projectId) return proj;
              return {
                ...proj,
                activities: (proj.activities ?? []).filter(
                  (act) => act.id !== activityId
                ),
              };
            }),
          };
        });
      },

      setSessionProjectId: (projectId: string) => {
        set((state) => ({
          currentSession: {
            ...createInitialSession(),
            ...state.currentSession,
            projectId,
          },
        }));
      },

      addParticipant: (name: string) => {
        const cleanName = name.trim();
        if (!cleanName) return;

        set((state) => {
          const currentParticipants = state.currentSession?.participants ?? [];
          const currentVotes = state.currentSession?.votes ?? [];

          const exists = currentParticipants.some(
            (p) => p.toLowerCase() === cleanName.toLowerCase()
          );
          if (exists) return state;

          const updatedParticipants = [...currentParticipants, cleanName];
          const updatedVotes = [
            ...currentVotes,
            { participantName: cleanName, positions: {} },
          ];

          return {
            currentSession: {
              ...createInitialSession(),
              ...state.currentSession,
              participants: updatedParticipants,
              votes: updatedVotes,
            },
          };
        });
      },

      removeParticipant: (name: string) => {
        set((state) => {
          const currentParticipants = state.currentSession?.participants ?? [];
          const currentVotes = state.currentSession?.votes ?? [];

          const updatedParticipants = currentParticipants.filter(
            (p) => p !== name
          );
          const updatedVotes = currentVotes.filter(
            (v) => v.participantName !== name
          );

          return {
            currentSession: {
              ...createInitialSession(),
              ...state.currentSession,
              participants: updatedParticipants,
              votes: updatedVotes,
              currentParticipantIndex: 0,
            },
          };
        });
      },

      addFinding: ({ title, category, description }, explicitProjectId) => {
        const cleanTitle = title.trim();
        if (!cleanTitle) return;

        set((state) => {
          const currentFindings = state.currentSession?.findings ?? [];
          const nextNumber = currentFindings.length + 1;
          const formattedCode = `ID${String(nextNumber).padStart(2, '0')}`;
          const cleanDesc = (description ?? '').trim().slice(0, 300);
          const cleanCat = category?.trim() || FINDING_CATEGORIES[0];

          const newFinding: PrioritizationFinding = {
            id: `finding-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            code: formattedCode,
            title: cleanTitle.slice(0, 80),
            category: cleanCat,
            description: cleanDesc,
            scores: { relevance: 0, feasibility: 0 },
          };

          const targetProjectId =
            explicitProjectId ?? state.currentSession?.projectId;

          const updatedProjects = targetProjectId
            ? (state.projects ?? []).map((proj) => {
                if (proj.id !== targetProjectId) return proj;
                const repo = Array.isArray(proj.findings) ? proj.findings : [];
                const alreadyInRepo = repo.some(
                  (f) =>
                    f.title.trim().toLowerCase() === cleanTitle.toLowerCase()
                );
                if (alreadyInRepo) return proj;
                const repoFinding: Finding = {
                  id: `pf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                  code: `F${String(repo.length + 1).padStart(2, '0')}`,
                  title: cleanTitle.slice(0, 80),
                  description: cleanDesc,
                  category: cleanCat,
                };
                return {
                  ...proj,
                  findings: reindexProjectFindings([...repo, repoFinding]),
                };
              })
            : state.projects;

          return {
            projects: updatedProjects,
            currentSession: {
              ...createInitialSession(),
              ...state.currentSession,
              findings: [...currentFindings, newFinding],
            },
          };
        });
      },

      removeFinding: (id: string) => {
        set((state) => {
          const currentFindings = state.currentSession?.findings ?? [];
          const currentVotes = state.currentSession?.votes ?? [];

          const filtered = currentFindings.filter((f) => f.id !== id);
          const reindexedFindings = reindexPrioritizationFindings(filtered);

          const cleanedVotes = currentVotes.map((vote) => {
            const nextPositions = { ...(vote.positions ?? {}) };
            delete nextPositions[id];
            return {
              ...vote,
              positions: nextPositions,
            };
          });

          return {
            currentSession: {
              ...createInitialSession(),
              ...state.currentSession,
              findings: reindexedFindings,
              votes: cleanedVotes,
            },
          };
        });
      },

      importFindingsToPrioritization: (findingsToImport: Finding[]) => {
        if (!Array.isArray(findingsToImport) || findingsToImport.length === 0) {
          return 0;
        }

        const state = get();
        const currentFindings = state.currentSession?.findings ?? [];
        const existingTitles = new Set(
          currentFindings.map((f) => f.title.trim().toLowerCase())
        );

        const toAdd: PrioritizationFinding[] = [];
        findingsToImport.forEach((item, idx) => {
          const cleanTitle = (item?.title ?? '').trim();
          if (!cleanTitle) return;
          const lower = cleanTitle.toLowerCase();
          if (existingTitles.has(lower)) return;
          existingTitles.add(lower);

          toAdd.push({
            id: `finding-imp-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
            code: 'ID00',
            title: cleanTitle.slice(0, 80),
            description: (item.description ?? '').trim().slice(0, 300),
            category: item.category || FINDING_CATEGORIES[0],
            scores: { relevance: 0, feasibility: 0 },
          });
        });

        if (toAdd.length === 0) return 0;

        set((prev) => ({
          currentSession: {
            ...createInitialSession(),
            ...prev.currentSession,
            findings: reindexPrioritizationFindings([
              ...(prev.currentSession?.findings ?? []),
              ...toAdd,
            ]),
          },
        }));

        return toAdd.length;
      },

      setFindingPosition: (
        participantName: string,
        findingId: string,
        coordinate: Coordinate
      ) => {
        if (!participantName || !findingId) return;

        const clampedCoordinate: Coordinate = {
          relevance: roundToTwo(Math.max(-5, Math.min(5, coordinate.relevance))),
          feasibility: roundToTwo(
            Math.max(-5, Math.min(5, coordinate.feasibility))
          ),
        };

        set((state) => {
          const currentVotes = state.currentSession?.votes ?? [];
          const existingVoteIndex = currentVotes.findIndex(
            (v) => v.participantName === participantName
          );

          const updatedVotes = [...currentVotes];

          if (existingVoteIndex >= 0) {
            const currentVote = updatedVotes[existingVoteIndex];
            updatedVotes[existingVoteIndex] = {
              ...currentVote,
              positions: {
                ...(currentVote.positions ?? {}),
                [findingId]: clampedCoordinate,
              },
            };
          } else {
            updatedVotes.push({
              participantName,
              positions: {
                [findingId]: clampedCoordinate,
              },
            });
          }

          return {
            currentSession: {
              ...createInitialSession(),
              ...state.currentSession,
              votes: updatedVotes,
            },
          };
        });
      },

      nextParticipantTurn: () => {
        set((state) => {
          const participantsCount =
            state.currentSession?.participants?.length ?? 0;
          const currentIdx =
            state.currentSession?.currentParticipantIndex ?? 0;
          const nextIdx = Math.min(
            currentIdx + 1,
            Math.max(0, participantsCount - 1)
          );
          return {
            currentSession: {
              ...createInitialSession(),
              ...state.currentSession,
              currentParticipantIndex: nextIdx,
            },
          };
        });
      },

      setCurrentParticipantIndex: (index: number) => {
        set((state) => {
          const participantsCount =
            state.currentSession?.participants?.length ?? 0;
          const safeIndex =
            participantsCount > 0
              ? Math.max(0, Math.min(index, participantsCount - 1))
              : 0;
          return {
            currentSession: {
              ...createInitialSession(),
              ...state.currentSession,
              currentParticipantIndex: safeIndex,
            },
          };
        });
      },

      calculateResults: () => {
        const state = get();
        const findings = state.currentSession?.findings ?? [];
        const participants = state.currentSession?.participants ?? [];
        const votes = state.currentSession?.votes ?? [];
        const participantCount = participants.length;

        if (findings.length === 0 || participantCount === 0) {
          set((prev) => ({
            currentSession: {
              ...createInitialSession(),
              ...prev.currentSession,
              results: [],
            },
          }));
          return [];
        }

        const calculatedResults: FindingResult[] = findings.map((finding) => {
          let sumRelevance = 0;
          let sumFeasibility = 0;

          participants.forEach((participantName) => {
            const participantVote = votes.find(
              (v) => v.participantName === participantName
            );
            const coord = participantVote?.positions?.[finding.id];
            if (coord) {
              sumRelevance += coord.relevance;
              sumFeasibility += coord.feasibility;
            }
          });

          const avgRelevance = roundToTwo(sumRelevance / participantCount);
          const avgFeasibility = roundToTwo(sumFeasibility / participantCount);
          const quadrant = determineQuadrant(avgRelevance, avgFeasibility);

          return {
            findingId: finding.id,
            avgRelevance,
            avgFeasibility,
            quadrant,
          };
        });

        set((prev) => ({
          currentSession: {
            ...createInitialSession(),
            ...prev.currentSession,
            findings: (prev.currentSession?.findings ?? []).map((f) => {
              const res = calculatedResults.find((r) => r.findingId === f.id);
              return res
                ? {
                    ...f,
                    scores: {
                      relevance: res.avgRelevance,
                      feasibility: res.avgFeasibility,
                    },
                  }
                : f;
            }),
            results: calculatedResults,
          },
        }));

        return calculatedResults;
      },

      resetSession: () => {
        set({
          currentSession: createInitialSession(),
        });
      },

      loadActivityIntoSession: (
        data: PrioritizationActivityData,
        projectId?: string
      ) => {
        set({
          currentSession: {
            participants: [...(data?.participants ?? [])],
            findings: reindexPrioritizationFindings([
              ...(data?.findings ?? []),
            ]),
            votes: JSON.parse(JSON.stringify(data?.votes ?? [])),
            results: [...(data?.results ?? [])],
            currentParticipantIndex: 0,
            projectId,
          },
        });
      },

      createAssumptionSession: ({ projectId, title, findings = [] }) => {
        const cleanTitle =
          title.trim() ||
          `Mapa de Supuestos (${new Date().toLocaleDateString('es-ES')})`;

        const initialFindings: AssumptionFinding[] = reindexAssumptionFindings(
          findings.map((f, idx) => ({
            id: `af-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
            code: `S${String(idx + 1).padStart(2, '0')}`,
            title: f.title.trim().slice(0, 80),
            description: (f.description ?? '').trim().slice(0, 300),
            category: f.category || FINDING_CATEGORIES[0],
            coordinates: f.coordinates,
          }))
        );

        const newSession: AssumptionSession = {
          id: `asess-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          projectId,
          title: cleanTitle,
          date: new Date().toISOString(),
          findings: initialFindings,
          isCompleted: false,
        };

        set((state) => {
          // También sincronizar los hallazgos iniciales con el repositorio central del proyecto
          const updatedProjects = projectId
            ? (state.projects ?? []).map((proj) => {
                if (proj.id !== projectId) return proj;
                const repo = Array.isArray(proj.findings)
                  ? [...proj.findings]
                  : [];
                const seen = new Set(
                  repo.map((r) => r.title.trim().toLowerCase())
                );
                initialFindings.forEach((inf, idx) => {
                  const key = inf.title.trim().toLowerCase();
                  if (!seen.has(key)) {
                    seen.add(key);
                    repo.push({
                      id: `pf-as-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
                      code: `F${String(repo.length + 1).padStart(2, '0')}`,
                      title: inf.title,
                      description: inf.description ?? '',
                      category: inf.category,
                    });
                  }
                });
                return {
                  ...proj,
                  findings: reindexProjectFindings(repo),
                };
              })
            : state.projects;

          return {
            projects: updatedProjects,
            assumptionSessions: [
              newSession,
              ...(state.assumptionSessions ?? []),
            ],
            activeAssumptionSessionId: newSession.id,
          };
        });

        return newSession;
      },

      setActiveAssumptionSession: (sessionId) => {
        set({ activeAssumptionSessionId: sessionId });
      },

      updateAssumptionSessionMeta: (sessionId, patch) => {
        set((state) => ({
          assumptionSessions: (state.assumptionSessions ?? []).map((sess) => {
            if (sess.id !== sessionId) return sess;
            return {
              ...sess,
              title: patch.title !== undefined ? patch.title : sess.title,
              projectId:
                patch.projectId !== undefined
                  ? patch.projectId
                  : sess.projectId,
            };
          }),
        }));
      },

      addFindingToAssumption: (finding, sessionId) => {
        const cleanTitle = finding.title.trim();
        if (!cleanTitle) return;

        set((state) => {
          const targetId = sessionId ?? state.activeAssumptionSessionId;
          if (!targetId) return state;

          const targetSession = (state.assumptionSessions ?? []).find(
            (s) => s.id === targetId
          );
          if (!targetSession) return state;

          const cleanDesc = (finding.description ?? '').trim().slice(0, 300);
          const cleanCat = finding.category?.trim() || FINDING_CATEGORIES[0];

          const updatedSessions = (state.assumptionSessions ?? []).map(
            (sess) => {
              if (sess.id !== targetId) return sess;

              const newFinding: AssumptionFinding = {
                id: `af-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                code: 'S00',
                title: cleanTitle.slice(0, 80),
                description: cleanDesc,
                category: cleanCat,
                coordinates: finding.coordinates,
              };

              const updated = reindexAssumptionFindings([
                ...(sess.findings ?? []),
                newFinding,
              ]);

              return {
                ...sess,
                findings: updated,
              };
            }
          );

          // Sincronizar también en el repositorio central del proyecto asociado
          const updatedProjects = targetSession.projectId
            ? (state.projects ?? []).map((proj) => {
                if (proj.id !== targetSession.projectId) return proj;
                const repo = Array.isArray(proj.findings) ? proj.findings : [];
                const exists = repo.some(
                  (f) =>
                    f.title.trim().toLowerCase() === cleanTitle.toLowerCase()
                );
                if (exists) return proj;
                const repoFinding: Finding = {
                  id: `pf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                  code: `F${String(repo.length + 1).padStart(2, '0')}`,
                  title: cleanTitle.slice(0, 80),
                  description: cleanDesc,
                  category: cleanCat,
                };
                return {
                  ...proj,
                  findings: reindexProjectFindings([...repo, repoFinding]),
                };
              })
            : state.projects;

          return {
            projects: updatedProjects,
            assumptionSessions: updatedSessions,
          };
        });
      },

      removeFindingFromAssumption: (findingId, sessionId) => {
        set((state) => {
          const targetId = sessionId ?? state.activeAssumptionSessionId;
          if (!targetId) return state;

          return {
            assumptionSessions: (state.assumptionSessions ?? []).map((sess) => {
              if (sess.id !== targetId) return sess;

              const filtered = (sess.findings ?? []).filter(
                (f) => f.id !== findingId
              );

              return {
                ...sess,
                findings: reindexAssumptionFindings(filtered),
              };
            }),
          };
        });
      },

      importFindingsToAssumption: (source, sessionId) => {
        const state = get();
        const targetId = sessionId ?? state.activeAssumptionSessionId;
        if (!targetId) return 0;

        const targetSession = (state.assumptionSessions ?? []).find(
          (s) => s.id === targetId
        );
        if (!targetSession) return 0;

        let rawFindings: (Finding | AssumptionFinding)[] = [];

        if (Array.isArray(source.findings) && source.findings.length > 0) {
          rawFindings = source.findings;
        } else if (source.projectId) {
          const proj = (state.projects ?? []).find(
            (p) => p.id === source.projectId
          );
          if (proj) {
            rawFindings = Array.isArray(proj.findings) ? proj.findings : [];
          }
        } else if (source.activityId) {
          for (const proj of state.projects ?? []) {
            const act = (proj.activities ?? []).find(
              (a) => a.id === source.activityId
            );
            if (act?.data?.findings) {
              rawFindings = act.data.findings;
              break;
            }
          }
        }

        if (rawFindings.length === 0) return 0;

        const existingTitles = new Set(
          (targetSession.findings ?? []).map((f) => f.title.trim().toLowerCase())
        );

        const importedToAdd: AssumptionFinding[] = [];
        rawFindings.forEach((item, idx) => {
          const cleanTitle = (item.title ?? '').trim();
          if (!cleanTitle) return;
          const lower = cleanTitle.toLowerCase();
          if (existingTitles.has(lower)) return;
          existingTitles.add(lower);

          importedToAdd.push({
            id: `af-imp-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
            code: 'S00',
            title: cleanTitle.slice(0, 80),
            description: (item.description ?? '').trim().slice(0, 300),
            category: item.category || FINDING_CATEGORIES[0],
            coordinates: undefined,
          });
        });

        if (importedToAdd.length === 0) return 0;

        set((prev) => ({
          assumptionSessions: (prev.assumptionSessions ?? []).map((sess) => {
            if (sess.id !== targetId) return sess;
            const merged = reindexAssumptionFindings([
              ...(sess.findings ?? []),
              ...importedToAdd,
            ]);
            return {
              ...sess,
              findings: merged,
            };
          }),
        }));

        return importedToAdd.length;
      },

      updateFindingCoordinates: (findingId, coordinates, sessionId) => {
        const clamped: AssumptionCoordinate = {
          x: roundToTwo(Math.max(-5, Math.min(5, coordinates.x))),
          y: roundToTwo(Math.max(-5, Math.min(5, coordinates.y))),
        };

        set((state) => {
          const targetId = sessionId ?? state.activeAssumptionSessionId;
          if (!targetId) return state;

          return {
            assumptionSessions: (state.assumptionSessions ?? []).map((sess) => {
              if (sess.id !== targetId) return sess;
              return {
                ...sess,
                findings: (sess.findings ?? []).map((f) =>
                  f.id === findingId ? { ...f, coordinates: clamped } : f
                ),
              };
            }),
          };
        });
      },

      completeAssumptionSession: (sessionId) => {
        set((state) => {
          const targetId = sessionId ?? state.activeAssumptionSessionId;
          if (!targetId) return state;

          return {
            assumptionSessions: (state.assumptionSessions ?? []).map((sess) =>
              sess.id === targetId ? { ...sess, isCompleted: true } : sess
            ),
          };
        });
      },
    }),
    {
      name: 'datacorp-research-storage',
      version: 4,
      migrate: (persistedState: unknown) => {
        const raw = persistedState as Partial<ResearchStoreState> | undefined;
        return {
          projects: normalizeProjects(raw?.projects),
          assumptionSessions: Array.isArray(raw?.assumptionSessions)
            ? raw!.assumptionSessions
            : [],
          activeAssumptionSessionId:
            typeof raw?.activeAssumptionSessionId === 'string'
              ? raw.activeAssumptionSessionId
              : null,
          currentSession: {
            ...createInitialSession(),
            ...(raw?.currentSession ?? {}),
            participants: Array.isArray(raw?.currentSession?.participants)
              ? raw!.currentSession!.participants
              : [],
            findings: Array.isArray(raw?.currentSession?.findings)
              ? reindexPrioritizationFindings(raw!.currentSession!.findings)
              : [],
            votes: Array.isArray(raw?.currentSession?.votes)
              ? raw!.currentSession!.votes
              : [],
            results: Array.isArray(raw?.currentSession?.results)
              ? raw!.currentSession!.results
              : [],
            currentParticipantIndex:
              typeof raw?.currentSession?.currentParticipantIndex === 'number'
                ? raw.currentSession.currentParticipantIndex
                : 0,
            projectId:
              typeof raw?.currentSession?.projectId === 'string'
                ? raw.currentSession.projectId
                : undefined,
          },
        };
      },
      merge: (persistedState, currentState) => {
        const raw = persistedState as Partial<ResearchStoreState> | undefined;
        return {
          ...currentState,
          projects: normalizeProjects(raw?.projects),
          assumptionSessions: Array.isArray(raw?.assumptionSessions)
            ? raw!.assumptionSessions
            : [],
          activeAssumptionSessionId:
            typeof raw?.activeAssumptionSessionId === 'string'
              ? raw.activeAssumptionSessionId
              : null,
          currentSession: {
            ...createInitialSession(),
            ...(raw?.currentSession ?? {}),
            participants: Array.isArray(raw?.currentSession?.participants)
              ? raw!.currentSession!.participants
              : [],
            findings: Array.isArray(raw?.currentSession?.findings)
              ? reindexPrioritizationFindings(raw!.currentSession!.findings)
              : [],
            votes: Array.isArray(raw?.currentSession?.votes)
              ? raw!.currentSession!.votes
              : [],
            results: Array.isArray(raw?.currentSession?.results)
              ? raw!.currentSession!.results
              : [],
            currentParticipantIndex:
              typeof raw?.currentSession?.currentParticipantIndex === 'number'
                ? raw.currentSession.currentParticipantIndex
                : 0,
            projectId:
              typeof raw?.currentSession?.projectId === 'string'
                ? raw.currentSession.projectId
                : undefined,
          },
        };
      },
    }
  )
);
