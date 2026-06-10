import { plain, type Template } from './types';
import { GraphBuilder } from './graphBuilder';

export const coreDashboard: Template = {
  id: 'core-dashboard',
  name: 'Core Resource Monitor',
  description: 'Shows live amounts of three chosen resources from any container, vault or core on a message block.',
  category: 'Displays & Info',
  difficulty: 1,
  params: [
    { key: 'source', label: 'Storage link', help: 'The linked container/vault/core to read from.', type: 'blockLink', default: 'vault1', linkHint: 'vault1, container1 or core (via Locate)' },
    { key: 'item1', label: 'Resource 1', help: 'First item to display.', type: 'itemType', default: '@copper' },
    { key: 'item2', label: 'Resource 2', help: 'Second item to display.', type: 'itemType', default: '@lead' },
    { key: 'item3', label: 'Resource 3', help: 'Third item to display.', type: 'itemType', default: '@titanium' },
  ],
  setupSteps: [
    'Place a Micro Processor near a vault, container or core.',
    'Link the processor to the storage block AND to a Message block.',
    'Paste the code into the processor.',
  ],
  explain(values) {
    return [
      { title: 'Read the storage', body: `Each loop, the processor asks ${values.source} how much ${plain(values.item1)}, ${plain(values.item2)} and ${plain(values.item3)} it currently holds.` },
      { title: 'Print the numbers', body: 'The three live amounts are written onto the linked message block, with a gold header. The text refreshes continuously, so it is always current.' },
    ];
  },
  buildGraph(values) {
    const g = new GraphBuilder();
    const start = g.node('start');
    const s1 = g.node('sensor', { target: String(values.source), property: String(values.item1) });
    const s2 = g.node('sensor', { target: String(values.source), property: String(values.item2) });
    const s3 = g.node('sensor', { target: String(values.source), property: String(values.item3) });
    const label = (item: unknown) => String(item).replace('@', '');
    const print = g.node('print', {
      text: `[gold]== Storage ==[]\\n${label(values.item1)}: {a}\\n${label(values.item2)}: {b}\\n${label(values.item3)}: {c}`,
      target: 'message1',
    });
    g.chain(start, s1, s2, s3, print);
    g.data(s1, 'value', print, 'a');
    g.data(s2, 'value', print, 'b');
    g.data(s3, 'value', print, 'c');
    return g.build();
  },
};
