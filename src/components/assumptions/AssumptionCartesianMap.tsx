import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AssumptionCoordinate,
  AssumptionQuadrantType,
} from '../../types';
import { determineAssumptionQuadrant } from '../../store/useResearchStore';
import {
  Search,
  Rocket,
  CalendarClock,
  Archive,
  Crosshair,
  Move,
} from 'lucide-react';

export interface AssumptionMapNodeItem {
  id: string;
  code: string;
  title: string;
  category?: string;
  coordinates: AssumptionCoordinate;
  isSelected?: boolean;
}

interface AssumptionCartesianMapProps {
  nodes: AssumptionMapNodeItem[];
  selectedFindingId?: string | null;
  selectedFindingCode?: string | null;
  interactive?: boolean;
  showCoordinates?: boolean;
  onSelectCoordinate?: (coordinate: AssumptionCoordinate) => void;
  onUpdateNodeCoordinate?: (
    findingId: string,
    coordinate: AssumptionCoordinate
  ) => void;
  onSelectNode?: (findingId: string) => void;
}

const roundToTwo = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

export const assumptionCoordToPercent = (coordinate: AssumptionCoordinate) => {
  const x = Number(coordinate?.x ?? 0);
  const y = Number(coordinate?.y ?? 0);
  const left = ((x + 5) / 10) * 100;
  const top = ((5 - y) / 10) * 100;
  return {
    left: `${Math.max(2, Math.min(98, left))}%`,
    top: `${Math.max(2, Math.min(98, top))}%`,
  };
};

export const ASSUMPTION_QUADRANT_INFO: Record<
  AssumptionQuadrantType,
  {
    label: string;
    shortTitle: string;
    subtitle: string;
    badgeBg: string;
    nodeBg: string;
  }
> = {
  investigate: {
    label: 'INVESTIGAR (Riesgo Alto / Evidencia Baja)',
    shortTitle: 'Investigar Urgente',
    subtitle: 'Riesgo Alto • Evidencia Baja',
    badgeBg: 'bg-rose-100 text-rose-800 ring-1 ring-rose-500/30',
    nodeBg:
      'bg-rose-600 text-white border-white ring-4 ring-rose-500/25 shadow-md',
  },
  execute: {
    label: 'EJECUTAR (Riesgo Alto / Evidencia Alta)',
    shortTitle: 'Ejecutar (Directo a Backlog)',
    subtitle: 'Riesgo Alto • Evidencia Alta',
    badgeBg: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-500/30',
    nodeBg:
      'bg-emerald-600 text-white border-white ring-4 ring-emerald-500/25 shadow-md',
  },
  secondary: {
    label: 'SECUNDARIO / PLANIFICAR (Riesgo Bajo / Evidencia Alta)',
    shortTitle: 'Seguimiento Secundario',
    subtitle: 'Riesgo Bajo • Evidencia Alta',
    badgeBg: 'bg-sky-100 text-sky-800 ring-1 ring-sky-500/30',
    nodeBg:
      'bg-sky-600 text-white border-white ring-4 ring-sky-500/25 shadow-md',
  },
  discard: {
    label: 'DESCARTAR (Riesgo Bajo / Evidencia Baja)',
    shortTitle: 'Descartar',
    subtitle: 'Riesgo Bajo • Evidencia Baja',
    badgeBg: 'bg-slate-200 text-slate-700 ring-1 ring-slate-400/30',
    nodeBg:
      'bg-slate-600 text-white border-white ring-4 ring-slate-500/25 shadow-md',
  },
};

