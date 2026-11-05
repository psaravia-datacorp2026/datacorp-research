import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coordinate, QuadrantType } from '../../types';
import { determineQuadrant } from '../../store/useResearchStore';
import { Trophy, Wrench, Clock, Trash2, Crosshair } from 'lucide-react';

/**
 * ============================================================================
 * ANÁLISIS MATEMÁTICO: CONVERSIÓN DE PÍXELES (DOM) A COORDENADAS ESCALARES [-5, 5]
 * ============================================================================
 *
 * 1. Espacio de Origen (DOM Viewport Pixels):
 *    - Al capturar el evento `onClick` sobre el contenedor cuadrado del plano,
 *      `getBoundingClientRect()` nos entrega `{ left, top, width, height }`.
 *    - La posición relativa del cursor en píxeles desde la esquina superior
 *      izquierda `(0, 0)` del contenedor es:
 *        px_X = clientX - rect.left   (crece hacia la derecha: 0 -> width)
 *        px_Y = clientY - rect.top    (crece hacia abajo:     0 -> height)
 *
 * 2. Normalización y Traslación al Centro Cartesiano (0, 0) en Rango [-5, 5]:
 *    - Queremos que el centro geométrico `(width / 2, height / 2)` corresponda
 *      exactamente al origen `(0, 0)` y los bordes al intervalo `[-5, 5]` (amplitud = 10):
 *
 *      Eje X (RELEVANCIA):
 *        relevance = ((px_X / width) * 10) - 5
 *        * Si px_X = 0         => (0 * 10) - 5   = -5.00
 *        * Si px_X = width / 2 => (0.5 * 10) - 5 =  0.00
 *        * Si px_X = width     => (1 * 10) - 5   = +5.00
 *
 *      Eje Y (FACTIBILIDAD - Inversión de eje Y del DOM):
 *        En el DOM `px_Y` crece hacia abajo, pero en el plano cartesiano `Y`
 *        crece hacia arriba (+5 en el borde superior, -5 en el borde inferior):
 *        feasibility = 5 - ((px_Y / height) * 10)
 *        * Si px_Y = 0          => 5 - 0   = +5.00
 *        * Si px_Y = height / 2 => 5 - 5   =  0.00
 *        * Si px_Y = height     => 5 - 10  = -5.00
 *
 * 3. Transformación Inversa (De Coordenada Escalar [-5, 5] a Porcentaje CSS):
 *    - Para renderizar cada nodo en posición absoluta (`left: %`, `top: %`):
 *        leftPercent = ((relevance + 5) / 10) * 100
 *        topPercent  = ((5 - feasibility) / 10) * 100
 * ============================================================================
 */

export interface MapNodeItem {
  id: string;
  code: string;
  title: string;
  category?: string;
  coordinate: Coordinate;
  isSelected?: boolean;
  quadrant?: QuadrantType;
}

interface CartesianMapProps {
  nodes: MapNodeItem[];
  selectedFindingId?: string | null;
  selectedFindingCode?: string | null;
  interactive?: boolean;
  onSelectCoordinate?: (coordinate: Coordinate) => void;
  onSelectNode?: (findingId: string) => void;
  showQuadrantBadges?: boolean;
  showCoordinates?: boolean;
}

const roundToTwo = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

export const coordinateToPercent = (coordinate: Coordinate) => {
  const rel = Number(coordinate?.relevance ?? 0);
  const feas = Number(coordinate?.feasibility ?? 0);
  const left = ((rel + 5) / 10) * 100;
  const top = ((5 - feas) / 10) * 100;
  return {
    left: `${Math.max(2, Math.min(98, left))}%`,
    top: `${Math.max(2, Math.min(98, top))}%`,
  };
};

