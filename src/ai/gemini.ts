// Gemini-powered request → mlog generation. The API key is supplied by the
// user (in-app settings, stored in localStorage) or a local .env file —
// never hardcoded, since this repo is public.
//
// Pipeline (compiler-first, per community feedback): the AI writes
// mlogjs-flavored JavaScript — a language it is genuinely good at — and the
// mlogjs compiler emits the actual mlog. Hand-written-assembly mistakes
// (bad jumps, wrong arg shapes, fake keywords like `ally`) become compiler
// errors the AI must fix before anything reaches the player.

import { validate, type Lint } from '../mlog/validator';
import { resolveLabels, trimExtraArgs } from '../mlog/labels';
import { INSTRUCTIONS, OPS, SENSOR_PROPS, BUILTIN_VARS } from '../mlog/spec';
import { compileJS, JS_REFERENCE } from './jslang';

// primary model + fallback when Google reports overload/rate limits
const MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite'] as const;
const endpoint = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

const MAX_COMPILE_ROUNDS = 5;
const MAX_REPAIR_ROUNDS = 4;
const THINKING_BUDGET = 8192;

export interface AIResult {
  code: string;
  /** the high-level source when the compiler pipeline produced the code */
  source?: string;
  setupSteps: string[];
  explanation: { title: string; body: string }[];
  lints: Lint[];
  /** total drafts across the pipeline (1 = clean first try) */
  rounds: number;
  /** whether the final logic self-review pass ran */
  reviewed: boolean;
  engine: 'compiler' | 'raw';
}

