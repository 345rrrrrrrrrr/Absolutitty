import { describe, it, expect } from 'vitest';
import { TEMPLATES } from './index';
import { generate, defaultValues } from './generate';
import { validate } from '../mlog/validator';
import { MAX_INSTRUCTIONS } from '../mlog/spec';

// The project's main regression net: every template, with default params,
// must produce code that the validator accepts with no errors or warnings.
describe('templates', () => {
  for (const template of TEMPLATES) {
    describe(template.id, () => {
      it('builds without graph errors', () => {
        const result = generate(template, defaultValues(template));
        expect(result.errors).toEqual([]);
        expect(result.code.length).toBeGreaterThan(0);
      });

      it('stays within the instruction budget', () => {
        const result = generate(template, defaultValues(template));
        expect(result.instructions).toBeGreaterThan(0);
        expect(result.instructions).toBeLessThanOrEqual(MAX_INSTRUCTIONS);
      });

      it('validates with zero errors and warnings', () => {
        const result = generate(template, defaultValues(template));
        const lints = validate(result.code).filter((l) => l.severity !== 'hint');
        expect(lints).toEqual([]);
      });

      it('emits identical instructions with comments stripped', () => {
        const result = generate(template, defaultValues(template));
        const strip = (code: string) =>
          code.split('\n').filter((l) => !l.trim().startsWith('#') && l.trim() !== '').join('\n');
        expect(strip(result.code)).toBe(result.codeWithoutComments);
      });
    });
  }
});
