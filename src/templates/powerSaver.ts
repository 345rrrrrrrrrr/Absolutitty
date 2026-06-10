import type { Template } from './types';
import { GraphBuilder } from './graphBuilder';

export const powerSaver: Template = {
  id: 'power-saver',
  name: 'Power Saver',
  description: 'Turns power-hungry blocks off when your batteries run low and back on when they recover — no more blackout death spirals.',
  category: 'Safety & Power',
  difficulty: 1,
  params: [
    { key: 'battery', label: 'Battery link', help: 'Any linked battery on your main power grid.', type: 'blockLink', default: 'battery1', linkHint: 'battery1' },
    { key: 'consumer', label: 'Block to manage', help: 'The linked block to switch off in a power emergency (drill, cultivator, overdrive projector…).', type: 'blockLink', default: 'drill1', linkHint: 'drill1, projector1, …' },
    { key: 'offBelow', label: 'Turn off below %', help: 'Switch the block off when battery charge drops below this percentage.', type: 'number', default: 20, min: 1, max: 99 },
    { key: 'onAbove', label: 'Turn on above %', help: 'Switch it back on once charge rises above this percentage (keep it higher than the off threshold to avoid flicker).', type: 'number', default: 50, min: 2, max: 100 },
  ],
  setupSteps: [
    'Place a Micro Processor near a battery.',
    'Link the processor to the battery and to the block you want to manage.',
    'Paste the code into the processor.',
  ],
  explain(values) {
    return [
      { title: 'Check the battery', body: `The processor reads how much energy ${values.battery} holds versus its capacity and converts that to a percentage.` },
      { title: 'Emergency cut', body: `If charge drops below ${values.offBelow}%, ${values.consumer} is switched off so essentials (like turrets) keep their power.` },
      { title: 'Recovery', body: `Only once charge climbs back above ${values.onAbove}% does ${values.consumer} switch on again. The gap between the two thresholds stops it flickering on and off.` },
    ];
  },
  buildGraph(values) {
    const g = new GraphBuilder();
    const start = g.node('start');
    const stored = g.node('sensor', { target: String(values.battery), property: '@totalPower', varName: 'stored' });
    const capacity = g.node('sensor', { target: String(values.battery), property: '@powerCapacity', varName: 'capacity' });
    const pct = g.node('op', { op: 'div', varName: 'charge' });
    const pct100 = g.node('op', { op: 'mul', b: '100', varName: 'chargePct' });
    const low = g.node('if', { cond: 'lessThan', b: String(values.offBelow) });
    const off = g.node('control', { link: String(values.consumer), action: 'enabled', value: '0' });
    const high = g.node('if', { cond: 'greaterThan', b: String(values.onAbove) });
    const on = g.node('control', { link: String(values.consumer), action: 'enabled', value: '1' });

    g.chain(start, stored, capacity, pct, pct100);
    g.data(stored, 'value', pct, 'a');
    g.data(capacity, 'value', pct, 'b');
    g.data(pct, 'result', pct100, 'a');
    g.exec(pct100, low);
    g.data(pct100, 'result', low, 'a');
    g.exec(low, off, 'true');
    g.exec(low, high, 'false');
    g.data(pct100, 'result', high, 'a');
    g.exec(high, on, 'true');
    return g.build();
  },
};