export type ProgressFn = (status: string) => void;

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  error?: { message?: string };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function callGemini(apiKey: string, prompt: string, thinkingBudget: number): Promise<string> {
  let lastError = '';
  // try the primary model hard (it writes much better code) before the lite fallback
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

interface Draft {
  source: string;
  setupSteps: string[];
  explanation: { title: string; body: string }[];
}

function parseDraft(text: string, codeField: 'source' | 'code'): Draft {
  const cleaned = text.replace(/^\s*```(?:json)?/m, '').replace(/```\s*$/m, '').trim();
  const parsed = JSON.parse(cleaned) as Record<string, unknown>;
  const code = parsed[codeField] ?? parsed.code ?? parsed.source;
  if (typeof code !== 'string' || code.trim() === '') throw new Error('AI response had no code.');
  return {
    source: code.trim(),
    setupSteps: Array.isArray(parsed.setupSteps) ? parsed.setupSteps.map(String) : [],
    explanation: Array.isArray(parsed.explanation)
      ? (parsed.explanation as unknown[])
          .filter((s): s is { title: string; body: string } => !!s && typeof s === 'object')
          .map((s) => ({ title: String(s.title ?? ''), body: String(s.body ?? '') }))
      : [],
  };
}

function relevantLints(code: string): Lint[] {
  return validate(code).filter((l) => l.severity !== 'hint');
}

function lintScore(lints: Lint[]): number {
  return lints.filter((l) => l.severity === 'error').length * 100
    + lints.filter((l) => l.severity === 'warning').length;
}

const JS_SCHEMA = `Respond with ONLY a JSON object, no markdown fences:
{
  "source": "the mlogjs JavaScript program, lines separated by \\n",
  "setupSteps": ["short in-game setup step", ...],
  "explanation": [{"title": "short heading", "body": "1-3 friendly sentences"}, ...]
}
setupSteps: 3-5 steps covering which processor to place, which blocks to link (with their exact link names like message1, salvo1), and pasting via Edit -> Import from clipboard.
explanation: 2-5 sections walking a beginner through what the program does.`;

const SEMANTIC_CHECKLIST = `SEMANTIC CHECKLIST — re-read the player request and verify:
- enemy vs ally/your-own: radar filters and unitLocate {enemy: true/false} must match EXACTLY what was asked. "my buildings"/"my core" => enemy: false. Attacking/detecting hostiles => "enemy" filter / enemy: true.
- every item, liquid, unit and block type mentioned in the request appears with the exact right symbol (Items.titanium not Items.thorium).
- thresholds compare the right direction (below => <, above => >).
- when approaching a located building, prefer building.x / building.y over the raw locate coordinates.
- units: claim with the flag idiom so other processors' units are never stolen.`;

// ───────────────────────── compiler pipeline ─────────────────────────

export async function generateWithGemini(
  request: string,
  apiKey: string,
  onProgress: ProgressFn = () => {},
): Promise<AIResult> {
  const base = [
    'You are an expert Mindustry logic programmer. Think carefully, then write an mlogjs JavaScript program for the player request below. The mlogjs compiler will turn it into Mindustry processor code.',
    'Before writing, reason through: which blocks must be linked, what the main loop does each tick, and the edge cases (nothing found, undefined results, empty storage).',
    '',
    JS_REFERENCE,
    '',
    SEMANTIC_CHECKLIST,
    '',
    JS_SCHEMA,
    '',
    `PLAYER REQUEST: ${request}`,
  ].join('\n');

  onProgress('thinking about your request…');
  let rounds = 1;
  let draft: Draft;
  try {
    draft = parseDraft(await callGemini(apiKey, base, THINKING_BUDGET), 'source');
  } catch (error) {
    if (error instanceof Error && /rate limit|overloaded|API key/.test(error.message)) throw error;
    throw new Error('The AI response was malformed — try again.');
  }

  // compile loop: feed exact compiler errors back until the JS compiles
  let compiled = compileJS(draft.source);
  while (compiled.error && rounds <= MAX_COMPILE_ROUNDS) {
    onProgress(`compiler rejected draft ${rounds} — fixing (round ${rounds + 1})…`);
    const fixPrompt = [
      base,
      '',
      'Your previous program did NOT compile. Fix the error and respond with the complete corrected program in the same JSON format.',
      'PREVIOUS PROGRAM:',
      draft.source,
      `COMPILER ERROR: ${compiled.error}`,
    ].join('\n');
    rounds++;
    try {
      const candidate = parseDraft(await callGemini(apiKey, fixPrompt, THINKING_BUDGET), 'source');
      const candidateCompiled = compileJS(candidate.source);
      draft = candidate;
      compiled = candidateCompiled;
    } catch {
      break;
    }
  }

  // compiler path failed entirely → fall back to direct mlog generation
  if (compiled.error || !compiled.mlog) {
    onProgress('compiler path stuck — switching to direct generation…');
    return generateRawMlog(request, apiKey, onProgress, rounds);
  }

  // sanity-check the compiled output with our validator (belt and braces)
  let lints = relevantLints(compiled.mlog);

  // logic self-review on the SOURCE (much easier for the model to audit)
  let reviewed = false;
  onProgress('code compiles — double-checking the logic…');
  const reviewPrompt = [
    'You are reviewing an mlogjs JavaScript program. Check the LOGIC against the player request: does it actually do what was asked?',
    SEMANTIC_CHECKLIST,
    'If you find logic bugs, respond with the corrected program. If it is correct, respond with the SAME program unchanged. Same JSON format:',
    JS_SCHEMA,
    '',
    JS_REFERENCE,
    '',
    `PLAYER REQUEST: ${request}`,
    'PROGRAM TO REVIEW:',
    draft.source,
  ].join('\n');
  try {
    const reviewedDraft = parseDraft(await callGemini(apiKey, reviewPrompt, THINKING_BUDGET), 'source');
    const reviewedCompiled = compileJS(reviewedDraft.source);
    if (!reviewedCompiled.error && reviewedCompiled.mlog) {
      draft = reviewedDraft;
      compiled = reviewedCompiled;
      lints = relevantLints(reviewedCompiled.mlog);
    }
    reviewed = true;
  } catch {
    // review is best-effort
  }

  return {
    code: compiled.mlog!,
    source: draft.source,
    setupSteps: draft.setupSteps,
    explanation: draft.explanation,
    lints,
    rounds,
    reviewed,
    engine: 'compiler',
  };
}

// ─────────────────── legacy direct-mlog fallback path ───────────────────

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
- For jumps, ALWAYS use named labels — NEVER numeric targets. Put "name:" alone on a line to mark a spot, then "jump name <condition> <a> <b>".
- Your own variable names must be plain words (count, target, x2) — NEVER invent @names. The @ prefix is reserved for the built-in constants and content listed in the reference. Writing to any @name is invalid.
- After print you MUST printflush message1; after draw you MUST drawflush display1.
- After radar/uradar/ulocate/ubind, null-check the result before using it.
- When controlling units: use the flag idiom so processors don't steal each other's units.
- ulocate's enemy argument is true or false — words like "ally" are NOT valid.
- ucontrol itemDrop takes a BUILDING (or @air) and an amount — never an item type.
- The program loops forever automatically when it reaches the end.`;

const MLOG_SCHEMA = `Respond with ONLY a JSON object, no markdown fences:
{
  "code": "the mlog program, lines separated by \\n, no comments",
  "setupSteps": ["short in-game setup step", ...],
  "explanation": [{"title": "short heading", "body": "1-3 friendly sentences"}, ...]
}`;

async function generateRawMlog(
  request: string,
  apiKey: string,
  onProgress: ProgressFn,
  startRounds: number,
): Promise<AIResult> {
  const base = [
    'You are an expert Mindustry logic (mlog) programmer. Think carefully, then write a complete, correct mlog program for the player request below.',
    '',
    buildReference(),
    '',
    RULES,
    '',
    SEMANTIC_CHECKLIST,
    '',
    MLOG_SCHEMA,
    '',
    `PLAYER REQUEST: ${request}`,
  ].join('\n');

  const normalize = (code: string) =>
    trimExtraArgs(resolveLabels(code.split('\n').map((l) => l.trim()).filter((l) => l !== '').join('\n')));

  let rounds = startRounds;
  const first = parseDraft(await callGemini(apiKey, base, THINKING_BUDGET), 'code');
  let best = { ...first, source: normalize(first.source) };
  let bestLints = relevantLints(best.source);

  while (lintScore(bestLints) > 0 && rounds <= startRounds + MAX_REPAIR_ROUNDS) {
    onProgress(`draft had ${bestLints.length} problem${bestLints.length === 1 ? '' : 's'} — rewriting…`);
    const repairPrompt = [
      base, '',
      'Your previous program had problems found by a strict validator. Think about WHY each one happened, then rewrite the whole program fixed. Same JSON format.',
      'PREVIOUS PROGRAM:', best.source,
      'VALIDATOR PROBLEMS:',
      ...bestLints.map((l) => `line ${l.line}: [${l.severity}] ${l.message}`),
    ].join('\n');
    rounds++;
    try {
      const raw = parseDraft(await callGemini(apiKey, repairPrompt, THINKING_BUDGET), 'code');
      const candidate = { ...raw, source: normalize(raw.source) };
      const candidateLints = relevantLints(candidate.source);
      if (lintScore(candidateLints) <= lintScore(bestLints)) {
        best = candidate;
        bestLints = candidateLints;
      }
    } catch {
      break;
    }
  }

  return {
    code: best.source,
    setupSteps: best.setupSteps,
    explanation: best.explanation,
    lints: bestLints,
    rounds,
    reviewed: false,
    engine: 'raw',
  };
}