export const CartesianMap: React.FC<CartesianMapProps> = ({
  nodes = [],
  selectedFindingId,
  selectedFindingCode,
  interactive = true,
  onSelectCoordinate,
  onSelectNode,
  showQuadrantBadges = true,
  showCoordinates = true,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoverCoord, setHoverCoord] = useState<Coordinate | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const computeCoordinateFromEvent = (
    e: React.MouseEvent<HTMLDivElement>
  ): Coordinate | null => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;

    const pxX = e.clientX - rect.left;
    const pxY = e.clientY - rect.top;

    const rawRelevance = (pxX / rect.width) * 10 - 5;
    const rawFeasibility = 5 - (pxY / rect.height) * 10;

    return {
      relevance: roundToTwo(Math.max(-5, Math.min(5, rawRelevance))),
      feasibility: roundToTwo(Math.max(-5, Math.min(5, rawFeasibility))),
    };
  };

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || !onSelectCoordinate || !selectedFindingId) return;
    const coord = computeCoordinateFromEvent(e);
    if (coord) {
      onSelectCoordinate(coord);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive) return;
    const coord = computeCoordinateFromEvent(e);
    setHoverCoord(coord);
  };

  const handleMouseLeave = () => {
    setHoverCoord(null);
  };

  const ticks = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5];

  const getNodeStyle = (node: MapNodeItem) => {
    const q =
      node.quadrant ??
      determineQuadrant(
        Number(node.coordinate?.relevance ?? 0),
        Number(node.coordinate?.feasibility ?? 0)
      );

    if (node.isSelected) {
      return 'bg-indigo-600 text-white ring-4 ring-indigo-500/35 border-white scale-110 z-30 shadow-lg shadow-indigo-500/40';
    }

    if (!interactive) {
      switch (q) {
        case 'quick_win':
          return 'bg-amber-400 text-slate-950 border-white ring-4 ring-amber-400/30 shadow-md';
        case 'strategic':
          return 'bg-orange-500 text-white border-white ring-4 ring-orange-500/25 shadow-md';
        case 'operational_fill':
          return 'bg-amber-600 text-white border-white ring-4 ring-amber-600/25 shadow-md';
        case 'discard':
          return 'bg-violet-600 text-white border-white ring-4 ring-violet-600/25 shadow-md';
      }
    }

    return 'bg-emerald-500 text-white border-white ring-4 ring-emerald-500/25 shadow-md hover:scale-110 z-20';
  };

  return (
    <div className="flex flex-col items-center w-full">
      {/* Top Axis Label (+5 Factibilidad) */}
      <div className="mb-2 flex w-full items-center justify-between text-xs font-semibold text-slate-500 px-1">
        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-slate-500">
          {showCoordinates
            ? 'EJE Y: FACTIBILIDAD [-5 a +5]'
            : 'EJE Y: FACTIBILIDAD'}
        </span>
        {interactive && (
          <div className="flex items-center gap-2">
            {hoverCoord && selectedFindingId && showCoordinates ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-0.5 font-mono text-xs font-semibold text-indigo-700 ring-1 ring-indigo-500/20">
                <Crosshair className="h-3 w-3 text-indigo-500" />
                R: {hoverCoord.relevance.toFixed(2)} | F:{' '}
                {hoverCoord.feasibility.toFixed(2)}
              </span>
            ) : (
              <span className="text-xs text-slate-400">
                {selectedFindingId
                  ? `Haz clic en el plano para posicionar ${selectedFindingCode ?? ''}`
                  : 'Selecciona un hallazgo a la izquierda para votar'}
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
        onMouseLeave={handleMouseLeave}
        className={`relative aspect-square w-full max-w-[600px] select-none overflow-hidden rounded-2xl border-2 transition-all duration-200 ${
          interactive && selectedFindingId
            ? 'cursor-crosshair border-indigo-400/90 bg-white shadow-xl shadow-indigo-500/10'
            : 'border-slate-200/90 bg-white shadow-sm'
        }`}
      >
        {/* Subtle Quadrant Tints */}
        <div className="pointer-events-none absolute inset-0 grid grid-cols-2 grid-rows-2">
          {/* Top-Left: R < 0, F >= 0 (Estratégico / Deuda Técnica) */}
          <div className="border-r border-b border-slate-200/60 bg-gradient-to-br from-orange-500/[0.04] to-transparent p-3 flex flex-col justify-between">
            {showQuadrantBadges && (
              <div className="inline-flex items-center gap-1.5 self-start rounded-md bg-orange-50/90 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-orange-700 ring-1 ring-orange-500/20">
                <Wrench className="h-3 w-3" />
                Estratégico • Deuda Técnica
              </div>
            )}
          </div>

          {/* Top-Right: R >= 0, F >= 0 (Quick Win - Máxima Prioridad) */}
          <div className="border-b border-slate-200/60 bg-gradient-to-bl from-amber-400/[0.08] via-emerald-500/[0.03] to-transparent p-3 flex flex-col justify-between items-end">
            {showQuadrantBadges && (
              <div className="inline-flex items-center gap-1.5 rounded-md bg-amber-50/95 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-800 ring-1 ring-amber-500/30">
                <Trophy className="h-3 w-3 text-amber-600" />
                Quick Win • Máxima Prioridad
              </div>
            )}
          </div>

          {/* Bottom-Left: R < 0, F < 0 (Baja Prioridad - Descartar) */}
          <div className="border-r border-slate-200/60 bg-gradient-to-tr from-violet-500/[0.05] to-transparent p-3 flex flex-col justify-end">
            {showQuadrantBadges && (
              <div className="inline-flex items-center gap-1.5 self-start rounded-md bg-violet-50/90 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-700 ring-1 ring-violet-500/20">
                <Trash2 className="h-3 w-3" />
                Baja Prioridad • Descartar
              </div>
            )}
          </div>

          {/* Bottom-Right: R >= 0, F < 0 (Bajo Impacto - Relleno Operativo) */}
          <div className="bg-gradient-to-tl from-amber-600/[0.05] to-transparent p-3 flex flex-col justify-end items-end">
            {showQuadrantBadges && (
              <div className="inline-flex items-center gap-1.5 rounded-md bg-amber-50/90 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 ring-1 ring-amber-500/25">
                <Clock className="h-3 w-3" />
                Bajo Impacto • Relleno Operativo
              </div>
            )}
          </div>
        </div>

        {/* Fine 10x10 SVG Grid Lines */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="cartesian-subgrid"
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
          <rect width="100%" height="100%" fill="url(#cartesian-subgrid)" />

          {/* Main X Axis (Feasibility = 0) */}
          <line
            x1="0%"
            y1="50%"
            x2="100%"
            y2="50%"
            stroke="#475569"
            strokeWidth="2"
          />
          {/* Main Y Axis (Relevance = 0) */}
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
          {showCoordinates ? '+5 FACTIBILIDAD' : 'ALTA FACTIBILIDAD'}
        </div>
        <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-slate-900/75 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-white shadow-sm">
          {showCoordinates ? '-5 FACTIBILIDAD' : 'BAJA FACTIBILIDAD'}
        </div>
        <div className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-slate-900/75 px-2 py-0.5 text-[10px] font-bold tracking-wider text-white shadow-sm">
          {showCoordinates ? '-5 REL' : 'BAJA REL'}
        </div>
        <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-slate-900/85 px-2 py-0.5 text-[10px] font-bold tracking-wider text-white shadow-sm">
          {showCoordinates ? '+5 REL' : 'ALTA REL'}
        </div>

        {/* Interactive Ghost Cursor Preview when a card is selected */}
        {interactive && selectedFindingId && hoverCoord && (
          <div
            style={coordinateToPercent(hoverCoord)}
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 border-dashed border-indigo-500 bg-indigo-500/15 font-mono text-[10px] font-bold text-indigo-700"
          >
            {selectedFindingCode}
          </div>
        )}

        {/* Positioned Nodes with Spring / Elastic Animation */}
        <AnimatePresence>
          {nodes.map((node) => {
            if (!node || !node.coordinate) return null;
            const pos = coordinateToPercent(node.coordinate);
            const isHovered = hoveredNodeId === node.id;

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
                transition={{
                  type: 'spring',
                  stiffness: 380,
                  damping: 22,
                  mass: 0.7,
                }}
                style={{
                  left: pos.left,
                  top: pos.top,
                }}
                onClick={(e) => {
                  if (onSelectNode) {
                    e.stopPropagation();
                    onSelectNode(node.id);
                  }
                }}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
                className={`absolute -translate-x-1/2 -translate-y-1/2 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-2 font-mono text-[11px] font-bold transition-colors ${getNodeStyle(
                  node
                )}`}
              >
                {node.code}

                {/* Floating Tooltip on Hover */}
                <AnimatePresence>
                  {(isHovered || node.isSelected) && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.95 }}
                      className="pointer-events-none absolute bottom-full mb-2 w-48 rounded-lg bg-slate-900/95 p-2 text-left text-[11px] text-white shadow-xl backdrop-blur-md z-40"
                    >
                      <div className="flex items-center justify-between border-b border-slate-700/80 pb-1 mb-1">
                        <span className="font-mono font-bold text-indigo-300">
                          {node.code}
                        </span>
                        {showCoordinates && (
                          <span className="font-mono text-[10px] text-emerald-300">
                            R:{Number(node.coordinate.relevance ?? 0).toFixed(2)} | F:
                            {Number(node.coordinate.feasibility ?? 0).toFixed(2)}
                          </span>
                        )}
                      </div>
                      <p className="line-clamp-2 font-sans font-medium leading-snug text-slate-100">
                        {node.title}
                      </p>
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
        <span>{showCoordinates ? '← Menor Relevancia (-5)' : '← Menor Relevancia'}</span>
        <span className="font-bold text-slate-700">EJE X: RELEVANCIA</span>
        <span>{showCoordinates ? 'Mayor Relevancia (+5) →' : 'Mayor Relevancia →'}</span>
      </div>
    </div>
  );
};
