import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { NODE_DEF_MAP } from '../graph/nodeDefs';

export type FlowNodeData = {
  nodeType: string;
  params: Record<string, string | number | boolean>;
};

export type MlogFlowNode = Node<FlowNodeData, 'mlog'>;

function summary(params: Record<string, string | number | boolean>, nodeType: string): string {
  const def = NODE_DEF_MAP.get(nodeType);
  if (!def) return '';
  return def.params
    .filter((p) => {
      if (p.showWhen && !p.showWhen.values.includes(String(params[p.showWhen.key] ?? ''))) return false;
      const value = params[p.key];
      return value !== undefined && value !== '' && p.type !== 'boolean';
    })
    .slice(0, 3)
    .map((p) => `${String(params[p.key])}`)
    .join(' · ');
}

export const FlowNode = memo(function FlowNode({ data, selected }: NodeProps<MlogFlowNode>) {
  const def = NODE_DEF_MAP.get(data.nodeType);
  if (!def) return <div className="flownode">unknown node</div>;
  const isStart = def.type === 'start';

  return (
    <div className={`flownode${selected ? ' selected' : ''}`} style={{ '--node-color': def.color } as React.CSSProperties}>
      {!isStart && (
        <Handle type="target" position={Position.Left} id="e:in" className="exec" style={{ top: 14 }} />
      )}
      <div className="head">{def.label}</div>
      <div className="body">
        <div className="summary">{summary(data.params, data.nodeType) || ' '}</div>
        {def.execOuts.length > 1 && def.execOuts.map((port, i) => (
          <div className="port-row" key={port}>
            <span />
            <span style={{ color: 'var(--accent)' }}>{port} ▸</span>
            <Handle
              type="source" position={Position.Right} id={`e:${port}`} className="exec"
              style={{ top: 38 + i * 18 }}
            />
          </div>
        ))}
        {def.dataIn.map((port, i) => (
          <div className="port-row" key={port.key}>
            <span style={{ color: 'var(--info)' }}>● {port.label}</span>
            <Handle
              type="target" position={Position.Left} id={`d:${port.key}`} className="data"
              style={{ top: 38 + (def.execOuts.length > 1 ? def.execOuts.length * 18 : 0) + i * 18 }}
            />
          </div>
        ))}
        {def.dataOut.map((port, i) => (
          <div className="port-row" key={port.key}>
            <span />
            <span style={{ color: 'var(--info)' }}>{port.label} ●</span>
            <Handle
              type="source" position={Position.Right} id={`d:${port.key}`} className="data"
              style={{ top: 38 + (def.execOuts.length > 1 ? def.execOuts.length * 18 : 0) + (def.dataIn.length + i) * 18 }}
            />
          </div>
        ))}
      </div>
      {def.execOuts.length === 1 && (
        <Handle type="source" position={Position.Right} id={`e:${def.execOuts[0]}`} className="exec" style={{ top: 14 }} />
      )}
    </div>
  );
});
