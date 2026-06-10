// Tiny helper for templates that build node graphs.

import type { GraphDoc, GraphNode, GraphEdge } from '../graph/types';
import { autoLayout } from '../graph/layout';

export class GraphBuilder {
  private nodes: GraphNode[] = [];
  private edges: GraphEdge[] = [];
  private counter = 0;

  node(type: string, params: Record<string, string | number | boolean> = {}): string {
    const id = `n${this.counter++}`;
    this.nodes.push({ id, type, params, position: { x: 0, y: 0 } });
    return id;
  }

  /** exec edge: from's exec-out port (default first/'next') → to */
  exec(from: string, to: string, port = 'next'): void {
    this.edges.push({
      id: `e${this.counter++}`,
      source: from, sourcePort: port,
      target: to, targetPort: 'exec',
      kind: 'exec',
    });
  }

  /** data edge: from's output port → to's input port */
  data(from: string, fromPort: string, to: string, toPort: string): void {
    this.edges.push({
      id: `e${this.counter++}`,
      source: from, sourcePort: fromPort,
      target: to, targetPort: toPort,
      kind: 'data',
    });
  }

  /** chain several nodes with exec edges in order */
  chain(...ids: string[]): void {
    for (let i = 0; i < ids.length - 1; i++) this.exec(ids[i], ids[i + 1]);
  }

  build(): GraphDoc {
    return autoLayout({ nodes: this.nodes, edges: this.edges });
  }
}
