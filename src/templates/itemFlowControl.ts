import { plain, type Template } from './types';
import { GraphBuilder } from './graphBuilder';

export const itemFlowControl: Template = {
  id: 'item-flow-control',
  name: 'Item Flow Control',
  description: 'Stops a conveyor or unloader when storage is full enough and starts it again when stock runs low — keeps buffers topped up without overflow.',
  category: 'Logistics',
  difficulty: 1,
  params: [
    { key: 'storage', label: 'Storage link', help: 'The linked container/vault whose stock is watched.', type: 'blockLink', default: 'vault1', linkHint: 'vault1' },
    { key: 'item', label: 'Item', help: 'The item being stocked.', type: 'itemType', default: '@thorium' },
    { key: 'feeder', label: 'Feeder link', help: 'The linked conveyor or unloader that delivers the item.', type: 'blockLink', default: 'unloader1', linkHint: 'unloader1 or conveyor1' },
    { key: 'stopAt', label: 'Stop above', help: 'Pause the feeder when stock reaches this amount.', type: 'number', default: 200, min: 1 },
    { key: 'startAt', label: 'Start below', help: 'Resume when stock falls below this amount (keep it lower than "Stop above").', type: 'number', default: 100, min: 0 },
  ],
  setupSteps: [
    'Place a Micro Processor near the storage block.',
    'Link the processor to the storage block and to the conveyor/unloader feeding it.',
    'Paste the code into the processor.',
  ],
  explain(values) {
    return [
      { title: 'Watch the stock', body: `The processor keeps an eye on how much ${plain(values.item)} is inside ${values.storage}.` },
      { title: 'Full enough → pause', body: `When stock reaches ${values.stopAt}, ${values.feeder} is switched off so nothing overflows down the line.` },
      { title: 'Running low → resume', body: `When stock falls below ${values.startAt}, ${values.feeder} switches back on. The gap between the two numbers prevents rapid on/off flapping.` },
    ];
  },
  buildGraph(values) {
    const g = new GraphBuilder();
    const start = g.node('start');
    const amount = g.node('sensor', { target: String(values.storage), property: String(values.item), varName: 'stock' });
    const full = g.node('if', { cond: 'greaterThanEq', b: String(values.stopAt) });
    const stop = g.node('control', { link: String(values.feeder), action: 'enabled', value: '0' });
    const lowCheck = g.node('if', { cond: 'lessThan', b: String(values.startAt) });
    const go = g.node('control', { link: String(values.feeder), action: 'enabled', value: '1' });

    g.chain(start, amount);
    g.exec(amount, full);
    g.data(amount, 'value', full, 'a');
    g.exec(full, stop, 'true');
    g.exec(full, lowCheck, 'false');
    g.data(amount, 'value', lowCheck, 'a');
    g.exec(lowCheck, go, 'true');
    return g.build();
  },
};
