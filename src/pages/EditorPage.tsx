import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow, Background, Controls, MiniMap,
  useNodesState, useEdgesState, addEdge,
  type Edge, type Connection, type IsValidConnection,
} from '@xyflow/react';
import { NODE_DEFS, NODE_DEF_MAP } from '../graph/nodeDefs';
import { compileGraph } from '../graph/compile';
import { emit, instructionCount } from '../mlog/emitter';
import type { GraphDoc } from '../graph/types';
import { FlowNode, type MlogFlowNode } from '../components/FlowNode';
import CodePane from '../components/CodePane';

const nodeTypes = { mlog: FlowNode };

let idCounter = 1;
const freshId = () => `u${Date.now().toString(36)}${idCounter++}`;

function docToFlow(doc: GraphDoc): { nodes: MlogFlowNode[]; edges: Edge[] } {
  return {
    nodes: doc.nodes.map((node) => ({
      id: node.id,
      type: 'mlog' as const,
      position: node.position,
      data: { nodeType: node.type, params: node.params },
    })),
    edges: doc.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: `${edge.kind === 'exec' ? 'e' : 'd'}:${edge.sourcePort}`,
      targetHandle: edge.kind === 'exec' ? 'e:in' : `d:${edge.targetPort}`,
      animated: edge.kind === 'exec',
      style: edge.kind === 'exec'
        ? { stroke: 'var(--accent)', strokeWidth: 2 }
        : { stroke: 'var(--info)' },
    })),
  };
}

function flowToDoc(nodes: MlogFlowNode[], edges: Edge[]): GraphDoc {
  return {
    nodes: nodes.map((node) => ({
      id: node.id,
      type: node.data.nodeType,
      params: node.data.params,
      position: node.position,
    })),
    edges: edges.map((edge) => {
      const isExec = edge.sourceHandle?.startsWith('e:') ?? false;
      return {
        id: edge.id,
        source: edge.source,
        sourcePort: edge.sourceHandle?.slice(2) ?? 'next',
        target: edge.target,
        targetPort: isExec ? 'exec' : edge.targetHandle?.slice(2) ?? '',
        kind: isExec ? 'exec' as const : 'data' as const,
      };
    }),
  };
}

const STARTER: GraphDoc = {
  nodes: [
    { id: 's', type: 'start', params: {}, position: { x: 40, y: 120 } },
    { id: 'a', type: 'sensor', params: { target: 'vault1', property: '@copper', varName: 'copper' }, position: { x: 300, y: 120 } },
    { id: 'p', type: 'print', params: { text: 'copper: {a}', target: 'message1' }, position: { x: 560, y: 120 } },
  ],
  edges: [
    { id: 'e1', source: 's', sourcePort: 'next', target: 'a', targetPort: 'exec', kind: 'exec' },
    { id: 'e2', source: 'a', sourcePort: 'next', target: 'p', targetPort: 'exec', kind: 'exec' },
    { id: 'e3', source: 'a', sourcePort: 'value', target: 'p', targetPort: 'a', kind: 'data' },
  ],
};

