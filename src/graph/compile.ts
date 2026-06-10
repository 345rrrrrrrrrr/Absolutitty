// GraphDoc → IRProgram. Walks the exec chain from the Start node; branch
// nodes (If, Radar, Bind Unit, Locate) emit a conditional jump and two
// sub-chains. Every chain ends by jumping back to the loop top.

import { IRBuilder, type Arg, v } from '../mlog/ir';
import type { IRProgram } from '../mlog/ir';
import { NODE_DEF_MAP, parseValue, type NodeDef } from './nodeDefs';
import type { GraphDoc, GraphNode, GraphError } from './types';

export interface CompileResult {
  ir: IRProgram;
  errors: GraphError[];
}

export function compileGraph(doc: GraphDoc): CompileResult {
  const errors: GraphError[] = [];
  const b = new IRBuilder();
  const nodeById = new Map(doc.nodes.map((node) => [node.id, node]));

  const starts = doc.nodes.filter((node) => node.type === 'start');
  if (starts.length === 0) {
    return { ir: b.program(), errors: [{ message: 'Add a Start node — it is where the program begins.' }] };
  }
  if (starts.length > 1) {
    errors.push({ nodeId: starts[1].id, message: 'Only one Start node is allowed.' });
  }
  const start = starts[0];

  // exec successors: source node + exec-out port → target node
  const execNext = new Map<string, string>();
  for (const edge of doc.edges) {
    if (edge.kind !== 'exec') continue;
    const key = `${edge.source}:${edge.sourcePort}`;
    if (execNext.has(key)) {
      errors.push({ nodeId: edge.source, message: 'A flow output can only connect to one node.' });
    }
    execNext.set(key, edge.target);
  }

  // data inputs: target node + port → source node + port
  const dataIn = new Map<string, { node: string; port: string }>();
  for (const edge of doc.edges) {
    if (edge.kind !== 'data') continue;
    dataIn.set(`${edge.target}:${edge.targetPort}`, { node: edge.source, port: edge.sourcePort });
  }

  // nodes reachable along exec edges (used to reject dangling data sources)
  const onChain = new Set<string>();
  {
    const queue = [start.id];
    while (queue.length) {
      const id = queue.pop()!;
      if (onChain.has(id)) continue;
      onChain.add(id);
      const def = defOf(nodeById.get(id));
      if (!def) continue;
      for (const port of def.execOuts) {
        const next = execNext.get(`${id}:${port}`);
        if (next) queue.push(next);
      }
    }
  }

  for (const node of doc.nodes) {
    if (!onChain.has(node.id) && node.type !== 'start') {
      errors.push({ nodeId: node.id, message: `"${defOf(node)?.label ?? node.type}" is not connected to the flow — connect its exec input.` });
    }
  }

  /** variable name for a node's data-out port */
  const outVar = (node: GraphNode, port: string): Arg => {
    const custom = typeof node.params.varName === 'string' ? node.params.varName.trim() : '';
    if (custom && defOf(node)?.dataOut[0]?.key === port) return v(custom);
    return v(`${node.type}_${shortId(node.id)}_${port}`);
  };

  const resolveIn = (node: GraphNode, port: string): Arg => {
    const source = dataIn.get(`${node.id}:${port}`);
    if (source) {
      const sourceNode = nodeById.get(source.node);
      if (sourceNode) {
        if (!onChain.has(sourceNode.id)) {
          errors.push({ nodeId: sourceNode.id, message: `"${defOf(sourceNode)?.label}" feeds a value but never runs — connect it to the flow.` });
        }
        return outVar(sourceNode, source.port);
      }
    }
    return parseValue(String(node.params[port] ?? '0'));
  };

  const topLabel = b.newLabel('loop');
  const visiting = new Set<string>();

  const compileChain = (nodeId: string | undefined): void => {
    if (!nodeId) {
      b.jump(topLabel, 'always');
      return;
    }
    if (visiting.has(nodeId)) {
      errors.push({ nodeId, message: 'Flow loops back on itself — remove the cycle (the whole program already repeats).' });
      b.jump(topLabel, 'always');
      return;
    }
    const node = nodeById.get(nodeId);
    const def = defOf(node);
    if (!node || !def) {
      b.jump(topLabel, 'always');
      return;
    }
    visiting.add(nodeId);

    const ctx = {
      b,
      params: node.params,
      in: (port: string) => resolveIn(node, port),
      out: (port: string) => outVar(node, port),
    };

    if (def.execOuts.length === 2 && def.emitBranch) {
      const secondLabel = b.newLabel(def.execOuts[1]);
      b.comment(`${def.label}`);
      def.emitBranch(ctx, secondLabel);
      compileChain(execNext.get(`${nodeId}:${def.execOuts[0]}`));
      b.label(secondLabel);
      compileChain(execNext.get(`${nodeId}:${def.execOuts[1]}`));
    } else {
      if (node.type !== 'start') {
        b.comment(`${def.label}`);
        def.emit?.(ctx);
      }
      compileChain(execNext.get(`${nodeId}:${def.execOuts[0]}`));
    }
    visiting.delete(nodeId);
  };

  b.label(topLabel);
  compileChain(start.id);

  return { ir: b.program(), errors };
}

function defOf(node: GraphNode | undefined): NodeDef | undefined {
  return node ? NODE_DEF_MAP.get(node.type) : undefined;
}

function shortId(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, '').slice(-4) || '0';
}
