// One intent per wizard template: trigger phrases, weighted keywords, and
// how extracted slots fill that template's parameters.

import type { IntentDef, ExtractedSlots } from './types';
import type { ParamValues } from '../templates/types';
import { firstNumber } from './slots';

const at = (name: string) => `@${name}`;

function firstBlockLink(slots: ExtractedSlots, ...names: string[]): string | undefined {
  if (names.length === 0) return slots.blocks[0]?.linkName;
  const hit = slots.blocks.find((b) => names.some((n) => b.name.includes(n)));
  return hit?.linkName;
}

export const INTENTS: readonly IntentDef[] = [
  {
    templateId: 'unit-miner',
    phrases: ['mine for me', 'dig up'],
    keywords: { mine: 3, mining: 3, miner: 3, dig: 2, harvest: 3, gather: 2, collect: 1 },
    negative: { display: 1, wave: 2 },
    slotBoosts: { unit: 1, item: 1 },
    fillParams(slots) {
      const values: ParamValues = {};
      if (slots.units[0]) values.unitType = at(slots.units[0].name);
      if (slots.items[0]) values.ore = at(slots.items[0].name);
      return values;
    },
  },
  {
    templateId: 'reactor-cutoff',
    phrases: ['turn off the reactor', 'shut down the reactor', 'melt down', 'before it explodes'],
    keywords: { reactor: 3, meltdown: 3, cryofluid: 2, explode: 2, explodes: 2, safety: 1, overheat: 2, overheats: 2 },
    slotBoosts: { liquid: 1 },
    fillParams(slots) {
      const values: ParamValues = {};
      if (slots.liquids[0]) values.liquid = at(slots.liquids[0].name);
      const threshold = firstNumber(slots, 'below') ?? firstNumber(slots);
      if (threshold && !threshold.isPercent) values.threshold = threshold.value;
      const reactor = firstBlockLink(slots, 'reactor');
      if (reactor) values.reactor = reactor;
      return values;
    },
  },
  {
    templateId: 'turret-supply',
    phrases: ['keep full', 'keep loaded', 'keep supplied', 'topped up', 'top up', 'bring ammo', 'carry ammo'],
    keywords: { supply: 3, refill: 3, feed: 2, deliver: 2, courier: 3, restock: 3, reload: 2 },
    slotBoosts: { unit: 1, item: 1, block: 1 },
    fillParams(slots) {
      const values: ParamValues = {};
      if (slots.units[0]) values.unitType = at(slots.units[0].name);
      if (slots.items[0]) values.item = at(slots.items[0].name);
      const turret = firstBlockLink(slots, 'salvo', 'duo', 'scatter', 'scorch', 'hail', 'wave', 'lancer', 'arc', 'swarmer', 'cyclone', 'ripple', 'fuse', 'spectre', 'meltdown', 'foreshadow');
      if (turret) values.turret = turret;
      const min = firstNumber(slots, 'below');
      if (min && !min.isPercent) values.minAmmo = min.value;
      return values;
    },
  },
  {
    templateId: 'enemy-alarm',
    phrases: ['warn me', 'alert me', 'tell me when', 'sound the alarm', 'let me know'],
    keywords: { warn: 3, alarm: 3, alert: 3, siren: 3, incoming: 2, detect: 2, watch: 1, notify: 2 },
    negative: { door: 2, gate: 2, wave: 2 },
    fillParams(slots) {
      const values: ParamValues = {};
      if (slots.flags.has('flying')) values.filter = 'flying';
      else if (slots.flags.has('ground')) values.filter = 'ground';
      else if (slots.flags.has('boss')) values.filter = 'boss';
      const alarm = firstBlockLink(slots, 'illuminator', 'switch');
      if (alarm) values.alarmBlock = alarm;
      const turret = firstBlockLink(slots, 'salvo', 'duo', 'ripple', 'cyclone');
      if (turret) values.turret = turret;
      return values;
    },
  },
  {
    templateId: 'gate-automation',
    phrases: ['close the doors', 'close the gates', 'open the doors', 'open the gates', 'automatic door', 'automatic gate'],
    keywords: { door: 3, doors: 3, gate: 3, gates: 3, close: 1, open: 1 },
    fillParams(slots) {
      const values: ParamValues = {};
      const door = firstBlockLink(slots, 'door');
      if (door) values.door = door;
      return values;
    },
  },
  {
    templateId: 'core-dashboard',
    phrases: ['how much', 'how many', 'on a message', 'message block'],
    keywords: { show: 2, amounts: 2, amount: 1, stock: 1, inventory: 2, resources: 1, readout: 2, status: 1, monitor: 2 },
    negative: { display: 3, screen: 3, bar: 2, wave: 2, mine: 2 },
    slotBoosts: { item: 1 },
    fillParams(slots) {
      const values: ParamValues = {};
      slots.items.slice(0, 3).forEach((item, i) => { values[`item${i + 1}`] = at(item.name); });
      const source = firstBlockLink(slots, 'vault', 'container', 'core');
      if (source) values.source = source;
      return values;
    },
  },
  {
    templateId: 'display-dashboard',
    phrases: ['on a display', 'on the display', 'on a screen', 'on the screen', 'status bar', 'fill bar'],
    keywords: { display: 3, screen: 3, bar: 2, graph: 2, visualize: 3, visual: 2, draw: 2 },
    fillParams(slots) {
      const values: ParamValues = {};
      if (slots.items[0]) values.item = at(slots.items[0].name);
      const capacity = firstNumber(slots, 'exact') ?? firstNumber(slots, 'above');
      if (capacity && !capacity.isPercent && capacity.value > 1) values.capacity = capacity.value;
      const storage = firstBlockLink(slots, 'vault', 'container', 'core');
      if (storage) values.storage = storage;
      return values;
    },
  },
  {
    templateId: 'power-saver',
    phrases: ['save power', 'power runs out', 'save energy', 'low power', 'power is low'],
    keywords: { power: 3, battery: 3, batteries: 3, charge: 2, blackout: 3, brownout: 3, energy: 2 },
    negative: { reactor: 2 },
    slotBoosts: { block: 1, number: 1 },
    fillParams(slots) {
      const values: ParamValues = {};
      const off = slots.numbers.find((n) => n.isPercent && n.comparator === 'below') ?? slots.numbers.find((n) => n.isPercent);
      if (off) values.offBelow = off.value;
      const on = slots.numbers.find((n) => n.isPercent && n.comparator === 'above' && n !== off);
      if (on) values.onAbove = on.value;
      const consumer = firstBlockLink(slots, 'drill', 'cultivator', 'projector', 'unloader');
      if (consumer) values.consumer = consumer;
      return values;
    },
  },
  {
    templateId: 'wave-countdown',
    phrases: ['next wave', 'until the wave', 'wave timer', 'how long until'],
    keywords: { wave: 3, waves: 3, countdown: 3, timer: 2 },
    fillParams(slots) {
      const values: ParamValues = {};
      const warn = firstNumber(slots, 'below') ?? firstNumber(slots);
      if (warn && !warn.isPercent) values.warnBelow = warn.value;
      return values;
    },
  },
  {
    templateId: 'item-flow-control',
    phrases: ['stop when full', 'too full', 'dont overfill', 'keep between', 'stop the conveyor', 'stop the unloader'],
    keywords: { overflow: 3, overfill: 3, conveyor: 2, unloader: 2, stock: 2, between: 2, stop: 1, pause: 1 },
    negative: { display: 2, mine: 2 },
    fillParams(slots) {
      const values: ParamValues = {};
      if (slots.items[0]) values.item = at(slots.items[0].name);
      const stop = firstNumber(slots, 'below') ?? slots.numbers[1];
      const start = firstNumber(slots, 'above') ?? slots.numbers[0];
      if (start && stop && start !== stop && !start.isPercent && !stop.isPercent) {
        values.startAt = Math.min(start.value, stop.value);
        values.stopAt = Math.max(start.value, stop.value);
      } else if (stop && !stop.isPercent) {
        values.stopAt = stop.value;
      }
      const feeder = firstBlockLink(slots, 'unloader', 'conveyor');
      if (feeder) values.feeder = feeder;
      const storage = firstBlockLink(slots, 'vault', 'container');
      if (storage) values.storage = storage;
      return values;
    },
  },
] as const;
