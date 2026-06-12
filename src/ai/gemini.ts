// Gemini-powered request → mlog generation. The API key is supplied by the
// user (in-app settings, stored in localStorage) or a local .env file —
// never hardcoded, since this repo is public.

import { validate, type Lint } from '../mlog/validator';
import { resolveLabels, trimExtraArgs } from '../mlog/labels';
import { INSTRUCTIONS, OPS, SENSOR_PROPS, BUILTIN_VARS } from '../mlog/spec';

// primary model + fallback when Google reports overload/rate limits
const MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite'] as const;
const endpoint = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
const STORAGE_KEY = 'geminiApiKey';

export function getStoredApiKey(): string {
  return localStorage.getItem(STORAGE_KEY) ?? import.meta.env.VITE_GEMINI_API_KEY ?? '';
}

export function storeApiKey(key: string): void {
  if (key) localStorage.setItem(STORAGE_KEY, key);
  else localStorage.removeItem(STORAGE_KEY);
}

export interface AIResult {
  code: string;
  setupSteps: string[];
  explanation: { title: string; body: string }[];
  lints: Lint[];
  /** how many drafts it took (1 = clean first try) */
  rounds: number;
  /** whether the final logic self-review pass ran */
  reviewed: boolean;
}

// Condensed mlog reference assembled from the spec data (single source of truth).
function buildReference(): string {
  const instructionLines = INSTRUCTIONS.map((spec) => {
    if (spec.variants) {
      const subs = spec.variants.map((v) => v.sub).join('|');
      return `${spec.name} <${subs}> ... — ${spec.doc}`;
    }
    const args = (spec.args ?? []).map((a) => (a.kind === 'output' ? `>${a.name}` : a.name)).join(' ');
    return `${spec.name} ${args} — ${spec.doc}`;
  });
  return [
    'INSTRUCTIONS (the ONLY valid ones):',
    ...instructionLines,
    '',
    `op operations: ${OPS.map((o) => o.name).join(', ')} (trig in degrees)`,
    `sensor properties: ${SENSOR_PROPS.map((p) => '@' + p.name).join(', ')} — plus any item/liquid like @copper reads the stored amount`,
    `builtin vars: ${BUILTIN_VARS.map((b) => '@' + b.name).join(', ')}, true, false, null`,
  ].join('\n');
}

const RULES = `STRICT RULES for the mlog you write:
- Use ONLY instructions from the reference. One instruction per line. Max 1000 lines.
- Write NO comment lines and NO blank lines in the code — plain instructions only (the explanation field covers the "why").
- Write only the MEANINGFUL arguments for each instruction — do not pad with trailing zeros; the tool pads automatically.
- For jumps, ALWAYS use named labels — NEVER numeric targets. Put "name:" alone on a line to mark a spot, then "jump name <condition> <a> <b>". Example:
  loop:
  sensor amount vault1 @copper
  jump skip lessThan amount 100
  control enabled conveyor1 0 0 0 0
  skip:
  printflush message1
  jump loop always 0 0
- Your own variable names must be plain words (count, target, x2) — NEVER invent @names. The @ prefix is reserved for the built-in constants and content listed in the reference. Writing to any @name is invalid.
- After print you MUST printflush message1; after draw you MUST drawflush display1.
- After radar/uradar/ulocate/ubind, null-check the result before using it (jump ... equal X null).
- When controlling units: ubind a type, check @unit for null, use the flag idiom (sensor f @unit @flag; claim with ucontrol flag N if f==0; skip if f!=N) so processors don't steal each other's units.
- Linked blocks are named shortname+number: cell1, switch1, message1, display1, reactor1, salvo1...
- The program loops forever automatically when it reaches the end.
- radar syntax: radar filter1 filter2 filter3 sort fromBlock order result (filters: any/enemy/ally/player/attacker/flying/boss/ground; sort: distance/health/shield/armor/maxHealth; order: 1 = closest first).
- ulocate ore: ulocate ore core true @item outX outY found building. ulocate building: ulocate building group enemyBool @copper outX outY found building (groups: core/storage/generator/turret/factory/repair/battery/reactor).
- If the request is impossible in mlog (e.g. exact counts of all units on the map), build the closest practical approximation and say so in the explanation.`;

const OUTPUT_SCHEMA = `Respond with ONLY a JSON object, no markdown fences:
{
  "code": "the mlog program, lines separated by \\n, no comments",
  "setupSteps": ["short in-game setup step", ...],
  "explanation": [{"title": "short heading", "body": "1-3 friendly sentences"}, ...]
}
setupSteps: 3-5 steps covering which processor to place, which blocks to link (and their link names), and pasting via Edit -> Import from clipboard.
explanation: 2-5 sections walking a beginner through what each part of the code does.`;

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  error?: { message?: string };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function callGemini(apiKey: string, prompt: string, thinkingBudget: number): Promise<string> {
  let lastError = '';
  // try the primary model hard (it writes much better mlog) before the lite fallback
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) await sleep(attempt * 4000);
    const model = attempt < 3 ? MODELS[0] : MODELS[1];
    const response = await fetch(endpoint(model), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
          // let the model reason before writing — slower, far fewer mistakes
          thinkingConfig: { thinkingBudget },
        },
      }),
    });
    const data = (await response.json()) as GeminiResponse;
    if (response.status === 429 || response.status === 503) {
      lastError = response.status === 429
        ? 'Gemini rate limit reached — wait a minute and try again.'
        : 'Gemini is overloaded right now — try again in a moment.';
      continue; // transient: retry, then fall back to the lighter model
    }
    if (!response.ok) {
      const message = data.error?.message ?? `HTTP ${response.status}`;
      if (response.status === 400 || response.status === 403) throw new Error(`Gemini rejected the API key: ${message}`);
      throw new Error(`Gemini error: ${message}`);
    }
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    if (!text) throw new Error('Gemini returned an empty response — try again.');
    return text;
  }
  throw new Error(lastError);
}

