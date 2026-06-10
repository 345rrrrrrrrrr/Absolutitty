import type { Template } from './types';
import { GraphBuilder } from './graphBuilder';

export const reactorCutoff: Template = {
  id: 'reactor-cutoff',
  name: 'Reactor Safety Cutoff',
  description: 'Shuts a thorium reactor down before it melts down — turns it off when coolant runs low and back on when it is safe.',
  category: 'Safety & Power',
  difficulty: 1,
  params: [
    { key: 'reactor', label: 'Reactor link', help: 'Link the processor to your reactor; its name appears in the processor UI (usually reactor1).', type: 'blockLink', default: 'reactor1', linkHint: 'reactor1' },
    { key: 'liquid', label: 'Coolant', help: 'The liquid that cools the reactor.', type: 'liquidType', default: '@cryofluid' },
    { key: 'threshold', label: 'Minimum coolant', help: 'Turn the reactor off when the stored coolant drops below this.', type: 'number', default: 15, min: 1, max: 60 },
    { key: 'message', label: 'Status message block', help: 'Optional: link a message block to see the reactor status.', type: 'boolean', default: true },
  ],
  setupSteps: [
    'Place a Micro or Logic Processor next to your thorium reactor.',
    'Link the processor to the reactor (tap the processor, then the reactor).',
    'Optionally link a Message block for a status readout.',
    'Paste the code: edit the processor → Import from clipboard.',
  ],
  buildGraph(values) {
    const g = new GraphBuilder();
    const start = g.node('start');
    const sense = g.node('sensor', { target: String(values.reactor), property: String(values.liquid), varName: 'coolant' });
    const check = g.node('if', { cond: 'greaterThan', b: String(values.threshold) });
    const on = g.node('control', { link: String(values.reactor), action: 'enabled', value: '1' });
    const off = g.node('control', { link: String(values.reactor), action: 'enabled', value: '0' });
    g.chain(start, sense);
    g.exec(sense, check);
    g.data(sense, 'value', check, 'a');
    g.exec(check, on, 'true');
    g.exec(check, off, 'false');
    if (values.message) {
      const okMsg = g.node('print', { text: 'Reactor OK\\nCoolant: {a}', target: 'message1' });
      const warnMsg = g.node('print', { text: '[red]REACTOR OFF[]\\nCoolant low: {a}', target: 'message1' });
      g.exec(on, okMsg);
      g.exec(off, warnMsg);
      g.data(sense, 'value', okMsg, 'a');
      g.data(sense, 'value', warnMsg, 'a');
    }
    return g.build();
  },
};
