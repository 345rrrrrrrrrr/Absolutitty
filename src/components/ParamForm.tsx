import type { Template, TemplateParam, ParamValues } from '../templates/types';
import { ITEMS, LIQUIDS, UNITS } from '../mlog/spec';

export function optionsFor(param: TemplateParam): { value: string; label: string }[] {
  switch (param.type) {
    case 'unitType': return UNITS.map((u) => ({ value: `@${u.name}`, label: u.label }));
    case 'itemType': return ITEMS.map((i) => ({ value: `@${i.name}`, label: i.label }));
    case 'liquidType': return LIQUIDS.map((l) => ({ value: `@${l.name}`, label: l.label }));
    case 'select': return param.options ?? [];
    default: return [];
  }
}

function Field({ param, value, onChange }: {
  param: TemplateParam;
  value: string | number | boolean;
  onChange: (v: string | number | boolean) => void;
}) {
  switch (param.type) {
    case 'number':
      return (
        <div className="field">
          <label>{param.label}</label>
          <input
            type="number"
            value={Number(value)}
            min={param.min}
            max={param.max}
            step={param.step ?? 1}
            onChange={(e) => onChange(Number(e.target.value))}
          />
          <div className="help">{param.help}</div>
        </div>
      );
    case 'boolean':
      return (
        <div className="field checkbox">
          <input type="checkbox" id={param.key} checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
          <label htmlFor={param.key}>{param.label}</label>
          <div className="help">{param.help}</div>
        </div>
      );
    case 'unitType':
    case 'itemType':
    case 'liquidType':
    case 'select':
      return (
        <div className="field">
          <label>{param.label}</label>
          <select value={String(value)} onChange={(e) => onChange(e.target.value)}>
            {optionsFor(param).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <div className="help">{param.help}</div>
        </div>
      );
    default: // text, blockLink, processor
      return (
        <div className="field">
          <label>{param.label}</label>
          <input
            type="text"
            value={String(value)}
            placeholder={param.linkHint}
            onChange={(e) => onChange(e.target.value)}
          />
          <div className="help">{param.help}</div>
        </div>
      );
  }
}

export default function ParamForm({ template, values, onChange }: {
  template: Template;
  values: ParamValues;
  onChange: (values: ParamValues) => void;
}) {
  return (
    <div>
      {template.params.map((param) => (
        <Field
          key={param.key}
          param={param}
          value={values[param.key] ?? param.default}
          onChange={(v) => onChange({ ...values, [param.key]: v })}
        />
      ))}
    </div>
  );
}