export function parseAIResponse(text: string): Pick<AIResult, 'code' | 'setupSteps' | 'explanation'> {
  // tolerate accidental ```json fences
  const cleaned = text.replace(/^\s*```(?:json)?/m, '').replace(/```\s*$/m, '').trim();
  const parsed = JSON.parse(cleaned) as Partial<AIResult>;
  if (typeof parsed.code !== 'string' || parsed.code.trim() === '') {
    throw new Error('AI response had no code.');
  }
  const code = parsed.code.trim().split('\n').map((line) => line.trim()).filter((line) => line !== '').join('\n');
  return {
    code: trimExtraArgs(resolveLabels(code)),
    setupSteps: Array.isArray(parsed.setupSteps) ? parsed.setupSteps.map(String) : [],
    explanation: Array.isArray(parsed.explanation)
      ? parsed.explanation
          .filter((s): s is { title: string; body: string } => !!s && typeof s === 'object')
          .map((s) => ({ title: String(s.title ?? ''), body: String(s.body ?? '') }))
      : [],
  };
}

const MAX_REPAIR_ROUNDS = 4;
const THINKING_BUDGET = 8192;

type Draft = Pick<AIResult, 'code' | 'setupSteps' | 'explanation'>;

function lintScore(lints: Lint[]): number {
  // errors dominate; warnings break ties
  return lints.filter((l) => l.severity === 'error').length * 100
    + lints.filter((l) => l.severity === 'warning').length;
}

function relevantLints(code: string): Lint[] {
  return validate(code).filter((l) => l.severity !== 'hint');
}

export type ProgressFn = (status: string) => void;

export async function generateWithGemini(
  request: string,
  apiKey: string,
  onProgress: ProgressFn = () => {},
): Promise<AIResult> {
  const base = [
    'You are an expert Mindustry logic (mlog) programmer. Think carefully, then write a complete, correct mlog program for the player request below.',
    'Before writing, reason through: what blocks must be linked, what the main loop does each tick, every jump target, and the edge cases (nothing found, null results, empty storage).',
    '',
    buildReference(),
    '',
    RULES,
    '',
    OUTPUT_SCHEMA,
    '',
    `PLAYER REQUEST: ${request}`,
  ].join('\n');

  onProgress('thinking about your request…');
  let best: Draft = parseAIResponse(await callGemini(apiKey, base, THINKING_BUDGET));
  let bestLints = relevantLints(best.code);
  let rounds = 1;

  // fix-until-clean loop: keep going while problems remain, keep the best draft
  while (lintScore(bestLints) > 0 && rounds <= MAX_REPAIR_ROUNDS) {
    onProgress(`draft ${rounds} had ${bestLints.length} problem${bestLints.length === 1 ? '' : 's'} — rewriting (round ${rounds + 1})…`);
    const repairPrompt = [
      base,
      '',
      'Your previous program had problems found by a strict validator. Think about WHY each one happened, then rewrite the whole program fixed. Same JSON format.',
      'PREVIOUS PROGRAM:',
      best.code,
      'VALIDATOR PROBLEMS:',
      ...bestLints.map((l) => `line ${l.line}: [${l.severity}] ${l.message}`),
    ].join('\n');
    rounds++;
    try {
      const candidate = parseAIResponse(await callGemini(apiKey, repairPrompt, THINKING_BUDGET));
      const candidateLints = relevantLints(candidate.code);
      if (lintScore(candidateLints) <= lintScore(bestLints)) {
        best = candidate;
        bestLints = candidateLints;
      }
    } catch {
      break; // network/parse trouble mid-loop: keep the best draft we have
    }
  }

  // final self-review: validator-clean code can still have logic bugs —
  // ask the model to double-check the BEHAVIOR against the request
  let reviewed = false;
  if (lintScore(bestLints) === 0) {
    onProgress('code is valid — double-checking the logic…');
    const reviewPrompt = [
      'You are reviewing a Mindustry mlog program. Check the LOGIC against the player request: does it actually do what was asked? Check every jump lands on the intended instruction, sensors read the right blocks, thresholds compare the right way, and the loop never gets stuck.',
      'If you find logic bugs, respond with the corrected program. If it is correct, respond with the SAME program unchanged. Same JSON format as before:',
      OUTPUT_SCHEMA,
      '',
      buildReference(),
      '',
      RULES,
      '',
      `PLAYER REQUEST: ${request}`,
      'PROGRAM TO REVIEW:',
      best.code,
    ].join('\n');
    try {
      const reviewedDraft = parseAIResponse(await callGemini(apiKey, reviewPrompt, THINKING_BUDGET));
      const reviewedLints = relevantLints(reviewedDraft.code);
      if (lintScore(reviewedLints) === 0) {
        best = reviewedDraft;
        bestLints = reviewedLints;
      }
      reviewed = true;
    } catch {
      // review is best-effort; the draft is already validator-clean
    }
  }

  return { ...best, lints: bestLints, rounds, reviewed };
}
