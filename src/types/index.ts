export type QuadrantType = 'quick_win' | 'strategic' | 'operational_fill' | 'discard';

export type FindingCategory =
  | 'saas_dataviz'
  | 'saas_busqueda'
  | 'saas_supply_chain'
  | 'saas_onboarding'
  | 'saas_calidad'
  | 'daas_calidad'
  | 'daas_cobertura'
  | 'daas_interoperabilidad'
  | 'daas_rendimiento'
  | 'daas_enriquecimiento';

export const FINDING_CATEGORY_LABELS: Record<FindingCategory, string> = {
  saas_dataviz: 'Dataviz y BI',
  saas_busqueda: 'Experiencia de búsqueda y filtros',
  saas_supply_chain: 'Supply Chain Analytics',
  saas_onboarding: 'Onboarding y alfabetización',
  saas_calidad: 'Calidad de datos (SaaS)',
  daas_calidad: 'Calidad de datos (DaaS)',
  daas_cobertura: 'Cobertura y profundidad',
  daas_interoperabilidad: 'Interoperabilidad (APIs)',
  daas_rendimiento: 'Disponibilidad y rendimiento',
  daas_enriquecimiento: 'Enriquecimiento de datos',
};

export const FINDING_CATEGORY_GROUPS: {
  label: string;
  options: { value: FindingCategory; label: string }[];
}[] = [
  {
    label: 'SaaS (Software / UX)',
    options: [
      { value: 'saas_dataviz', label: 'Dataviz y BI' },
      { value: 'saas_busqueda', label: 'Experiencia de búsqueda y filtros' },
      { value: 'saas_supply_chain', label: 'Supply Chain Analytics' },
      { value: 'saas_onboarding', label: 'Onboarding y alfabetización' },
      { value: 'saas_calidad', label: 'Calidad de datos (SaaS)' },
    ],
  },
  {
    label: 'DaaS (Data / Infraestructura)',
    options: [
      { value: 'daas_calidad', label: 'Calidad de datos (DaaS)' },
      { value: 'daas_cobertura', label: 'Cobertura y profundidad' },
      { value: 'daas_interoperabilidad', label: 'Interoperabilidad (APIs)' },
      { value: 'daas_rendimiento', label: 'Disponibilidad y rendimiento' },
      { value: 'daas_enriquecimiento', label: 'Enriquecimiento de datos' },
    ],
  },
];

export const FINDING_CATEGORIES: FindingCategory[] = [
  'saas_dataviz',
  'saas_busqueda',
  'saas_supply_chain',
  'saas_onboarding',
  'saas_calidad',
  'daas_calidad',
  'daas_cobertura',
  'daas_interoperabilidad',
  'daas_rendimiento',
  'daas_enriquecimiento',
];

export const getFindingCategoryLabel = (category: string): string => {
  return (
    FINDING_CATEGORY_LABELS[category as FindingCategory] ?? category
  );
};

export const getFindingCategoryBadgeStyle = (category: string): string => {
  if (category.startsWith('saas_')) {
    return 'bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-500/20';
  }
  if (category.startsWith('daas_')) {
    return 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-500/20';
  }
  return 'bg-slate-100 text-slate-600';
};

export interface Finding {
  id: string;
  code: string; // Generado secuencialmente como "ID01", "ID02", etc.
  title: string;
  description: string;
  category: FindingCategory | string;
}

export interface Coordinate {
  relevance: number; // Rango [-5, 5], redondeado a 2 decimales
  feasibility: number; // Rango [-5, 5], redondeado a 2 decimales
}

export interface PrioritizationFinding extends Finding {
  scores?: Coordinate;
}

export interface ParticipantVote {
  participantName: string;
  positions: Record<string, Coordinate>; // Mapea finding.id -> Coordinate
}

export interface FindingResult {
  findingId: string;
  avgRelevance: number;
  avgFeasibility: number;
  quadrant: QuadrantType;
}

export interface PrioritizationActivityData {
  participants: string[];
  findings: PrioritizationFinding[];
  votes: ParticipantVote[];
  results: FindingResult[];
}

export interface Activity {
  id: string;
  type: 'priorization_matrix';
  name: string;
  createdAt: string;
  data: PrioritizationActivityData;
}

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  findings: Finding[];
  activities: Activity[];
}

export type AssumptionQuadrantType =
  | 'investigate'
  | 'execute'
  | 'secondary'
  | 'discard';

export interface AssumptionCoordinate {
  x: number; // Evidencia [-5, 5]
  y: number; // Riesgo [-5, 5]
}

export interface AssumptionFinding extends Finding {
  coordinates?: AssumptionCoordinate;
}

export interface AssumptionSession {
  id: string;
  projectId: string;
  title: string;
  date: string;
  findings: AssumptionFinding[];
  isCompleted: boolean;
}

