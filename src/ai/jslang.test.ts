import { describe, it, expect } from 'vitest';
import { compileJS } from './jslang';
import { validate } from '../mlog/validator';

describe('mlogjs compile pipeline', () => {
  it('compiles a representative program to validator-clean mlog', () => {
    const result = compileJS(`
      const message = getBuilding('message1');
      const turret = getBuilding('salvo1');
      while (true) {
        const enemy = radar({ building: turret, filters: ['enemy', 'any', 'any'], order: 1, sort: 'distance' });
        if (enemy != undefined) {
          print\`enemy at \${Math.floor(enemy.x)}\`;
        } else {
          print('all clear');
        }
        printFlush(message);
      }
    `);
    expect(result.error).toBeUndefined();
    expect(result.mlog).toContain('radar enemy any any distance salvo1 1');
    const lints = validate(result.mlog!).filter((l) => l.severity !== 'hint');
    expect(lints).toEqual([]);
  });

  it('compiles the full unit vocabulary cleanly', () => {
    const result = compileJS(`
      unitBind(Units.flare);
      const u = Vars.unit;
      if (u != undefined) {
        if (u.flag === 0) unitControl.flag(3);
        const [found, , , core] = unitLocate.building({ group: 'core', enemy: false });
        if (found) {
          unitControl.approach({ x: core.x, y: core.y, radius: 5 });
          unitControl.itemTake(core, Items.graphite, 50);
        }
      }
    `);
    expect(result.error).toBeUndefined();
    const lints = validate(result.mlog!).filter((l) => l.severity === 'error');
    expect(lints).toEqual([]);
  });

  it('returns readable errors for broken source', () => {
    const result = compileJS('this is not javascript at all {{{');
    expect(result.error).toBeTruthy();
    expect(result.mlog).toBeUndefined();
  });
});
