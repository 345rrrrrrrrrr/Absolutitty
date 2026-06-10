import { describe, it, expect } from 'vitest';
import { GraphBuilder } from '../templates/graphBuilder';
import { compileGraph } from './compile';
import { emit } from '../mlog/emitter';

describe('compileGraph', () => {
  it('requires a start node', () => {
    const result = compileGraph({ nodes: [], edges: [] });
    expect(result.errors[0].message).toContain('Start');
  });

  it('compiles a linear chain ending with a loop jump', () => {
    const g = new GraphBuilder();
    const start = g.node('start');
    const sense = g.node('sensor', { target: 'vault1', property: '@copper', varName: 'cu' });
    const print = g.node('print', { text: 'cu: {a}', target: 'message1' });
    g.chain(start, sense, print);
    g.data(sense, 'value', print, 'a');
    const { ir, errors } = compileGraph(g.build());
    expect(errors).toEqual([]);
    const code = emit(ir, { comments: false }).split('\n');
    expect(code).toEqual([
      'sensor cu vault1 @copper',
      'print "cu: "',
      'print cu',
      'printflush message1',
      'jump 0 always 0 0',
    ]);
  });

  it('compiles if branches with both paths returning to the loop top', () => {
    const g = new GraphBuilder();
    const start = g.node('start');
    const check = g.node('if', { cond: 'greaterThan', a: 'x', b: '5' });
    const yes = g.node('control', { link: 'door1', action: 'enabled', value: '1' });
    const no = g.node('control', { link: 'door1', action: 'enabled', value: '0' });
    g.exec(start, check);
    g.exec(check, yes, 'true');
    g.exec(check, no, 'false');
    const { ir, errors } = compileGraph(g.build());
    expect(errors).toEqual([]);
    const code = emit(ir, { comments: false }).split('\n');
    expect(code).toEqual([
      'jump 3 lessThanEq x 5',
      'control enabled door1 1 0 0 0',
      'jump 0 always 0 0',
      'control enabled door1 0 0 0 0',
      'jump 0 always 0 0',
    ]);
  });

  it('rejects nodes not connected to the flow', () => {
    const g = new GraphBuilder();
    g.node('start');
    g.node('wait', { seconds: 1 }); // dangling
    const { errors } = compileGraph(g.build());
    expect(errors.some((e) => e.message.includes('not connected'))).toBe(true);
  });

  it('rejects exec cycles', () => {
    const g = new GraphBuilder();
    const start = g.node('start');
    const a = g.node('wait', { seconds: 1 });
    const b2 = g.node('wait', { seconds: 2 });
    g.exec(start, a);
    g.exec(a, b2);
    g.exec(b2, a); // cycle
    const { errors } = compileGraph(g.build());
    expect(errors.some((e) => e.message.includes('loops back'))).toBe(true);
  });

  it('radar branch includes the built-in null check', () => {
    const g = new GraphBuilder();
    const start = g.node('start');
    const radar = g.node('radar', { from: 'turret1', filter1: 'enemy', filter2: 'any', filter3: 'any', sort: 'distance', order: '1' });
    const hit = g.node('control', { link: 'switch1', action: 'enabled', value: '1' });
    g.exec(start, radar);
    g.exec(radar, hit, 'found');
    const { ir, errors } = compileGraph(g.build());
    expect(errors).toEqual([]);
    const code = emit(ir, { comments: false });
    expect(code).toContain('radar enemy any any distance turret1 1');
    expect(code).toMatch(/jump \d+ equal \S+ null/);
  });
});
