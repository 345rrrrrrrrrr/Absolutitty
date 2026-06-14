// Lint rules for raw mlog text. Friendly messages — the audience is players,
// not programmers.

import { tokenize, countInstructions, type TokenLine, type Token } from './tokenizer';
import {
  INSTRUCTION_MAP, getVariant, MAX_INSTRUCTIONS, SENSOR_PROP_NAMES,
  BUILTIN_VAR_NAMES, isKnownContent, UNITS, ITEMS, LIQUIDS,
  type InstructionSpec, type ArgSpec,
} from './spec';

export type Severity = 'error' | 'warning' | 'hint';

export interface Lint {
  line: number; // 1-based source line
  severity: Severity;
  rule: string;
  message: string;
}

type Rule = (lines: TokenLine[]) => Lint[];

function isNumeric(text: string): boolean {
  return /^-?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(text) || /^0x[0-9a-fA-F]+$/.test(text) || /^%[0-9a-fA-F]{6,8}$/.test(text);
}

function isLiteral(token: Token): boolean {
  return token.isString || isNumeric(token.text) || token.text === 'true' || token.text === 'false' || token.text === 'null';
}

function argSpecsFor(spec: InstructionSpec, tokens: Token[]): { args: ArgSpec[]; subOffset: number } | { unknownSub: string } | null {
  if (spec.variants) {
    const sub = tokens[1]?.text;
    if (sub === undefined) return { args: [], subOffset: 1 };
    const variant = getVariant(spec, sub);
    if (!variant) return { unknownSub: sub };
    return { args: variant.args, subOffset: 2 };
  }
  return spec.args ? { args: spec.args, subOffset: 1 } : null;
}

const ruleInstructions: Rule = (lines) => {
  const lints: Lint[] = [];
  for (const l of lines) {
    if (l.index < 0) continue;
    const name = l.tokens[0].text;
    const spec = INSTRUCTION_MAP.get(name);
    if (!spec) {
      lints.push({
        line: l.line, severity: 'error', rule: 'unknown-instruction',
        message: `"${name}" is not an mlog instruction. Check the Reference page for the full list.`,
      });
      continue;
    }
    const resolved = argSpecsFor(spec, l.tokens);
    if (resolved && 'unknownSub' in resolved) {
      lints.push({
        line: l.line, severity: 'error', rule: 'unknown-subcommand',
        message: `"${resolved.unknownSub}" is not a valid ${name} mode. Valid: ${spec.variants!.map((v) => v.sub).join(', ')}.`,
      });
      continue;
    }
    if (resolved) {
      const { args, subOffset } = resolved;
      let given = l.tokens.length - subOffset;
      let required = args;
      // `jump N always` is valid without the a/b filler args
      if (name === 'jump' && l.tokens[2]?.text === 'always') required = args.slice(0, 2);
      if (given < required.length) {
        const missing = required.slice(given).map((a) => a.name).join(', ');
        lints.push({
          line: l.line, severity: 'error', rule: 'arg-count',
          message: `${name} is missing arguments: ${missing}.`,
        });
        continue;
      }
      if (given > spec.paddedCount - (subOffset - 1)) {
        lints.push({
          line: l.line, severity: 'warning', rule: 'arg-count',
          message: `${name} has more arguments than the game expects — extras are ignored.`,
        });
      }
      // enum + output checks
      for (let i = 0; i < args.length; i++) {
        const argSpec = args[i];
        const token = l.tokens[subOffset + i];
        if (!token) break;
        if (argSpec.kind === 'enum' && argSpec.enum && !argSpec.enum.includes(token.text)) {
          lints.push({
            line: l.line, severity: 'warning', rule: 'enum-value',
            message: `"${token.text}" is not a valid ${argSpec.name} — expected one of: ${argSpec.enum.join(', ')}.`,
          });
        }
        if (argSpec.kind === 'output' && isLiteral(token)) {
          lints.push({
            line: l.line, severity: 'error', rule: 'output-literal',
            message: `${name}'s "${argSpec.name}" must be a variable name to store the result in — not the value ${token.text}.`,
          });
        }
        if (argSpec.kind === 'output' && token.text.startsWith('@')) {
          lints.push({
            line: l.line, severity: 'error', rule: 'output-builtin',
            message: `${name}'s "${argSpec.name}" stores a result — it can't write into the built-in name ${token.text}. Use a plain variable like ${token.text.slice(1)}.`,
          });
        }
      }
    }
  }
  return lints;
};

