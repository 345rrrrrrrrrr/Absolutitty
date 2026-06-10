import { useMemo, useState } from 'react';
import { INSTRUCTIONS, PROCESSORS, BUILTIN_VARS, SENSOR_PROPS, type Category } from '../mlog/spec';

const CATEGORIES: (Category | 'All')[] = [
  'All', 'Input/Output', 'Block Control', 'Operations', 'Flow Control', 'Unit Control', 'Drawing',
];

export default function ReferencePage() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category | 'All'>('All');
  const [tab, setTab] = useState<'instructions' | 'variables'>('instructions');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return INSTRUCTIONS.filter((spec) => {
      if (category !== 'All' && spec.category !== category) return false;
      if (!q) return true;
      return (
        spec.name.includes(q) ||
        spec.doc.toLowerCase().includes(q) ||
        spec.variants?.some((v) => v.sub.toLowerCase().includes(q) || v.doc.toLowerCase().includes(q))
      );
    });
  }, [query, category]);

  const filteredVars = useMemo(() => {
    const q = query.trim().toLowerCase();
    const builtins = BUILTIN_VARS.filter((b) => !q || b.name.toLowerCase().includes(q) || b.doc.toLowerCase().includes(q));
    const sensors = SENSOR_PROPS.filter((p) => !q || p.name.toLowerCase().includes(q) || p.doc.toLowerCase().includes(q));
    return { builtins, sensors };
  }, [query]);

  return (
    <div>
      <h1 className="mt0">mlog Reference</h1>
      <div className="card" style={{ marginBottom: 18 }}>
        <h3 className="mt0">Processors</h3>
        <table style={{ borderCollapse: 'collapse', fontSize: 13.5 }}>
          <thead>
            <tr>
              {['Processor', 'Speed', 'Link range', 'Note'].map((h) => (
                <th key={h} style={{ textAlign: 'left', padding: '4px 16px 4px 0', color: 'var(--text-dim)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PROCESSORS.map((p) => (
              <tr key={p.id}>
                <td style={{ padding: '4px 16px 4px 0', fontWeight: 600 }}>{p.name}</td>
                <td style={{ padding: '4px 16px 4px 0' }} className="mono">{p.opsPerSecond} ops/s</td>
                <td style={{ padding: '4px 16px 4px 0' }} className="mono">{p.range} tiles</td>
                <td style={{ padding: '4px 16px 4px 0' }} className="muted">{p.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted" style={{ marginBottom: 0, fontSize: 13 }}>
          All processors run at most 1000 instructions and loop back to the top when they reach the end.
          Linked blocks are named by their short name + link order: <span className="mono">cell1</span>,{' '}
          <span className="mono">switch1</span>, <span className="mono">duo2</span>…
        </p>
      </div>

      <div className="ref-controls">
        <input
          type="text"
          placeholder="search instructions, variables…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select value={category} onChange={(e) => setCategory(e.target.value as Category | 'All')}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <button className={`btn small${tab === 'instructions' ? '' : ' secondary'}`} onClick={() => setTab('instructions')}>instructions</button>
        <button className={`btn small${tab === 'variables' ? '' : ' secondary'}`} onClick={() => setTab('variables')}>variables &amp; sensors</button>
      </div>

      {tab === 'instructions' && filtered.map((spec) => (
        <div className="card ref-card" key={spec.name}>
          <h3>{spec.name}{spec.v8 ? <span className="badge accent" style={{ marginLeft: 8 }}>v8</span> : null}</h3>
          <span className="badge">{spec.category}</span>
          <p style={{ margin: '8px 0 0' }}>{spec.doc}</p>
          <div className="example">{spec.example}</div>
          {spec.args && spec.args.length > 0 && (
            <table>
              <thead><tr><th>argument</th><th>kind</th><th>notes</th></tr></thead>
              <tbody>
                {spec.args.map((a) => (
                  <tr key={a.name}>
                    <td>{a.name}</td>
                    <td className="muted">{a.kind === 'output' ? 'output →' : a.kind}</td>
                    <td className="muted">{a.enum ? a.enum.join(' | ') : a.doc ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {spec.variants && (
            <table>
              <thead><tr><th>{spec.name} …</th><th>arguments</th><th>what it does</th></tr></thead>
              <tbody>
                {spec.variants.map((variant) => (
                  <tr key={variant.sub}>
                    <td>{variant.sub}</td>
                    <td className="muted mono" style={{ fontSize: 12 }}>
                      {variant.args.map((a) => (a.kind === 'output' ? `→${a.name}` : a.name)).join(' ')}
                    </td>
                    <td className="muted">{variant.doc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {spec.notes?.map((note, i) => <p className="note" key={i}>{note}</p>)}
        </div>
      ))}

      {tab === 'variables' && (
        <>
          <div className="card ref-card">
            <h3>built-in variables</h3>
            <table>
              <thead><tr><th>variable</th><th>meaning</th></tr></thead>
              <tbody>
                {filteredVars.builtins.map((b) => (
                  <tr key={b.name}><td>@{b.name}</td><td className="muted">{b.doc}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card ref-card">
            <h3>sensor properties</h3>
            <p className="muted" style={{ margin: '4px 0 0' }}>
              Read with <span className="mono">sensor result target @property</span>. Items and liquids
              (e.g. <span className="mono">@copper</span>) read the stored amount.
            </p>
            <table>
              <thead><tr><th>property</th><th>applies to</th><th>meaning</th></tr></thead>
              <tbody>
                {filteredVars.sensors.map((p) => (
                  <tr key={p.name}><td>@{p.name}</td><td className="muted">{p.appliesTo}</td><td className="muted">{p.doc}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
