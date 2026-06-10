import type { Template } from './types';
import { GraphBuilder } from './graphBuilder';

export const enemyAlarm: Template = {
  id: 'enemy-alarm',
  name: 'Enemy Alarm',
  description: 'Watches for enemies near a turret and sounds the alarm: lights an illuminator, flips a switch and prints a warning.',
  category: 'Defense',
  difficulty: 1,
  params: [
    { key: 'turret', label: 'Watch turret', help: 'The linked turret whose range is scanned for enemies.', type: 'blockLink', default: 'turret1', linkHint: 'any linked turret, e.g. ripple1' },
    { key: 'filter', label: 'Watch for', help: 'Which enemies trigger the alarm.', type: 'select', default: 'any', options: [
      { value: 'any', label: 'any enemy' },
      { value: 'flying', label: 'flying enemies' },
      { value: 'ground', label: 'ground enemies' },
      { value: 'boss', label: 'boss / guardian units' },
    ] },
    { key: 'alarmBlock', label: 'Alarm block link', help: 'A linked illuminator or switch to turn on during an alarm.', type: 'blockLink', default: 'illuminator1', linkHint: 'illuminator1 or switch1' },
  ],
  setupSteps: [
    'Place a Micro Processor near a turret on your front line.',
    'Link the processor to the turret, an Illuminator (or Switch), and a Message block.',
    'Paste the code into the processor.',
  ],
  explain(values) {
    const what = values.filter === 'any' ? 'any enemy' : `${values.filter} enemies`;
    return [
      { title: 'Scan for trouble', body: `Every loop, the radar checks the area around ${values.turret} for ${what}. The search range equals the turret's own range.` },
      { title: 'Sound the alarm', body: `The moment something hostile shows up, ${values.alarmBlock} switches on and the message block shows a red warning with the enemy's position.` },
      { title: 'All clear', body: `When no enemies remain, the alarm switches off and the message changes back to "all clear" automatically.` },
    ];
  },
  buildGraph(values) {
    const g = new GraphBuilder();
    const filter = String(values.filter);
    const start = g.node('start');
    const radar = g.node('radar', {
      from: String(values.turret),
      filter1: 'enemy',
      filter2: filter === 'any' ? 'any' : filter,
      filter3: 'any',
      sort: 'distance', order: '1',
    });
    const alarmOn = g.node('control', { link: String(values.alarmBlock), action: 'enabled', value: '1' });
    const sx = g.node('sensor', { target: 'radarHit', property: '@x', varName: 'ex' });
    const warn = g.node('print', { text: '[red]! ENEMY DETECTED ![]\\nnear x: {a}', target: 'message1' });
    const alarmOff = g.node('control', { link: String(values.alarmBlock), action: 'enabled', value: '0' });
    const clear = g.node('print', { text: '[green]all clear[]', target: 'message1' });

    g.exec(start, radar);
    g.exec(radar, alarmOn, 'found');
    g.exec(alarmOn, sx);
    g.exec(sx, warn);
    g.data(radar, 'unit', sx, 'target');
    g.data(sx, 'value', warn, 'a');
    g.exec(radar, alarmOff, 'none');
    g.exec(alarmOff, clear);
    return g.build();
  },
};
