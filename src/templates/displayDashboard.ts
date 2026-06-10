import type { Template } from './types';
import { GraphBuilder } from './graphBuilder';

export const displayDashboard: Template = {
  id: 'display-dashboard',
  name: 'Display Status Bar',
  description: 'Draws a live fill-level bar for any storage block on a logic display — see your stock from across the map.',
  category: 'Displays & Info',
  difficulty: 2,
  params: [
    { key: 'storage', label: 'Storage link', help: 'The linked container/vault/core to visualize.', type: 'blockLink', default: 'vault1', linkHint: 'vault1' },
    { key: 'item', label: 'Item', help: 'Which item the bar shows.', type: 'itemType', default: '@copper' },
    { key: 'capacity', label: 'Full at', help: 'The amount that counts as a full bar (a vault holds 1000 of each item).', type: 'number', default: 1000, min: 1 },
    { key: 'display', label: 'Display link', help: 'The linked logic display.', type: 'blockLink', default: 'display1', linkHint: 'display1' },
  ],
  setupSteps: [
    'Place a Logic Processor near a storage block and a Logic Display.',
    'Link the processor to both.',
    'Paste the code — the display shows a labeled fill bar.',
  ],
  buildGraph(values) {
    const g = new GraphBuilder();
    const start = g.node('start');
    const clear = g.node('draw', { shape: 'clear', a1: '20', a2: '22', a3: '26' });
    const amount = g.node('sensor', { target: String(values.storage), property: String(values.item), varName: 'amount' });
    const ratio = g.node('op', { op: 'div', b: String(values.capacity), varName: 'ratio' });
    const clamped = g.node('op', { op: 'min', b: '1', varName: 'fill' });
    const width = g.node('op', { op: 'mul', b: '64', varName: 'barWidth' });
    const colorBar = g.node('draw', { shape: 'color', a1: '255', a2: '211', a3: '127', a4: '255' });
    const bar = g.node('draw', { shape: 'rect', a1: '8', a2: '30', a4: '20' });
    const colorFrame = g.node('draw', { shape: 'color', a1: '120', a2: '130', a3: '146', a4: '255' });
    const frame = g.node('draw', { shape: 'lineRect', a1: '7', a2: '29', a3: '66', a4: '22' });
    const icon = g.node('draw', { shape: 'image', a1: '40', a2: '62', a3: String(values.item), a4: '16' });
    const flush = g.node('drawflush', { target: String(values.display) });

    g.chain(start, clear, amount, ratio, clamped, width, colorBar, bar, colorFrame, frame, icon, flush);
    g.data(amount, 'value', ratio, 'a');
    g.data(ratio, 'result', clamped, 'a');
    g.data(clamped, 'result', width, 'a');
    g.data(width, 'result', bar, 'a3');
    return g.build();
  },
};
