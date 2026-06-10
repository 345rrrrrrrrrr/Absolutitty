import type { Template } from './types';
import { GraphBuilder } from './graphBuilder';

export const gateAutomation: Template = {
  id: 'gate-automation',
  name: 'Automatic Gate',
  description: 'Closes your doors when enemies come near a turret and opens them again when the coast is clear.',
  category: 'Defense',
  difficulty: 1,
  params: [
    { key: 'turret', label: 'Watch turret', help: 'The linked turret whose range is scanned for enemies.', type: 'blockLink', default: 'turret1', linkHint: 'any linked turret' },
    { key: 'door', label: 'Door link', help: 'The linked door to control. Link more doors and repeat the Control node for each.', type: 'blockLink', default: 'door1', linkHint: 'door1' },
  ],
  setupSteps: [
    'Place a Micro Processor near your gate.',
    'Link the processor to a turret that faces the approach, and to the door.',
    'Paste the code into the processor.',
    'Tip: link extra doors and duplicate the Control nodes in the editor for multi-door gates.',
  ],
  explain(values) {
    return [
      { title: 'Watch the approach', body: `The radar scans around ${values.turret} for enemies (the turret's range is the trigger distance).` },
      { title: 'Enemies near → close', body: `If anything hostile is in range, ${values.door} is forced shut so nothing slips through.` },
      { title: 'Safe → open', body: `As soon as the area is clear, ${values.door} opens again so your own units can pass freely.` },
    ];
  },
  buildGraph(values) {
    const g = new GraphBuilder();
    const start = g.node('start');
    const radar = g.node('radar', { from: String(values.turret), filter1: 'enemy', filter2: 'any', filter3: 'any', sort: 'distance', order: '1' });
    const close = g.node('control', { link: String(values.door), action: 'enabled', value: '0' });
    const open = g.node('control', { link: String(values.door), action: 'enabled', value: '1' });
    g.exec(start, radar);
    g.exec(radar, close, 'found');
    g.exec(radar, open, 'none');
    return g.build();
  },
};