export const AssumptionCartesianMap: React.FC<AssumptionCartesianMapProps> = ({
  nodes = [],
  selectedFindingId,
  selectedFindingCode,
  interactive = true,
  showCoordinates = true,
  onSelectCoordinate,
  onUpdateNodeCoordinate,
  onSelectNode,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoverCoord, setHoverCoord] = useState<AssumptionCoordinate | null>(
    null
  );
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const didDragRef = useRef<boolean>(false);

  const computeCoordinateFromClientXY = (
    clientX: number,
    clientY: number
  ): AssumptionCoordinate | null => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;

    const pxX = clientX - rect.left;
    const pxY = clientY - rect.top;

    const rawX = (pxX / rect.width) * 10 - 5;
    const rawY = 5 - (pxY / rect.height) * 10;

    return {
      x: roundToTwo(Math.max(-5, Math.min(5, rawX))),
      y: roundToTwo(Math.max(-5, Math.min(5, rawY))),
    };
  };

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }
    if (!interactive || !onSelectCoordinate || !selectedFindingId) return;
    const coord = computeCoordinateFromClientXY(e.clientX, e.clientY);
    if (coord) {
      onSelectCoordinate(coord);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive) return;
    const coord = computeCoordinateFromClientXY(e.clientX, e.clientY);
    setHoverCoord(coord);

    if (draggingNodeId && coord) {
      didDragRef.current = true;
      if (onUpdateNodeCoordinate) {
        onUpdateNodeCoordinate(draggingNodeId, coord);
      } else if (onSelectCoordinate) {
        onSelectCoordinate(coord);
      }
    }
  };

  const handleMouseUp = () => {
    if (draggingNodeId) {
      setDraggingNodeId(null);
    }
  };

  const handleMouseLeave = () => {
    setHoverCoord(null);
    if (draggingNodeId) {
      setDraggingNodeId(null);
    }
  };

  const ticks = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5];

  const activeHoverQuadrant: AssumptionQuadrantType | null = hoverCoord
    ? determineAssumptionQuadrant(hoverCoord.x, hoverCoord.y)
    : null;

  const getNodeStyle = (node: AssumptionMapNodeItem) => {
    const q = determineAssumptionQuadrant(
      Number(node.coordinates?.x ?? 0),
      Number(node.coordinates?.y ?? 0)
    );

    if (node.isSelected || draggingNodeId === node.id) {
      return 'bg-indigo-600 text-white ring-4 ring-indigo-500/35 border-white scale-110 z-30 shadow-lg shadow-indigo-500/40';
    }

    return `${ASSUMPTION_QUADRANT_INFO[q].nodeBg} hover:scale-110 z-20`;
  };

  return (
    <div className="flex flex-col items-center w-full">
      {/* Top Axis Info & Dynamic Quadrant Indicator */}
      <div className="mb-2.5 flex w-full max-w-[600px] flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-500 px-1">
        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-slate-500">
          {showCoordinates
            ? 'EJE Y: RIESGO DE NEGOCIO [-5 a +5]'
            : 'EJE Y: RIESGO DE NEGOCIO'}
        </span>

        {interactive && (
          <div className="flex items-center gap-2">
            {hoverCoord && activeHoverQuadrant ? (
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${ASSUMPTION_QUADRANT_INFO[activeHoverQuadrant].badgeBg}`}
                >
                  {ASSUMPTION_QUADRANT_INFO[activeHoverQuadrant].shortTitle}
                </span>
                {showCoordinates && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 font-mono text-[11px] font-bold text-indigo-700 ring-1 ring-indigo-500/20">
                    <Crosshair className="h-3 w-3 text-indigo-500" />
                    Evidencia:{' '}
                    {hoverCoord.x > 0
                      ? `+${hoverCoord.x.toFixed(2)}`
                      : hoverCoord.x.toFixed(2)}{' '}
                    | Riesgo:{' '}
                    {hoverCoord.y > 0
                      ? `+${hoverCoord.y.toFixed(2)}`
                      : hoverCoord.y.toFixed(2)}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-xs text-slate-400">
                {selectedFindingId
                  ? `Haz clic o arrastra en el plano para ubicar ${selectedFindingCode ?? ''}`
                  : 'Haz clic o arrastra las tarjetas para ubicarlas'}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Square Cartesian Plane Wrapper */}
      <div
        ref={containerRef}
        onClick={handleMapClick}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        className={`relative aspect-square w-full max-w-[600px] select-none overflow-hidden rounded-2xl border-2 transition-all duration-200 ${
          draggingNodeId
            ? 'cursor-grabbing border-indigo-500 bg-white shadow-xl shadow-indigo-500/15'
            : interactive && selectedFindingId
            ? 'cursor-crosshair border-indigo-400/90 bg-white shadow-xl shadow-indigo-500/10'
            : 'border-slate-200/90 bg-white shadow-sm'
        }`}
      >
        {/* Subtle Quadrant Tints & Corner Watermarks */}
        <div className="pointer-events-none absolute inset-0 grid grid-cols-2 grid-rows-2">
          {/* Top-Left: INVESTIGAR (Riesgo Alto / Evidencia Baja) -> Tono rojizo tenue */}
          <div className="border-r border-b border-slate-200/60 bg-gradient-to-br from-rose-500/[0.08] via-rose-500/[0.03] to-transparent p-3.5 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 self-start rounded-md bg-rose-50/95 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-rose-700 ring-1 ring-rose-500/25 shadow-sm">
                <Search className="h-3 w-3 text-rose-600" />
                INVESTIGAR
              </div>
              <p className="text-[10px] font-semibold text-rose-700/75 pl-0.5">
                Riesgo Alto / Evidencia Baja
              </p>
            </div>
            <span className="font-mono text-[22px] font-black uppercase tracking-tighter text-rose-500/10 select-none">
              INVESTIGAR
            </span>
          </div>

          {/* Top-Right: EJECUTAR (Riesgo Alto / Evidencia Alta) -> Tono verde/esmeralda tenue */}
          <div className="border-b border-slate-200/60 bg-gradient-to-bl from-emerald-500/[0.08] via-emerald-500/[0.03] to-transparent p-3.5 flex flex-col justify-between items-end text-right">
            <div className="space-y-1 flex flex-col items-end">
              <div className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50/95 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 ring-1 ring-emerald-500/25 shadow-sm">
                <Rocket className="h-3 w-3 text-emerald-600" />
                EJECUTAR
              </div>
              <p className="text-[10px] font-semibold text-emerald-700/75 pr-0.5">
                Riesgo Alto / Evidencia Alta
              </p>
            </div>
            <span className="font-mono text-[22px] font-black uppercase tracking-tighter text-emerald-600/10 select-none">
              EJECUTAR
            </span>
          </div>

          {/* Bottom-Left: DESCARTAR (Riesgo Bajo / Evidencia Baja) -> Tono gris tenue */}
          <div className="border-r border-slate-200/60 bg-gradient-to-tr from-slate-500/[0.08] via-slate-400/[0.03] to-transparent p-3.5 flex flex-col justify-between">
            <span className="font-mono text-[22px] font-black uppercase tracking-tighter text-slate-500/10 select-none">
              DESCARTAR
            </span>
            <div className="space-y-1">
              <p className="text-[10px] font-semibold text-slate-500/80 pl-0.5">
                Riesgo Bajo / Evidencia Baja
              </p>
              <div className="inline-flex items-center gap-1.5 self-start rounded-md bg-slate-100/95 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-700 ring-1 ring-slate-400/30 shadow-sm">
                <Archive className="h-3 w-3 text-slate-600" />
                DESCARTAR
              </div>
            </div>
          </div>

          {/* Bottom-Right: SECUNDARIO/PLANIFICAR (Riesgo Bajo / Evidencia Alta) -> Tono azul/ámbar tenue */}
          <div className="bg-gradient-to-tl from-sky-500/[0.08] via-amber-500/[0.04] to-transparent p-3.5 flex flex-col justify-between items-end text-right">
            <span className="font-mono text-[20px] font-black uppercase tracking-tighter text-sky-600/10 select-none">
              PLANIFICAR
            </span>
            <div className="space-y-1 flex flex-col items-end">
              <p className="text-[10px] font-semibold text-sky-700/75 pr-0.5">
                Riesgo Bajo / Evidencia Alta
              </p>
              <div className="inline-flex items-center gap-1.5 rounded-md bg-sky-50/95 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-sky-800 ring-1 ring-sky-500/25 shadow-sm">
                <CalendarClock className="h-3 w-3 text-sky-600" />
                SECUNDARIO / PLANIFICAR
              </div>
            </div>
          </div>
        </div>

        {/* Fine 10x10 SVG Grid Lines */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="assumption-cartesian-subgrid"
              width="10%"
              height="10%"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 100 0 L 0 0 0 100"
                fill="none"
                stroke="#E2E8F0"
                strokeWidth="1"
                strokeDasharray="2,2"
              />
            </pattern>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="url(#assumption-cartesian-subgrid)"
          />

          {/* Main X Axis (Riesgo = 0) */}
          <line
            x1="0%"
            y1="50%"
            x2="100%"
            y2="50%"
            stroke="#475569"
            strokeWidth="2"
          />
          {/* Main Y Axis (Evidencia = 0) */}
          <line
            x1="50%"
            y1="0%"
            x2="50%"
            y2="100%"
            stroke="#475569"
            strokeWidth="2"
          />
        </svg>

        {/* Numeric Tick Marks on Axes */}
        {showCoordinates && (
          <div className="pointer-events-none absolute inset-0">
            {ticks.map((tick) => {
              if (tick === 0) return null;
              const pct = ((tick + 5) / 10) * 100;
              const yPct = ((5 - tick) / 10) * 100;
              return (
                <React.Fragment key={tick}>
                  {/* X-axis tick label */}
                  <span
                    style={{ left: `${pct}%`, top: '50%' }}
                    className="-translate-x-1/2 translate-y-1.5 absolute font-mono text-[9px] font-semibold text-slate-400"
                  >
                    {tick > 0 ? `+${tick}` : tick}
                  </span>
                  {/* Y-axis tick label */}
                  <span
                    style={{ top: `${yPct}%`, left: '50%' }}
                    className="translate-x-1.5 -translate-y-1/2 absolute font-mono text-[9px] font-semibold text-slate-400"
                  >
                    {tick > 0 ? `+${tick}` : tick}
                  </span>
                </React.Fragment>
              );
            })}

            {/* Origin (0,0) Label */}
            <span
              style={{ left: '50%', top: '50%' }}
              className="translate-x-1.5 translate-y-1 absolute font-mono text-[9px] font-bold text-slate-500"
            >
              0,0
            </span>
          </div>
        )}

        {/* Axis Titles Inside Edges */}
        <div className="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 rounded-full bg-slate-900/85 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-white shadow-sm">
          {showCoordinates ? '+5 RIESGO CRÍTICO' : 'RIESGO CRÍTICO'}
        </div>
        <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-slate-900/75 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-white shadow-sm">
          {showCoordinates ? '-5 IMPACTO MARGINAL' : 'IMPACTO MARGINAL'}
        </div>
        <div className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-slate-900/75 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-white shadow-sm">
          {showCoordinates ? '-5 RUMOR / SIN DATOS' : 'RUMOR / SIN DATOS'}
        </div>
        <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-slate-900/85 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-white shadow-sm">
          {showCoordinates ? '+5 DATOS DUROS' : 'DATOS DUROS'}
        </div>

        {/* Floating Live Quadrant Tooltip following cursor */}
        {interactive && hoverCoord && activeHoverQuadrant && !hoveredNodeId && (
          <div
            style={assumptionCoordToPercent(hoverCoord)}
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-full -mt-6 z-30 whitespace-nowrap rounded-lg bg-slate-900/90 px-2.5 py-1 text-[10px] font-semibold text-white shadow-md backdrop-blur-sm"
          >
            <span>{ASSUMPTION_QUADRANT_INFO[activeHoverQuadrant].label}</span>
          </div>
        )}

        {/* Interactive Ghost Cursor Preview when a card is selected */}
        {interactive && selectedFindingId && hoverCoord && !draggingNodeId && (
          <div
            style={assumptionCoordToPercent(hoverCoord)}
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 border-dashed border-indigo-500 bg-indigo-500/15 font-mono text-[10px] font-bold text-indigo-700"
          >
            {selectedFindingCode}
          </div>
        )}

        {/* Positioned Nodes with Drag & Click support */}
        <AnimatePresence>
          {nodes.map((node) => {
            if (!node || !node.coordinates) return null;
            const pos = assumptionCoordToPercent(node.coordinates);
            const isHovered = hoveredNodeId === node.id;
            const nodeQuadrant = determineAssumptionQuadrant(
              node.coordinates.x,
              node.coordinates.y
            );

            return (
              <motion.div
                key={node.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: 1,
                  opacity: 1,
                  left: pos.left,
                  top: pos.top,
                }}
                exit={{ scale: 0, opacity: 0 }}
                transition={
                  draggingNodeId === node.id
                    ? { duration: 0 }
                    : {
                        type: 'spring',
                        stiffness: 380,
                        damping: 22,
                        mass: 0.7,
                      }
                }
                style={{
                  left: pos.left,
                  top: pos.top,
                }}
                onMouseDown={(e) => {
                  if (!interactive) return;
                  e.stopPropagation();
                  didDragRef.current = false;
                  setDraggingNodeId(node.id);
                  if (onSelectNode) {
                    onSelectNode(node.id);
                  }
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onSelectNode) {
                    onSelectNode(node.id);
                  }
                }}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
                className={`absolute -translate-x-1/2 -translate-y-1/2 flex h-9 w-9 ${
                  interactive ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
                } items-center justify-center rounded-full border-2 font-mono text-[11px] font-bold transition-colors ${getNodeStyle(
                  node
                )}`}
              >
                {node.code}

                {/* Floating Tooltip on Node Hover */}
                <AnimatePresence>
                  {(isHovered || node.isSelected) && !draggingNodeId && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.95 }}
                      className="pointer-events-none absolute bottom-full mb-2.5 w-56 rounded-xl bg-slate-900/95 p-2.5 text-left text-[11px] text-white shadow-xl backdrop-blur-md z-40"
                    >
                      <div className="flex items-center justify-between border-b border-slate-700/80 pb-1 mb-1">
                        <span className="font-mono font-bold text-indigo-300">
                          {node.code}
                        </span>
                        {showCoordinates && (
                          <span className="font-mono text-[10px] text-emerald-300">
                            X:{node.coordinates.x.toFixed(2)} | Y:
                            {node.coordinates.y.toFixed(2)}
                          </span>
                        )}
                      </div>
                      <p className="line-clamp-2 font-sans font-semibold leading-snug text-slate-100">
                        {node.title}
                      </p>
                      <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-300">
                        <span>
                          {ASSUMPTION_QUADRANT_INFO[nodeQuadrant].shortTitle}
                        </span>
                        {interactive && (
                          <span className="inline-flex items-center gap-0.5 text-indigo-300">
                            <Move className="h-2.5 w-2.5" /> Arrastrable
                          </span>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Bottom Axis Caption */}
      <div className="mt-2 flex w-full max-w-[600px] items-center justify-between text-[11px] font-mono text-slate-500 px-1">
        <span>
          {showCoordinates
            ? '← Rumor / Sin datos (-5)'
            : '← Rumor / Sin datos'}
        </span>
        <span className="font-bold text-slate-700">EJE X: EVIDENCIA</span>
        <span>
          {showCoordinates
            ? 'Datos duros / Métricas (+5) →'
            : 'Datos duros / Métricas →'}
        </span>
      </div>
    </div>
  );
};
