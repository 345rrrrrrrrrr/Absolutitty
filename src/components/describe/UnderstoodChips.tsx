import { useState } from 'react';
import type { Template, ParamValues } from '../../templates/types';
import { TEMPLATES } from '../../templates';
import { optionsFor } from '../ParamForm';

function chipLabel(template: Template, key: string, value: unknown): string {
  const param = template.params.find((p) => p.key === key);
  if (!param) return `${key}: ${value}`;
  if (param.type === 'boolean') return `${param.label}: ${value ? 'yes' : 'no'}`;
  const option = optionsFor(param).find((o) => o.value === value);
  return `${param.label}: ${option ? option.label : String(value)}`;
}

export default function UnderstoodChips({ template, values, extracted, onChange, onSwitchTemplate }: {
  template: Template;
  values: ParamValues;
  extracted: Set<string>;
  onChange: (values: ParamValues) => void;
  onSwitchTemplate: (id: string) => void;
}) {
  const [open, setOpen] = useState<string | null>(null); // param key or '__goal'

  const openParam = template.params.find((p) => p.key === open);

  return (
    <div className="understood">
      <span className="muted" style={{ fontSize: 13, marginRight: 4 }}>I understood:</span>
      <button className="chip goal" onClick={() => setOpen(open === '__goal' ? null : '__goal')}>
        ⚙ {template.name}
      </button>
      {template.params.map((param) => (
        <button
          key={param.key}
          className={`chip${extracted.has(param.key) ? ' extracted' : ' assumed'}`}
          onClick={() => setOpen(open === param.key ? null : param.key)}
          title={extracted.has(param.key) ? 'read from your request — tap to change' : 'assumed default — tap to change'}
        >
          {chipLabel(template, param.key, values[param.key])}
          {!extracted.has(param.key) && <span className="assumed-dot" />}
        </button>
      ))}

      {open === '__goal' && (
        <div className="sheet">
          <div className="sheet-title">What should the processor do?</div>
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              className={`sheet-row${t.id === template.id ? ' current' : ''}`}
              onClick={() => { onSwitchTemplate(t.id); setOpen(null); }}
            >
              <strong>{t.name}</strong>
              <span className="muted">{t.description}</span>
            </button>
          ))}
        </div>
      )}

      {openParam && (
        <div className="sheet">
          <div className="sheet-title">{openParam.label}</div>
          <div className="muted" style={{ fontSize: 13, padding: '0 4px 10px' }}>{openParam.help}</div>
          {(openParam.type === 'number') && (
            <div className="row" style={{ padding: '0 4px 8px' }}>
              <button className="btn secondary" onClick={() => onChange({ ...values, [openParam.key]: Math.max(openParam.min ?? 0, Number(values[openParam.key]) - (openParam.step ?? 1)) })}>−</button>
              <input
                type="number"
                value={Number(values[openParam.key])}
                min={openParam.min}
                max={openParam.max}
                onChange={(e) => onChange({ ...values, [openParam.key]: Number(e.target.value) })}
                style={{ maxWidth: 130, textAlign: 'center', fontSize: 16 }}
              />
              <button className="btn secondary" onClick={() => onChange({ ...values, [openParam.key]: Math.min(openParam.max ?? Infinity, Number(values[openParam.key]) + (openParam.step ?? 1)) })}>+</button>
              <button className="btn" onClick={() => setOpen(null)}>done</button>
            </div>
          )}
          {openParam.type === 'boolean' && (
            <div className="row" style={{ padding: '0 4px 8px' }}>
              {[true, false].map((b) => (
                <button
                  key={String(b)}
                  className={`btn${Boolean(values[openParam.key]) === b ? '' : ' secondary'}`}
                  onClick={() => { onChange({ ...values, [openParam.key]: b }); setOpen(null); }}
                >
                  {b ? 'yes' : 'no'}
                </button>
              ))}
            </div>
          )}
          {(openParam.type === 'text' || openParam.type === 'blockLink' || openParam.type === 'processor') && (
            <div className="row" style={{ padding: '0 4px 8px' }}>
              <input
                type="text"
                value={String(values[openParam.key] ?? '')}
                placeholder={openParam.linkHint}
                onChange={(e) => onChange({ ...values, [openParam.key]: e.target.value })}
                style={{ maxWidth: 240, fontSize: 16 }}
              />
              <button className="btn" onClick={() => setOpen(null)}>done</button>
            </div>
          )}
          {['unitType', 'itemType', 'liquidType', 'select'].includes(openParam.type) && (
            <div className="sheet-options">
              {optionsFor(openParam).map((option) => (
                <button
                  key={option.value}
                  className={`sheet-row${values[openParam.key] === option.value ? ' current' : ''}`}
                  onClick={() => { onChange({ ...values, [openParam.key]: option.value }); setOpen(null); }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
