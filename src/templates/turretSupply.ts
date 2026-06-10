import { plain, type Template } from './types';
import { IRBuilder, v, n, at, kw } from '../mlog/ir';

export const turretSupply: Template = {
  id: 'turret-supply',
  name: 'Turret Ammo Courier',
  description: 'A flying unit fetches ammo from your core and keeps a turret topped up — perfect for outposts with no conveyor line.',
  category: 'Mining & Units',
  difficulty: 3,
  params: [
    { key: 'unitType', label: 'Courier unit', help: 'A flying unit to carry the ammo.', type: 'unitType', default: '@flare' },
    { key: 'turret', label: 'Turret link', help: 'The linked turret to keep supplied.', type: 'blockLink', default: 'turret1', linkHint: 'e.g. salvo1 — link the turret to the processor' },
    { key: 'item', label: 'Ammo item', help: 'The item the turret uses as ammo.', type: 'itemType', default: '@graphite' },
    { key: 'minAmmo', label: 'Refill when below', help: 'Send the courier when the turret has fewer items than this.', type: 'number', default: 10, min: 1 },
    { key: 'flag', label: 'Processor flag', help: 'Unique number so this processor does not steal units from others.', type: 'number', default: 2, min: 1, max: 999999 },
  ],
  setupSteps: [
    'Place a Logic Processor next to the turret (it must be linked).',
    'Link the processor to the turret.',
    'Make sure at least one courier unit exists (e.g. a Flare).',
    'Paste the code. The courier waits near the core and refills the turret as needed.',
  ],
  explain(values) {
    return [
      { title: 'Hire a courier', body: `The processor binds a ${plain(values.unitType)} and marks it with flag ${values.flag} so no other processor steals it.` },
      { title: 'Watch the turret', body: `It checks how much ${plain(values.item)} is inside ${values.turret}. While there's more than ${values.minAmmo}, the courier just waits — no wasted trips.` },
      { title: 'Fetch from the core', body: `When ammo runs low, the courier flies to your core, waits until it's actually close enough, and picks up a load of ${plain(values.item)}.` },
      { title: 'Deliver', body: `It carries the load back to ${values.turret} and drops everything in. Then back to watching.` },
    ];
  },
  buildIR(values) {
    const unitType = String(values.unitType);
    const turret = String(values.turret);
    const item = String(values.item);
    const minAmmo = Number(values.minAmmo);
    const flag = Number(values.flag);
    const b = new IRBuilder();

    const start = b.newLabel('start');
    const claim = b.newLabel('claim');
    const work = b.newLabel('work');
    const fetch = b.newLabel('fetch');
    const haul = b.newLabel('haul');

    b.comment(`Turret Ammo Courier — ${unitType.slice(1)} feeds ${item.slice(1)} to ${turret}`);
    b.comment('generated with mlog Forge');
    b.label(start);
    b.instr('ubind', at(unitType));
    b.jump(start, 'equal', at('unit'), kw('null'));
    b.instr('sensor', v('uFlag'), at('unit'), at('flag'));
    b.jump(claim, 'equal', v('uFlag'), n(0));
    b.jump(start, 'notEqual', v('uFlag'), n(flag));
    b.jump(work, 'always');
    b.label(claim);
    b.instr('ucontrol', kw('flag'), n(flag));
    b.label(work);
    b.comment('does the turret need ammo?');
    b.instr('sensor', v('turretAmmo'), v(turret), at(item));
    b.jump(start, 'greaterThan', v('turretAmmo'), n(minAmmo));
    b.comment('already carrying ammo? deliver it');
    b.instr('sensor', v('carriedType'), at('unit'), at('firstItem'));
    b.jump(haul, 'equal', v('carriedType'), at(item));
    b.label(fetch);
    b.comment('fetch ammo from the core');
    b.instr('ulocate', kw('building'), kw('core'), kw('false'), at('copper'), v('coreX'), v('coreY'), v('coreFound'), v('coreBlock'));
    b.jump(start, 'equal', v('coreFound'), kw('false'));
    b.instr('ucontrol', kw('approach'), v('coreX'), v('coreY'), n(4));
    b.instr('ucontrol', kw('within'), v('coreX'), v('coreY'), n(5), v('atCore'));
    b.jump(start, 'equal', v('atCore'), n(0));
    b.instr('ucontrol', kw('itemTake'), v('coreBlock'), at(item), n(999));
    b.label(haul);
    b.comment('deliver to the turret');
    b.instr('sensor', v('turretX'), v(turret), at('x'));
    b.instr('sensor', v('turretY'), v(turret), at('y'));
    b.instr('ucontrol', kw('approach'), v('turretX'), v('turretY'), n(4));
    b.instr('ucontrol', kw('within'), v('turretX'), v('turretY'), n(5), v('atTurret'));
    b.jump(start, 'equal', v('atTurret'), n(0));
    b.instr('ucontrol', kw('itemDrop'), v(turret), n(999));
    b.jump(start, 'always');
    return b.program();
  },
};
