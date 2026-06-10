// Example requests: drives the regression test AND the tappable examples
// on the Describe It page.

import type { ParamValues } from '../templates/types';

export interface CorpusRow {
  text: string;
  templateId?: string; // undefined ⇒ expected fallback
  expect?: ParamValues; // subset of values that must be extracted
  also?: string; // expected secondary intent
  /** featured on the page as a tappable example */
  example?: boolean;
}

export const CORPUS: readonly CorpusRow[] = [
  // unit-miner
  { text: 'make my monos mine titanium', templateId: 'unit-miner', expect: { unitType: '@mono', ore: '@titanium' }, example: true },
  { text: 'i want polys to dig up coal for me', templateId: 'unit-miner', expect: { unitType: '@poly', ore: '@coal' } },
  { text: 'automatically mine copper', templateId: 'unit-miner', expect: { ore: '@copper' } },
  { text: 'get some units harvesting scrap', templateId: 'unit-miner', expect: { ore: '@scrap' } },

  // reactor-cutoff
  { text: 'turn off the reactor when cryofluid gets low', templateId: 'reactor-cutoff', expect: { liquid: '@cryofluid' }, example: true },
  { text: 'stop my thorium reactor before it explodes', templateId: 'reactor-cutoff' },
  { text: 'shut down the reactor when coolant drops under 12', templateId: 'reactor-cutoff', expect: { threshold: 12 } },

  // turret-supply
  { text: 'keep my salvos full of graphite using flares', templateId: 'turret-supply', expect: { unitType: '@flare', item: '@graphite', turret: 'salvo1' }, example: true },
  { text: 'use a flare to bring ammo to my turret', templateId: 'turret-supply', expect: { unitType: '@flare' } },
  { text: 'restock the ripple with pyratite', templateId: 'turret-supply', expect: { item: '@pyratite', turret: 'ripple1' } },

  // enemy-alarm
  { text: 'warn me when enemies get close', templateId: 'enemy-alarm', example: true },
  { text: 'sound the alarm when flying enemies are incoming', templateId: 'enemy-alarm', expect: { filter: 'flying' } },
  { text: 'alert me about boss units with a switch', templateId: 'enemy-alarm', expect: { filter: 'boss', alarmBlock: 'switch1' } },

  // gate-automation
  { text: 'close the doors when enemies come near', templateId: 'gate-automation' },
  { text: 'automatic gate that opens when its safe', templateId: 'gate-automation' },
  { text: 'close the doors when enemies get close and warn me', templateId: 'gate-automation', also: 'enemy-alarm' },

  // core-dashboard
  { text: 'show how much copper and lead i have on a message block', templateId: 'core-dashboard', expect: { item1: '@copper', item2: '@lead' }, example: true },
  { text: 'how many thorium do i have in the vault', templateId: 'core-dashboard', expect: { item1: '@thorium', source: 'vault1' } },
  { text: 'monitor my silicon and graphite amounts', templateId: 'core-dashboard', expect: { item1: '@silicon', item2: '@graphite' } },

  // display-dashboard
  { text: 'show my copper as a bar on a display', templateId: 'display-dashboard', expect: { item: '@copper' } },
  { text: 'visualize titanium stock on the screen', templateId: 'display-dashboard', expect: { item: '@titanium' } },

  // power-saver
  { text: 'turn off my drills when battery is below 20%', templateId: 'power-saver', expect: { offBelow: 20, consumer: 'drill1' }, example: true },
  { text: 'save power by disabling the cultivator during a blackout', templateId: 'power-saver', expect: { consumer: 'cultivator1' } },

  // wave-countdown
  { text: 'show a countdown to the next wave', templateId: 'wave-countdown' },
  { text: 'how long until the wave comes', templateId: 'wave-countdown' },

  // item-flow-control
  { text: 'stop the unloader when the vault is too full', templateId: 'item-flow-control', expect: { feeder: 'unloader1', storage: 'vault1' } },
  { text: 'keep thorium stock between 100 and 300', templateId: 'item-flow-control', expect: { item: '@thorium', startAt: 100, stopAt: 300 } },
  { text: 'dont overfill the container with sand', templateId: 'item-flow-control', expect: { item: '@sand', storage: 'container1' } },

  // multi-intent ("on a display" is the stronger phrase; mining surfaces as the secondary)
  { text: 'mine copper and show it on a display', templateId: 'display-dashboard', expect: { item: '@copper' }, also: 'unit-miner' },

  // fallback / nonsense
  { text: 'make me a sandwich' },
  { text: 'fly me to the moon on a rocket' },
] as const;

export const EXAMPLES = CORPUS.filter((row) => row.example).map((row) => row.text);