export default function EditorPage() {
  const initial = useMemo(() => {
    const pending = sessionStorage.getItem('pendingGraph');
    if (pending) {
      sessionStorage.removeItem('pendingGraph');
      try { return docToFlow(JSON.parse(pending) as GraphDoc); } catch { /* fall through */ }
    }
    const saved = localStorage.getItem('savedGraph');
    if (saved) {
      try { return docToFlow(JSON.parse(saved) as GraphDoc); } catch { /* fall through */ }
    }
    return docToFlow(STARTER);
  }, []);

  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // live compile (debounced)
  const [compiled, setCompiled] = useState({ code: '', instructions: 0, errors: [] as { message: string }[] });
  useEffect(() => {
    const handle = window.setTimeout(() => {
      const doc = flowToDoc(nodes, edges);
      localStorage.setItem('savedGraph', JSON.stringify(doc));
      const { ir, errors } = compileGraph(doc);
      setCompiled({ code: emit(ir), instructions: instructionCount(ir), errors });
    }, 150);
    return () => window.clearTimeout(handle);
  }, [nodes, edges]);

  const isValidConnection: IsValidConnection = useCallback((connection) => {
    const sourceKind = connection.sourceHandle?.[0];
    const targetIsExec = connection.targetHandle === 'e:in';
    if (sourceKind === 'e') return targetIsExec;
    return !targetIsExec && connection.targetHandle?.[0] === 'd';
  }, []);

  const onConnect = useCallback((connection: Connection) => {
    setEdges((existing) => {
      // an exec output and a data input can each hold only one wire — replace
      const pruned = existing.filter((edge) => {
        if (connection.sourceHandle?.startsWith('e:')) {
          return !(edge.source === connection.source && edge.sourceHandle === connection.sourceHandle);
        }
        return !(edge.target === connection.target && edge.targetHandle === connection.targetHandle);
      });
      const isExec = connection.sourceHandle?.startsWith('e:') ?? false;
      return addEdge({
        ...connection,
        animated: isExec,
        style: isExec ? { stroke: 'var(--accent)', strokeWidth: 2 } : { stroke: 'var(--info)' },
      }, pruned);
    });
  }, [setEdges]);

  const addNode = (type: string) => {
    const id = freshId();
    setNodes((existing) => [...existing, {
      id,
      type: 'mlog' as const,
      position: { x: 120 + Math.random() * 200, y: 80 + Math.random() * 240 },
      data: {
        nodeType: type,
        params: Object.fromEntries((NODE_DEF_MAP.get(type)?.params ?? []).map((p) => [p.key, p.default])),
      },
    }]);
    setSelectedId(id);
  };

  const selected = nodes.find((node) => node.id === selectedId);
  const selectedDef = selected ? NODE_DEF_MAP.get(selected.data.nodeType) : undefined;

  const updateParam = (key: string, value: string | number | boolean) => {
    if (!selectedId) return;
    setNodes((existing) => existing.map((node) =>
      node.id === selectedId
        ? { ...node, data: { ...node.data, params: { ...node.data.params, [key]: value } } }
        : node,
    ));
  };

  const clearGraph = () => {
    const flow = docToFlow(STARTER);
    setNodes(flow.nodes);
    setEdges(flow.edges);
    setSelectedId(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="palette">
        <span className="muted" style={{ fontSize: 12, alignSelf: 'center', marginRight: 4 }}>add node:</span>
        {NODE_DEFS.filter((def) => def.type !== 'start').map((def) => (
          <button key={def.type} style={{ '--pal-color': def.color } as React.CSSProperties} onClick={() => addNode(def.type)}>
            {def.label}
          </button>
        ))}
        <span style={{ flex: 1 }} />
        <button onClick={clearGraph}>reset</button>
      </div>
      <div className="editor-layout" style={{ flex: 1, minHeight: 0 }}>
        <div className="editor-canvas">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            isValidConnection={isValidConnection}
            onSelectionChange={({ nodes: sel }) => setSelectedId(sel[0]?.id ?? null)}
            fitView
            colorMode="dark"
            deleteKeyCode={['Backspace', 'Delete']}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#2a2e36" gap={22} />
            <Controls />
            <MiniMap pannable zoomable style={{ background: 'var(--panel)' }} />
          </ReactFlow>
        </div>
        <div className="editor-side">
          {selected && selectedDef ? (
            <div>
              <h3 className="mt0" style={{ color: 'var(--accent)' }}>{selectedDef.label}</h3>
              <p className="muted" style={{ fontSize: 13 }}>{selectedDef.description}</p>
              {selectedDef.params
                .filter((p) => !p.showWhen || p.showWhen.values.includes(String(selected.data.params[p.showWhen.key] ?? '')))
                .map((param) => (
                  <div className="field" key={param.key}>
                    <label>{param.label}</label>
                    {param.type === 'select' ? (
                      <select
                        value={String(selected.data.params[param.key] ?? param.default)}
                        onChange={(e) => updateParam(param.key, e.target.value)}
                      >
                        {param.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    ) : param.type === 'boolean' ? (
                      <input
                        type="checkbox"
                        checked={Boolean(selected.data.params[param.key])}
                        onChange={(e) => updateParam(param.key, e.target.checked)}
                        style={{ width: 'auto' }}
                      />
                    ) : param.type === 'number' ? (
                      <input
                        type="number"
                        value={Number(selected.data.params[param.key] ?? param.default)}
                        onChange={(e) => updateParam(param.key, Number(e.target.value))}
                      />
                    ) : (
                      <input
                        type="text"
                        value={String(selected.data.params[param.key] ?? param.default)}
                        onChange={(e) => updateParam(param.key, e.target.value)}
                      />
                    )}
                    {param.help && <div className="help">{param.help}</div>}
                  </div>
                ))}
            </div>
          ) : (
            <p className="muted" style={{ fontSize: 13 }}>
              Select a node to edit its options. Drag from the <span style={{ color: 'var(--accent)' }}>amber</span>{' '}
              squares to chain steps, and from the <span style={{ color: 'var(--info)' }}>blue</span> dots to
              pass values. Delete removes the selection.
            </p>
          )}
          {compiled.errors.length > 0 && (
            <div>
              {compiled.errors.map((error, i) => (
                <div className="lint error" key={i}><span className="sev">fix</span><span>{error.message}</span></div>
              ))}
            </div>
          )}
          <CodePane code={compiled.code} instructions={compiled.instructions} title="live mlog output" />
        </div>
      </div>
    </div>
  );
}
