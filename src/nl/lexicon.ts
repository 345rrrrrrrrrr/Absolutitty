// Entity dictionaries for the plain-English parser — derived from the spec
// content lists (single source of truth) plus a small synonym table.

import { ITEMS, LIQUIDS, UNITS, LINKABLE_BLOCKS } from '../mlog/spec/content';

export type EntityKind = 'item' | 'liquid' | 'unit' | 'block';

export interface LexEntry {
  kind: EntityKind;
  /** canonical content name, e.g. 'phase-fabric', 'mono', 'thorium-reactor' */
  name: string;
  /** for blocks: default link name, e.g. 'salvo1', 'reactor1' */
  linkName?: string;
}

/** phrase (1..3 words, space separated, lowercase) → entity */
const phraseMap = new Map<string, LexEntry>();
let maxPhraseLen = 1;

function put(phrase: string, entry: LexEntry): void {
  const key = phrase.toLowerCase().trim();
  if (!key || phraseMap.has(key)) return; // first registration wins
  phraseMap.set(key, entry);
  maxPhraseLen = Math.max(maxPhraseLen, key.split(' ').length);
  // auto-plural (simple s/es) — registered only if free
  for (const suffix of ['s', 'es']) {
    const plural = key + suffix;
    if (!phraseMap.has(plural)) phraseMap.set(plural, entry);
  }
}

// items & liquids: name, hyphen→space variant, label
for (const item of ITEMS) {
  const entry: LexEntry = { kind: 'item', name: item.name };
  put(item.name, entry);
  put(item.name.replace(/-/g, ' '), entry);
  put(item.label, entry);
}
for (const liquid of LIQUIDS) {
  const entry: LexEntry = { kind: 'liquid', name: liquid.name };
  put(liquid.name, entry);
  put(liquid.label, entry);
}
for (const unit of UNITS) {
  const entry: LexEntry = { kind: 'unit', name: unit.name };
  put(unit.name, entry);
}
for (const block of LINKABLE_BLOCKS) {
  const entry: LexEntry = { kind: 'block', name: block.name, linkName: `${block.shortName}1` };
  put(block.name, entry);
  put(block.name.replace(/-/g, ' '), entry);
  put(block.label.toLowerCase().replace(/\s*\(.*\)/, ''), entry); // "Memory Cell (64 slots)" → "memory cell"
  put(block.shortName, entry);
}

// hand synonyms → existing entries
const SYNONYMS: Record<string, string> = {
  gate: 'door', gates: 'door',
  screen: 'logic-display', screens: 'logic-display',
  storage: 'vault', warehouse: 'vault',
  msg: 'message',
  light: 'illuminator', lamp: 'illuminator',
  turret: 'duo', turrets: 'duo', // generic "turret" → a turret link (turret1 is the wizard default wording)
  chest: 'container',
  miner: 'mono', miners: 'mono',
};
for (const [word, target] of Object.entries(SYNONYMS)) {
  const entry = phraseMap.get(target);
  if (entry) {
    const key = word.toLowerCase();
    if (!phraseMap.has(key)) phraseMap.set(key, entry);
  }
}
// generic "turret" should read as turret1, not duo1
phraseMap.set('turret', { kind: 'block', name: 'duo', linkName: 'turret1' });
phraseMap.set('turrets', { kind: 'block', name: 'duo', linkName: 'turret1' });

/** context flags: words that signal meaning without being entities */
const FLAG_WORDS: Record<string, string> = {
  ammo: 'ammo', ammunition: 'ammo',
  coolant: 'coolant',
  low: 'low', empty: 'low', 'runs out': 'low',
  full: 'full', overflow: 'full', overfill: 'full',
  enemy: 'enemy', enemies: 'enemy', attacker: 'enemy', attackers: 'enemy',
  flying: 'flying', air: 'flying',
  ground: 'ground',
  boss: 'boss', guardian: 'boss',
};

export function lookupEntity(phrase: string): LexEntry | undefined {
  return phraseMap.get(phrase);
}

export function lookupFlag(word: string): string | undefined {
  return FLAG_WORDS[word];
}

export function maxEntityPhraseLength(): number {
  return maxPhraseLen;
}
