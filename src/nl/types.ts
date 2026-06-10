import type { ParamValues } from '../templates/types';
import type { EntityKind } from './lexicon';

export interface EntityHit {
  kind: EntityKind;
  name: string; // canonical content name
  linkName?: string; // for blocks
  index: number; // token position, for ordering
  count?: number; // "5 flares" → 5
}

export type Comparator = 'below' | 'above' | 'exact';

export interface NumberHit {
  value: number;
  isPercent: boolean;
  comparator: Comparator;
  index: number;
}

export interface ExtractedSlots {
  items: EntityHit[];
  liquids: EntityHit[];
  units: EntityHit[];
  blocks: EntityHit[];
  numbers: NumberHit[];
  flags: Set<string>;
  /** all normalized tokens (for keyword scoring) */
  tokens: string[];
}

export type SlotKind = EntityKind | 'number';

export interface IntentDef {
  templateId: string;
  /** multi-word trigger phrases (matched against the normalized text) — weight 4 each */
  phrases: string[];
  /** single normalized token → weight 1..3 */
  keywords: Record<string, number>;
  /** tokens that count against this intent */
  negative?: Record<string, number>;
  /** slot kinds whose presence adds weight */
  slotBoosts?: Partial<Record<SlotKind, number>>;
  /** map extracted slots onto this template's params; set only what was found */
  fillParams(slots: ExtractedSlots): ParamValues;
}

export interface MatchResult {
  templateId: string;
  score: number;
  values: ParamValues; // defaults overlaid with extracted
  extracted: Set<string>; // param keys that came from the text
  also?: { templateId: string };
}

export interface MatchOutcome {
  best?: MatchResult;
  alternatives: { templateId: string; score: number }[];
  /** per-intent score table (debugging / tests) */
  scores: Record<string, number>;
}
