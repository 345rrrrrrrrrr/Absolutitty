// Node-graph document model. Kept JSON-serializable so graphs can be passed
// between pages (sessionStorage) and saved by users.

export interface GraphNode {
  id: string;
  type: string; // NodeDef type id
  params: Record<string, string | number | boolean>;
  position: { x: number; y: number };
}

export type EdgeKind = 'exec' | 'data';

export interface GraphEdge {
  id: string;
  source: string; // node id
  sourcePort: string; // exec-out name or data-out port name
  target: string; // node id
  targetPort: string; // 'exec' for exec-in, or data-in port name
  kind: EdgeKind;
}

export interface GraphDoc {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphError {
  nodeId?: string;
  message: string;
}
