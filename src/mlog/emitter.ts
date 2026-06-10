// IR → mlog text.
//
// Jump targets are emitted as numeric instruction indices for maximum paste
// compatibility. The game strips `#` comment lines before assigning indices,
// so labels resolve to the count of preceding REAL instructions only — the
// numbers stay correct whether or not the user copies the comments.

import type { Arg, IRNode, IRProgram } from './ir';
import { INSTRUCTION_MAP } from './spec';

export interface EmitOptions {
  comments?: boolean; // default true
}

export function formatArg(arg: Arg): string {
  switch (arg.t) {
    case 'var':
      return arg.name;
    case 'num': {
      const value = arg.value;
      if (Number.isInteger(value)) return String(value);
      return String(Math.round(value * 1e6) / 1e6);
    }
    case 'str':
      // mlog strings have no escape for quotes — replace any with apostrophes
      return `"${arg.value.replace(/"/g, "'")}"`;
    case 'builtin':
      return `@${arg.name}`;
    case 'enum':
      return arg.value;
  }
}

function isRealInstruction(node: IRNode): boolean {
  return node.kind === 'instr' || node.kind === 'jump' || node.kind === 'raw';
}

/** Pad instruction args with zeros to match the game's export format. */
function padArgs(op: string, tokens: string[]): string[] {
  const spec = INSTRUCTION_MAP.get(op);
  if (!spec) return tokens;
  while (tokens.length < spec.paddedCount) tokens.push('0');
  return tokens;
}

export function emit(program: IRProgram, opts: EmitOptions = {}): string {
  const withComments = opts.comments !== false;

  // Pass 1: resolve label → instruction index.
  const labels = new Map<string, number>();
  let index = 0;
  for (const node of program.nodes) {
    if (node.kind === 'label') {
      if (labels.has(node.name)) throw new Error(`duplicate label: ${node.name}`);
      labels.set(node.name, index);
    } else if (isRealInstruction(node)) {
      index++;
    }
  }
  const totalInstructions = index;

  // A label may point past the last instruction (e.g. an if-block at the very
  // end). Jumping to an out-of-range index is invalid in-game, so emit a
  // trailing `end` for those labels to land on.
  const needsTrailingEnd = [...labels.values()].some((i) => i >= totalInstructions)
    && totalInstructions > 0;

  // Pass 2: emit lines.
  const lines: string[] = [];
  for (const node of program.nodes) {
    switch (node.kind) {
      case 'label':
        break;
      case 'comment':
        if (withComments) lines.push(`# ${node.text}`);
        break;
      case 'raw':
        lines.push(node.line);
        break;
      case 'instr':
        lines.push([node.op, ...padArgs(node.op, node.args.map(formatArg))].join(' '));
        break;
      case 'jump': {
        const target = labels.get(node.target);
        if (target === undefined) throw new Error(`unknown label: ${node.target}`);
        const a = node.a ? formatArg(node.a) : '0';
        const b = node.b ? formatArg(node.b) : '0';
        lines.push(`jump ${target} ${node.cond} ${a} ${b}`);
        break;
      }
    }
  }
  if (needsTrailingEnd) lines.push('end');

  return lines.join('\n');
}

/** Number of real instructions the program will occupy in-game. */
export function instructionCount(program: IRProgram): number {
  let count = 0;
  for (const node of program.nodes) if (isRealInstruction(node)) count++;
  const labels = new Map<string, number>();
  let i = 0;
  for (const node of program.nodes) {
    if (node.kind === 'label') labels.set(node.name, i);
    else if (isRealInstruction(node)) i++;
  }
  if ([...labels.values()].some((x) => x >= count) && count > 0) count++;
  return count;
}
