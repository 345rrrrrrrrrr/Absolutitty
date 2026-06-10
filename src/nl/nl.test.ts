import { describe, it, expect } from 'vitest';
import { matchRequest } from './match';
import { CORPUS } from './corpus';
import { getTemplate } from '../templates';
import { generate } from '../templates/generate';
import { validate } from '../mlog/validator';

describe('plain-English matching (corpus)', () => {
  for (const row of CORPUS) {
    it(`"${row.text}"`, () => {
      const outcome = matchRequest(row.text);

      if (!row.templateId) {
        // expected fallback
        expect(outcome.best, `expected no match but got ${outcome.best?.templateId}\nscores: ${JSON.stringify(outcome.scores)}`).toBeUndefined();
        return;
      }

      expect(outcome.best, `no match\nscores: ${JSON.stringify(outcome.scores)}`).toBeDefined();
      expect(outcome.best!.templateId, `scores: ${JSON.stringify(outcome.scores)}`).toBe(row.templateId);

      if (row.expect) {
        for (const [key, value] of Object.entries(row.expect)) {
          expect(outcome.best!.values[key], `param ${key}`).toBe(value);
          expect(outcome.best!.extracted.has(key), `param ${key} should be marked extracted`).toBe(true);
        }
      }

      if (row.also) {
        expect(outcome.best!.also?.templateId).toBe(row.also);
      }

      // the matched result must produce clean, valid code
      const template = getTemplate(outcome.best!.templateId)!;
      const result = generate(template, outcome.best!.values);
      expect(result.errors).toEqual([]);
      const lints = validate(result.code).filter((l) => l.severity !== 'hint');
      expect(lints).toEqual([]);
    });
  }

  it('fallback offers alternatives for vague-but-related text', () => {
    const outcome = matchRequest('do something with items maybe');
    expect(outcome.best).toBeUndefined();
  });
});

describe('explanations', () => {
  it('every template explains itself with at least 2 sections', async () => {
    const { TEMPLATES } = await import('../templates');
    const { defaultValues } = await import('../templates/generate');
    const { explainTemplate } = await import('./explain');
    for (const template of TEMPLATES) {
      const sections = explainTemplate(template, defaultValues(template));
      expect(sections.length, template.id).toBeGreaterThanOrEqual(2);
      for (const section of sections) {
        expect(section.title.length, template.id).toBeGreaterThan(0);
        expect(section.body.length, template.id).toBeGreaterThan(0);
      }
    }
  });
});
