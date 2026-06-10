import { describe, it, expect } from 'vitest';
import { IRBuilder, v, n, s, at, kw } from './ir';
import { emit, instructionCount } from './emitter';

describe('emitter', () => {
  it('emits basic instructions with padding', () => {
    const b = new IRBuilder();
    b.instr('set', v('x'), n(5));
    b.instr('ucontrol', kw('move'), v('x'), v('y'));
    expect(emit(b.program())).toBe('set x 5\nucontrol move x y 0 0 0');
  });

  it('resolves labels to numeric indices, skipping comments', () => {
    const b = new IRBuilder();
    b.comment('header comment');
    const top = b.newLabel();
    b.label(top);
    b.instr('set', v('x'), n(0)); // index 0
    b.comment('mid comment');
    b.instr('op', kw('add'), v('x'), v('x'), n(1)); // index 1
    b.jump(top, 'lessThan', v('x'), n(10)); // index 2 → target 0
    const out = emit(b.program());
    expect(out).toContain('jump 0 lessThan x 10');
    // without comments the target number must be identical
    const noComments = emit(b.program(), { comments: false });
    expect(noComments).toContain('jump 0 lessThan x 10');
    expect(noComments).not.toContain('#');
  });

  it('emits filler args for always jumps', () => {
    const b = new IRBuilder();
    const end = b.newLabel();
    b.jump(end, 'always');
    b.label(end);
    b.instr('end');
    expect(emit(b.program())).toBe('jump 1 always 0 0\nend');
  });

  it('appends a trailing end when a label points past the last instruction', () => {
    const b = new IRBuilder();
    b.ifBlock('equal', v('x'), n(1), () => {
      b.instr('print', s('hi'));
    });
    const out = emit(b.program());
    const lines = out.split('\n');
    expect(lines[lines.length - 1]).toBe('end');
    // the if-false jump must land on the trailing end (index 2), not out of range
    expect(lines[0]).toBe('jump 2 notEqual x 1');
    expect(instructionCount(b.program())).toBe(3);
  });

  it('quotes strings and strips inner quotes', () => {
    const b = new IRBuilder();
    b.instr('print', s('say "hi"'));
    expect(emit(b.program())).toBe(`print "say 'hi'"`);
  });

  it('emits @builtins', () => {
    const b = new IRBuilder();
    b.instr('ubind', at('poly'));
    b.instr('sensor', v('hp'), at('unit'), at('health'));
    expect(emit(b.program())).toBe('ubind @poly\nsensor hp @unit @health');
  });

  it('ifBlock/else lowers correctly', () => {
    const b = new IRBuilder();
    b.ifBlock('greaterThan', v('x'), n(5), () => b.instr('print', s('big')), () => b.instr('print', s('small')));
    b.instr('end');
    const out = emit(b.program(), { comments: false }).split('\n');
    expect(out).toEqual([
      'jump 3 lessThanEq x 5', // inverted cond → else branch
      'print "big"',
      'jump 4 always 0 0', // skip else → end label
      'print "small"',
      'end',
    ]);
  });
});
