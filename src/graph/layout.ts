// Assigns readable positions to template-generated graphs: the exec chain
// flows left→right, branches fan out vertically.

import type { GraphDoc } from './types';
import { NODE_DEF_MAP } from './nodeDefs';

const X_STEP = 260;
const Y_STEP = 190;

export function autoLayout(doc: GraphDoc): GraphDoc {
  const execNext = new Map<string, { port: string; target: string }[]>();
  for (const edge of doc.edges) {
    if (edge.kind !== 'exec') continue;
    const list = execNext.get(edge.source) ?? [];
    list.push({ port: edge.sourcePort, target: edge.target });
    execNext.set(edge.source, list);
  }

  const positions = new Map<string, { x: number; y: number }>();
  let nextRow = 0;

  const place = (id: string, col: number, row: number): void => {
    if (positions.has(id)) return;
    positions.set(id, { x: col * X_STEP, y: row * Y_STEP });
    nextRow = Math.max(nextRow, row + 1);
    const def = NODE_DEF_MAP.get(doc.nodes.find((n) => n.id === id)?.type ?? '');
    const outs = execNext.get(id) ?? [];
    // keep declared exec-out order so the "true/found" path stays on the same row
    const ordered = def
      ? [...outs].sort((a, b) => def.execOuts.indexOf(a.port) - def.execOuts.indexOf(b.port))
      : outs;
    ordered.forEach((out, i) => {
      place(out.target, col + 1, i === 0 ? row : nextRow);
    });
  };

  const start = doc.nodes.find((n) => n.type === 'start');
  if (start) place(start.id, 0, 0);
  // anything unplaced (disconnected) goes below
  for (const node of doc.nodes) {
    if (!positions.has(node.id)) positions.set(node.id, { x: 0, y: nextRow++ * Y_STEP });
  }

  return {
    ...doc,
    nodes: doc.nodes.map((n) => ({ ...n, position: positions.get(n.id)! })),
  };
}