const ruleJumpTargets: Rule = (lines) => {
  const lints: Lint[] = [];
  const total = countInstructions(lines);
  const labels = new Set(lines.filter((l) => l.label).map((l) => l.label!));
  for (const l of lines) {
    if (l.index < 0 || l.tokens[0].text !== 'jump') continue;
    const target = l.tokens[1]?.text;
    if (target === undefined) continue; // arg-count rule covers it
    if (isNumeric(target)) {
      const targetIdx = Number(target);
      if (!Number.isInteger(targetIdx) || targetIdx < 0 || targetIdx >= Math.max(total, 1)) {
        lints.push({
          line: l.line, severity: 'error', rule: 'jump-target',
          message: `jump goes to line ${target}, but the program only has ${total} instructions (0–${total - 1}). Remember: comment lines don't count.`,
        });
      }
    } else if (!labels.has(target)) {
      lints.push({
        line: l.line, severity: 'error', rule: 'jump-target',
        message: `jump goes to label "${target}", but no "${target}:" line exists.`,
      });
    }
  }
  return lints;
};

const ruleFlushes: Rule = (lines) => {
  const lints: Lint[] = [];
  const has = (name: string) => lines.some((l) => l.index >= 0 && l.tokens[0].text === name);
  const firstLine = (names: string[]) =>
    lines.find((l) => l.index >= 0 && names.includes(l.tokens[0].text))?.line ?? 1;
  const usesDrawPrint = lines.some((l) => l.index >= 0 && l.tokens[0].text === 'draw' && l.tokens[1]?.text === 'print');
  if ((has('print') || has('printchar') || has('format')) && !has('printflush') && !usesDrawPrint) {
    lints.push({
      line: firstLine(['print', 'printchar', 'format']), severity: 'warning', rule: 'missing-printflush',
      message: 'This program prints text but never calls printflush — nothing will appear. Add `printflush message1` (and link a message block).',
    });
  }
  if (has('draw') && !has('drawflush')) {
    lints.push({
      line: firstLine(['draw']), severity: 'warning', rule: 'missing-drawflush',
      message: 'This program draws but never calls drawflush — nothing will appear. Add `drawflush display1` (and link a display).',
    });
  }
  return lints;
};

const ruleLength: Rule = (lines) => {
  const total = countInstructions(lines);
  if (total > MAX_INSTRUCTIONS) {
    return [{
      line: 1, severity: 'error', rule: 'too-long',
      message: `${total} instructions — processors only run the first ${MAX_INSTRUCTIONS}.`,
    }];
  }
  return [];
};

const ruleSensorProps: Rule = (lines) => {
  const lints: Lint[] = [];
  for (const l of lines) {
    if (l.index < 0 || l.tokens[0].text !== 'sensor') continue;
    const prop = l.tokens[3]?.text;
    if (!prop || !prop.startsWith('@')) continue;
    const name = prop.slice(1);
    if (!SENSOR_PROP_NAMES.has(name) && !isKnownContent(name) && !BUILTIN_VAR_NAMES.has(name)) {
      lints.push({
        line: l.line, severity: 'hint', rule: 'unknown-sensor-prop',
        message: `"${prop}" is not a known sensor property or content name — double-check the spelling.`,
      });
    }
  }
  return lints;
};

