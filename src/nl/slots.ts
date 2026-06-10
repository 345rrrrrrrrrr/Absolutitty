// Tokenization and slot extraction: entities (greedy multi-word match),
// numbers with comparators/percents, and context flags.

import { lookupEntity, lookupFlag, maxEntityPhraseLength } from './lexicon';
import type { ExtractedSlots, EntityHit, NumberHit, Comparator } from './types';

export function normalize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/(\d)\s*%/g, '$1 percent')
    .replace(/[^a-z0-9@\s.-]/g, ' ')
    .replace(/(?<![0-9])\.(?![0-9])/g, ' ') // keep decimal points, drop sentence dots
    .split(/\s+/)
    .filter((t) => t !== '' && t !== '-');
}

const BELOW_WORDS = new Set(['below', 'under', 'less', 'fewer', 'drops', 'drop', 'falls', 'fall', 'down', 'low', 'beneath']);
const ABOVE_WORDS = new Set(['above', 'over', 'more', 'exceeds', 'exceed', 'past', 'reaches', 'reach', 'hits', 'hit']);

function comparatorNear(tokens: string[], index: number): Comparator {
  for (let back = 1; back <= 3; back++) {
    const word = tokens[index - back];
    if (word === undefined) break;
    if (BELOW_WORDS.has(word)) return 'below';
    if (ABOVE_WORDS.has(word)) return 'above';
  }
  return 'exact';
}

export function extractSlots(tokens: string[]): ExtractedSlots {
  const slots: ExtractedSlots = {
    items: [], liquids: [], units: [], blocks: [],
    numbers: [], flags: new Set(), tokens,
  };

  const consumed = new Array<boolean>(tokens.length).fill(false);
  const maxLen = Math.min(maxEntityPhraseLength(), 3);

  // entities: greedy longest phrase first
  for (let len = maxLen; len >= 1; len--) {
    for (let i = 0; i + len <= tokens.length; i++) {
      if (consumed.slice(i, i + len).some(Boolean)) continue;
      const phrase = tokens.slice(i, i + len).join(' ');
      const entry = lookupEntity(phrase);
      if (!entry) continue;
      for (let k = i; k < i + len; k++) consumed[k] = true;
      const hit: EntityHit = { kind: entry.kind, name: entry.name, linkName: entry.linkName, index: i };
      // "5 flares" — a number right before a unit is a count
      const prev = tokens[i - 1];
      if (entry.kind === 'unit' && prev !== undefined && /^\d+$/.test(prev)) {
        hit.count = Number(prev);
        consumed[i - 1] = true;
      }
      slots[`${entry.kind}s` as 'items' | 'liquids' | 'units' | 'blocks'].push(hit);
    }
  }

  // numbers + flags on the remaining tokens
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (!consumed[i] && /^\d+(\.\d+)?$/.test(token)) {
      const isPercent = tokens[i + 1] === 'percent';
      const hit: NumberHit = {
        value: Number(token),
        isPercent,
        comparator: comparatorNear(tokens, i),
        index: i,
      };
      // "between 100 and 200" → above-100, below-200
      if (tokens[i - 1] === 'between') hit.comparator = 'above';
      if (tokens[i - 2] === 'between' || (tokens[i - 1] === 'and' && tokens[i - 3] === 'between')) {
        if (tokens[i - 1] === 'and') hit.comparator = 'below';
      }
      slots.numbers.push(hit);
    }
    const flag = lookupFlag(token);
    if (flag) slots.flags.add(flag);
  }

  // sort entities by appearance order
  for (const key of ['items', 'liquids', 'units', 'blocks'] as const) {
    slots[key].sort((a, b) => a.index - b.index);
  }
  slots.numbers.sort((a, b) => a.index - b.index);
  return slots;
}

/** convenience for fillParams implementations */
export function firstNumber(slots: ExtractedSlots, comparator?: Comparator): NumberHit | undefined {
  return comparator
    ? slots.numbers.find((n) => n.comparator === comparator)
    : slots.numbers[0];
}
