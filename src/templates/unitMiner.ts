import type { Template } from './types';
import { IRBuilder, v, n, s, at, kw } from '../mlog/ir';

export const unitMiner: Template = {
  id: 'unit-miner',
  name: 'Unit Miner',
  description: 'Commands your units to mine an ore and deliver it to the core, forever. Uses the flag system so it never steals units from other processors.',
  category: 'Mining & Units',
  difficulty: 2,
  params: [
    { key: 'unitType', label: 'Unit type', help: 'Which units do the mining. Mono/Poly/Mega can mine; Mono is the classic choice.', type: 'unitType', default: '@mono' },
    { key: 'ore', label: 'Ore to mine', help: 'The resource your units dig up.', type: 'itemType', default: '@copper' },
    { key: 'flag', label: 'Processor flag', help: 'A unique number marking units as belonging to THIS processor. Use a different number for every unit-control processor.', type: 'number', default: 1, min: 1, max: 999999 },
    { key: 'message', label: 'Status readout', help: 'Print a small status to a linked message block.', type: 'boolean', default: false },
  ],
  setupSteps: [
    'Build some units that can mine (e.g. Monos from an Air Factory).',
    'Place a Logic Processor anywhere — units are commanded map-wide.',
    'Optionally link a Message block for status.',
    'Paste the code. Every unit of the chosen type gets put to work automatically.',
  ],
  buildIR(values) {
    const unitType = String(values.unitType);
    const ore = String(values.ore);
    const flag = Number(values.flag);
    const b = new IRBuilder();

    const start = b.newLabel('start');
    const claim = b.newLabel('claim');
    const work = b.newLabel('work');
    const deliver = b.newLabel('deliver');

    b.comment(`Unit Miner — ${unitType.slice(1)} mines ${ore.slice(1)} and delivers to the core`);
    b.comment('generated with mlog Forge');
    b.label(start);
    b.comment('bind the next unit; skip if it belongs to another processor');
    b.instr('ubind', at(unitType));
    b.jump(start, 'equal', at('unit'), kw('null'));
    b.instr('sensor', v('uFlag'), at('unit'), at('flag'));
    b.jump(claim, 'equal', v('uFlag'), n(0));
    b.jump(start, 'notEqual', v('uFlag'), n(flag));
    b.jump(work, 'always');
    b.label(claim);
    b.comment('claim the fresh unit with our flag');
    b.instr('ucontrol', kw('flag'), n(flag));
    b.label(work);
    b.comment('full? deliver — otherwise go mine');
    b.instr('sensor', v('capacity'), at('unit'), at('itemCapacity'));
    b.instr('sensor', v('carrying'), at('unit'), at('totalItems'));
    b.jump(deliver, 'greaterThanEq', v('carrying'), v('capacity'));
    b.comment('find the nearest ore tile and mine it');
    b.instr('ulocate', kw('ore'), kw('core'), kw('true'), at(ore), v('oreX'), v('oreY'), v('oreFound'), v('_'));
    b.jump(start, 'equal', v('oreFound'), kw('false'));
    b.instr('ucontrol', kw('approach'), v('oreX'), v('oreY'), n(5));
    b.instr('ucontrol', kw('mine'), v('oreX'), v('oreY'));
    b.jump(start, 'always');
    b.label(deliver);
    b.comment('fly home and drop everything into the core');
    b.instr('ulocate', kw('building'), kw('core'), kw('false'), at('copper'), v('coreX'), v('coreY'), v('coreFound'), v('coreBlock'));
    b.jump(start, 'equal', v('coreFound'), kw('false'));
    b.instr('ucontrol', kw('approach'), v('coreX'), v('coreY'), n(5));
    b.instr('ucontrol', kw('itemDrop'), v('coreBlock'), n(999));
    if (values.message) {
      b.instr('print', s('mining '));
      b.instr('print', at(ore));
      b.instr('print', s(' | carrying: '));
      b.instr('print', v('carrying'));
      b.instr('printflush', v('message1'));
    }
    b.jump(start, 'always');
    return b.program();
  },
};