/** radar/uradar/ulocate results should be null-checked before use. */
const ruleNullChecks: Rule = (lines) => {
  const lints: Lint[] = [];
  const real = lines.filter((l) => l.index >= 0);
  for (let i = 0; i < real.length; i++) {
    const l = real[i];
    const name = l.tokens[0].text;
    let resultVar: string | undefined;
    if (name === 'radar' || name === 'uradar') resultVar = l.tokens[7]?.text;
    else if (name === 'ulocate') resultVar = l.tokens[7]?.text; // `found` output
    else continue;
    if (!resultVar || resultVar === '0') continue;
    const lookahead = real.slice(i + 1, i + 7);
    const checked = lookahead.some((next) => {
      const t = next.tokens.map((x) => x.text);
      if (t[0] === 'jump' && t.includes(resultVar!)) return true;
      if (t[0] === 'op' && ['equal', 'notEqual', 'land'].includes(t[1]) && t.includes(resultVar!)) return true;
      if (t[0] === 'sensor' && t[2] === resultVar) return false; // using before checking
      return false;
    });
    const usedAtAll = real.slice(i + 1).some((next) => next.tokens.some((t) => t.text === resultVar));
    if (usedAtAll && !checked) {
      lints.push({
        line: l.line, severity: 'hint', rule: 'missing-null-check',
        message: `${name} may find nothing — consider \`jump <somewhere> equal ${resultVar} null\` before using ${resultVar}.`,
      });
    }
  }
  return lints;
};

/** mistakes the community caught in AI-written code */
const ruleSemanticArgs: Rule = (lines) => {
  const lints: Lint[] = [];
  const itemLiquidNames = new Set([...ITEMS.map((i) => i.name), ...LIQUIDS.map((l) => l.name)]);
  for (const l of lines) {
    if (l.index < 0) continue;
    const name = l.tokens[0].text;
    // ulocate building's enemy slot takes true/false — "ally"/"enemy" are not keywords
    if (name === 'ulocate' && l.tokens[1]?.text === 'building') {
      const enemyArg = l.tokens[3]?.text;
      if (enemyArg === 'ally' || enemyArg === 'enemy') {
        lints.push({
          line: l.line, severity: 'error', rule: 'ulocate-enemy-arg',
          message: `ulocate's third argument is true (enemy buildings) or false (your own) — "${enemyArg}" is not a keyword and reads as an empty variable.`,
        });
      }
    }
    // ucontrol itemDrop takes a building (or @air), never an item type
    if (name === 'ucontrol' && l.tokens[1]?.text === 'itemDrop') {
      const to = l.tokens[2]?.text;
      if (to && to.startsWith('@') && to !== '@air' && itemLiquidNames.has(to.slice(1))) {
        lints.push({
          line: l.line, severity: 'error', rule: 'itemdrop-target',
          message: `itemDrop's first argument is the BUILDING to drop into (or @air to dump) — not the item ${to}. Units drop whatever they carry.`,
        });
      }
    }
  }
  return lints;
};

/** content names used bare where a @constant was clearly meant: `ubind poly` */
const ruleMissingAt: Rule = (lines) => {
  const lints: Lint[] = [];
  const contentNames = new Set([
    ...UNITS.map((u) => u.name),
    ...ITEMS.map((i) => i.name),
    ...LIQUIDS.map((l) => l.name),
  ]);
  for (const l of lines) {
    if (l.index < 0) continue;
    const name = l.tokens[0].text;
    // positions that take content constants: ubind type; sensor property;
    // control config value; ucontrol itemTake item
    const checks: (Token | undefined)[] = [];
    if (name === 'ubind') checks.push(l.tokens[1]);
    if (name === 'sensor') checks.push(l.tokens[3]);
    if (name === 'control' && l.tokens[1]?.text === 'config') checks.push(l.tokens[3]);
    if (name === 'ucontrol' && l.tokens[1]?.text === 'itemTake') checks.push(l.tokens[3]);
    for (const token of checks) {
      if (token && !token.isString && contentNames.has(token.text)) {
        lints.push({
          line: l.line, severity: 'warning', rule: 'missing-at',
          message: `"${token.text}" here is read as a variable (probably empty) — you most likely meant the game content @${token.text}.`,
        });
      }
    }
  }
  return lints;
};

const RULES: Rule[] = [
  ruleSemanticArgs,
  ruleMissingAt,
  ruleInstructions,
  ruleJumpTargets,
  ruleFlushes,
  ruleLength,
  ruleSensorProps,
  ruleNullChecks,
];

export function validate(source: string): Lint[] {
  const lines = tokenize(source);
  const lints = RULES.flatMap((rule) => rule(lines));
  return lints.sort((a, b) => a.line - b.line);
}
