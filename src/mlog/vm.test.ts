import { describe, it, expect } from 'vitest';
import { runForDisplay } from './vm';

describe('vm', () => {
  it('collects draw calls into frames per drawflush', () => {
    const src = [
      'draw clear 10 20 30 0 0 0',
      'draw color 255 0 0 255 0 0',
      'draw rect 5 5 20 10 0 0',
      'drawflush display1',
    ].join('\n');
    const result = runForDisplay(src);
    expect(result.frames.length).toBeGreaterThanOrEqual(1);
    expect(result.frames[0]).toEqual([
      { op: 'clear', r: 10, g: 20, b: 30 },
      { op: 'color', r: 255, g: 0, b: 0, a: 255 },
      { op: 'rect', x: 5, y: 5, w: 20, h: 10 },
    ]);
  });

  it('evaluates op and jump for loop-drawn programs', () => {
    const src = [
      'set i 0',
      'loop:',
      'op mul x i 8',
      'draw rect x 0 4 4 0 0',
      'op add i i 1',
      'jump loop lessThan i 10',
      'drawflush display1',
    ].join('\n');
    const result = runForDisplay(src);
    expect(result.frames[0].filter((c) => c.op === 'rect')).toHaveLength(10);
    const last = result.frames[0][9] as { op: 'rect'; x: number };
    expect(last.x).toBe(72);
  });

  it('halts on step budget instead of hanging', () => {
    const result = runForDisplay('jump 0 always 0 0', { maxSteps: 500 });
    expect(result.steps).toBeLessThanOrEqual(500);
  });

  it('captures print output', () => {
    const src = ['print "hp: "', 'print 42', 'printflush message1'].join('\n');
    expect(runForDisplay(src).printOutput).toBe('hp: 42');
  });

  it('treats unknown instructions as no-ops with zeroed outputs', () => {
    const src = [
      'sensor amount container1 @copper',
      'draw rect amount 0 10 10 0 0',
      'drawflush display1',
    ].join('\n');
    const result = runForDisplay(src);
    expect(result.frames[0][0]).toEqual({ op: 'rect', x: 0, y: 0, w: 10, h: 10 });
  });
});
