// Explanation sections for a template + values. Uses the template's own
// explain() when present; otherwise derives sections from the generated
// code's # comments.

import type { Template, ParamValues, ExplainSection } from '../templates/types';
import { generate } from '../templates/generate';

export function explainTemplate(template: Template, values: ParamValues): ExplainSection[] {
  if (template.explain) return template.explain(values);

  // generic fallback: each top-level # comment becomes a section title,
  // the instructions under it become the body
  const code = generate(template, values).code;
  const sections: ExplainSection[] = [];
  let current: { title: string; lines: string[] } | null = null;
  for (const line of code.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) {
      if (current && current.lines.length > 0) {
        sections.push({ title: current.title, body: `Runs: ${current.lines.join(' · ')}` });
      }
      current = { title: trimmed.replace(/^#\s*/, ''), lines: [] };
    } else if (current && trimmed !== '') {
      current.lines.push(trimmed.split(' ')[0]);
    }
  }
  if (current && current.lines.length > 0) {
    sections.push({ title: current.title, body: `Runs: ${current.lines.join(' · ')}` });
  }
  return sections;
}

/** helper for template explain() implementations */
export const strip = (value: unknown): string => String(value).replace(/^@/, '');
