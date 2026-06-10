// Request → ranked intents → best match with filled parameter values.

import { INTENTS } from './intents';
import { normalize, extractSlots } from './slots';
import { getTemplate } from '../templates';
import { defaultValues } from '../templates/generate';
import type { IntentDef, ExtractedSlots, MatchOutcome, MatchResult } from './types';

const PHRASE_WEIGHT = 4;
export const MIN_SCORE = 4;

interface Scored {
  intent: IntentDef;
  score: number;
  phraseHits: number;
  /** tokens that contributed (for multi-intent residue scoring) */
  matchedTokens: Set<string>;
}

/** light stem: try the token, then without plural/-ing/-ed suffixes */
function stems(token: string): string[] {
  const variants = [token];
  if (token.endsWith('ies')) variants.push(token.slice(0, -3) + 'y');
  if (token.endsWith('es')) variants.push(token.slice(0, -2));
  if (token.endsWith('s')) variants.push(token.slice(0, -1));
  if (token.endsWith('ing')) variants.push(token.slice(0, -3), token.slice(0, -3) + 'e');
  if (token.endsWith('ed')) variants.push(token.slice(0, -2), token.slice(0, -1));
  return variants;
}

/** phrase words must appear in order, allowing up to 2 tokens between them */
function phraseMatches(tokens: string[], phrase: string): boolean {
  const words = phrase.split(' ');
  let position = 0;
  for (let w = 0; w < words.length; w++) {
    let found = -1;
    const limit = w === 0 ? tokens.length : Math.min(position + 3, tokens.length);
    for (let i = position; i < limit; i++) {
      if (stems(tokens[i]).includes(words[w])) { found = i; break; }
    }
    if (found === -1) return false;
    position = found + 1;
  }
  return true;
}

function scoreIntent(intent: IntentDef, text: string, tokens: string[], slots: ExtractedSlots, exclude?: Set<string>): Scored {
  void text;
  let score = 0;
  let phraseHits = 0;
  const matchedTokens = new Set<string>();

  for (const phrase of intent.phrases) {
    if (phrase.split(' ').some((w) => exclude?.has(w))) continue;
    if (phraseMatches(tokens, phrase)) {
      score += PHRASE_WEIGHT;
      phraseHits++;
      for (const word of phrase.split(' ')) matchedTokens.add(word);
    }
  }
  for (const token of tokens) {
    if (exclude?.has(token)) continue;
    const variants = stems(token);
    const weight = Math.max(...variants.map((v) => intent.keywords[v] ?? 0));
    if (weight > 0) {
      score += weight;
      matchedTokens.add(token);
    }
    const penalty = Math.max(...variants.map((v) => intent.negative?.[v] ?? 0));
    if (penalty > 0) score -= penalty;
  }
  if (intent.slotBoosts) {
    if (intent.slotBoosts.item && slots.items.length > 0) score += intent.slotBoosts.item;
    if (intent.slotBoosts.liquid && slots.liquids.length > 0) score += intent.slotBoosts.liquid;
    if (intent.slotBoosts.unit && slots.units.length > 0) score += intent.slotBoosts.unit;
    if (intent.slotBoosts.block && slots.blocks.length > 0) score += intent.slotBoosts.block;
    if (intent.slotBoosts.number && slots.numbers.length > 0) score += intent.slotBoosts.number;
  }
  return { intent, score, phraseHits, matchedTokens };
}

export function matchRequest(text: string): MatchOutcome {
  const tokens = normalize(text);
  const normalizedText = tokens.join(' ');
  const slots = extractSlots(tokens);

  const scored = INTENTS.map((intent) => scoreIntent(intent, normalizedText, tokens, slots));
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.phraseHits !== a.phraseHits) return b.phraseHits - a.phraseHits;
    const aFilled = Object.keys(a.intent.fillParams(slots)).length;
    const bFilled = Object.keys(b.intent.fillParams(slots)).length;
    if (bFilled !== aFilled) return bFilled - aFilled;
    return INTENTS.indexOf(a.intent) - INTENTS.indexOf(b.intent); // popularity order
  });

  const scores = Object.fromEntries(scored.map((s) => [s.intent.templateId, s.score]));
  const top = scored[0];

  if (!top || top.score < MIN_SCORE) {
    return {
      best: undefined,
      alternatives: scored.slice(0, 3).filter((s) => s.score > 0).map((s) => ({ templateId: s.intent.templateId, score: s.score })),
      scores,
    };
  }

  const template = getTemplate(top.intent.templateId)!;
  const extracted = top.intent.fillParams(slots);
  const result: MatchResult = {
    templateId: top.intent.templateId,
    score: top.score,
    values: { ...defaultValues(template), ...extracted },
    extracted: new Set(Object.keys(extracted)),
  };

  // multi-intent: rescore the others with the winner's tokens removed
  for (const other of scored.slice(1)) {
    if (other.intent.templateId === top.intent.templateId) continue;
    const residual = scoreIntent(other.intent, normalizedText, tokens, slots, top.matchedTokens);
    if (residual.score >= MIN_SCORE) {
      result.also = { templateId: other.intent.templateId };
      break;
    }
  }

  return {
    best: result,
    alternatives: scored.slice(1, 4).filter((s) => s.score > 0).map((s) => ({ templateId: s.intent.templateId, score: s.score })),
    scores,
  };
}
