import { describe, it, expect } from 'vitest';
import { validate } from './validator';

const rules = (src: string) => validate(src).map((l) => l.rule);

describe('validator', () => {
  it('accepts a correct program', () => {
    const src = [
      '# reactor safety',
      'sensor cryo reactor1 @cryofluid',
      'jump 4 greaterThan cryo 10',
      'control enabled reactor1 0 0 0 0',
      'end',
      'control enabled reactor1 1 0 0 0',
    ].join('\n');
    expect(validate(src)).toEqual([]);
  });

  it('flags unknown instructions', () => {
    expect(rules('frobnicate x 1')).toContain('unknown-instruction');
  });

  it('flags unknown subcommands', () => {
    expect(rules('ucontrol teleport 1 2 0 0 0')).toContain('unknown-subcommand');
    expect(rules('op frob x 1 2')).toContain('unknown-subcommand');
  });

  it('flags missing args', () => {
    expect(rules('sensor result')).toContain('arg-count');
    expect(rules('ucontrol move 5')).toContain('arg-count');
  });

  it('flags literals in output positions', () => {
    expect(rules('sensor 5 block1 @copper')).toContain('output-literal');
    expect(rules('getlink "name" 0')).toContain('output-literal');
  });

  it('flags out-of-range numeric jump targets (comments excluded)', () => {
    const src = ['# comment', 'set x 1', 'jump 5 always 0 0'].join('\n');
    expect(rules(src)).toContain('jump-target');
    const ok = ['# comment', 'set x 1', 'jump 0 always 0 0'].join('\n');
    expect(rules(ok)).not.toContain('jump-target');
  });

  it('resolves label jumps', () => {
    const src = ['top:', 'set x 1', 'jump top always 0 0'].join('\n');
    expect(rules(src)).not.toContain('jump-target');
    expect(rules('jump nowhere always 0 0')).toContain('jump-target');
  });

  it('warns about print without printflush and draw without drawflush', () => {
    expect(rules('print "hello"')).toContain('missing-printflush');
    expect(rules('draw rect 0 0 10 10 0 0')).toContain('missing-drawflush');
    expect(rules('print "hello"\nprintflush message1')).not.toContain('missing-printflush');
  });

  it('warns about bad enum values', () => {
    expect(rules('radar enemies any any distance turret1 1 r\nset x r')).toContain('enum-value');
    expect(rules('jump 0 sometimes a b')).toContain('enum-value');
  });

  it('hints at unknown sensor properties', () => {
    expect(rules('sensor x block1 @helath')).toContain('unknown-sensor-prop');
    expect(rules('sensor x block1 @health')).not.toContain('unknown-sensor-prop');
    expect(rules('sensor x block1 @copper')).not.toContain('unknown-sensor-prop');
  });

  it('hints at missing null checks for radar results', () => {
    const unchecked = 'radar enemy any any distance turret1 1 target\nucontrol targetp target 1 0 0 0';
    expect(rules(unchecked)).toContain('missing-null-check');
    const checked = [
      'radar enemy any any distance turret1 1 target',
      'jump 0 equal target null',
      'ucontrol targetp target 1 0 0 0',
    ].join('\n');
    expect(rules(checked)).not.toContain('missing-null-check');
  });

  it('errors on programs over 1000 instructions', () => {
    const src = Array.from({ length: 1001 }, () => 'set x 1').join('\n');
    expect(rules(src)).toContain('too-long');
  });
});
