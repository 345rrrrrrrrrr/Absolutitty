import type { Template } from './types';
import { GraphBuilder } from './graphBuilder';

export const waveCountdown: Template = {
  id: 'wave-countdown',
  name: 'Wave Countdown',
  description: 'Shows the current wave number and a live countdown to the next wave on a message block.',
  category: 'Displays & Info',
  difficulty: 1,
  params: [
    { key: 'warnBelow', label: 'Warning seconds', help: 'Show a red warning when the countdown drops below this many seconds.', type: 'number', default: 15, min: 1, max: 120 },
  ],
  setupSteps: [
    'Place a Micro Processor anywhere.',
    'Link it to a Message block.',
    'Paste the code into the processor.',
  ],
  explain(values) {
    return [
      { title: 'Read the clock', body: 'The processor reads the built-in wave number and the seconds remaining until the next wave.' },
      { title: 'Show the countdown', body: `The message block shows the current wave and a live countdown. When fewer than ${values.warnBelow} seconds remain, it switches to a red "WAVE INCOMING" warning so you have time to get back to your defenses.` },
    ];
  },
  buildGraph(values) {
    const g = new GraphBuilder();
    const start = g.node('start');
    const wave = g.node('setvar', { varName: 'wave', value: '@waveNumber' });
    const time = g.node('op', { op: 'floor', a: '@waveTime', varName: 'seconds' });
    const soon = g.node('if', { cond: 'lessThan', b: String(values.warnBelow) });
    const warn = g.node('print', { text: '[red]! WAVE {a} INCOMING ![]\\n{b} seconds!', target: 'message1' });
    const calm = g.node('print', { text: 'Wave {a}\\nnext wave in [gold]{b}[]s', target: 'message1' });

    g.chain(start, wave, time);
    g.exec(time, soon);
    g.data(time, 'result', soon, 'a');
    g.exec(soon, warn, 'true');
    g.exec(soon, calm, 'false');
    g.data(wave, 'value', warn, 'a');
    g.data(time, 'result', warn, 'b');
    g.data(wave, 'value', calm, 'a');
    g.data(time, 'result', calm, 'b');
    return g.build();
  },
};
