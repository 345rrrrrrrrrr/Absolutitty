import { describe, it, expect } from 'vitest';
import { resolveLabels } from './labels';
import { validate } from './validator';

describe('resolveLabels', () => {
  it('resolves labels to numeric targets and strips label lines', () => {
    const source = [
      'loop:',
      'sensor amount vault1 @copper',
      'jump skip lessThan amount 100',
      'control enabled conveyor1 0 0 0 0',
      'skip:',
      'printflush message1',
      'jump loop always 0 0',
    ].join('\n');
    const resolved = resolveLabels(source);
    expect(resolved.split('\n')).toEqual([
      'sensor amount vault1 @copper',
      'jump 3 lessThan amount 100',
      'control enabled conveyor1 0 0 0 0',
      'printflush message1',
      'jump 0 always 0 0',
    ]);
    expect(validate(resolved).filter((l) => l.severity === 'error')).toEqual([]);
  });

  it('wraps a trailing label to 0', () => {
    const source = ['jump done always 0 0', 'print "x"', 'done:'].join('\n');
    expect(resolveLabels(source).split('\n')[0]).toBe('jump 0 always 0 0');
  });

  it('leaves numeric jumps and label-free code untouched', () => {
    const source = 'set x 1\njump 0 always 0 0';
    expect(resolveLabels(source)).toBe(source);
  });
});
