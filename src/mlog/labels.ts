// Resolve `name:` labels in raw mlog text to numeric jump targets, and strip
// the label lines. Used for AI-generated code so the model never has to do
// index arithmetic (the #1 source of broken jumps).

import { tokenize } from './tokenizer';
import { INSTRUCTION_MAP } from './spec';

/** Trim surplus trailing args beyond the game's padded count (harmless in-game
 *  but noisy) — AI models love adding one zero too many. */
export function trimExtraArgs(source: string): string {
  return source.split(/\r?\n/).map((line) => {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) return line;
    const tokens = trimmed.split(/\s+/);
    const spec = INSTRUCTION_MAP.get(tokens[0]);
    if (!spec || trimmed.includes('"')) return line; // don't touch strings
    const maxTokens = 1 + spec.paddedCount;
    if (tokens.length <= maxTokens) return line;
    // only drop pure-zero fillers, never meaningful values
    while (tokens.length > maxTokens && tokens[tokens.length - 1] === '0') tokens.pop();
    return tokens.join(' ');
  }).join('\n');
}

export function resolveLabels(source: string): string {
  const lines = tokenize(source);
  const labels = new Map<string, number>();

  // a label marks the index of the NEXT real instruction
  let nextIndex = 0;
  for (const line of lines) {
    if (line.label) labels.set(line.label, nextIndex);
    else if (line.index >= 0) nextIndex++;
  }
  if (labels.size === 0) return source;
  const total = nextIndex;

  const sourceLines = source.split(/\r?\n/);
  const output: string[] = [];
  for (const line of lines) {
    if (line.label) continue; // drop label definition lines
    let text = sourceLines[line.line - 1];
    if (line.index >= 0 && line.tokens[0].text === 'jump') {
      const target = line.tokens[1]?.text;
      if (target !== undefined && labels.has(target)) {
        // a label at the very end wraps to 0 (the program loops anyway)
        const index = labels.get(target)!;
        const resolved = index >= total ? 0 : index;
        const col = line.tokens[1].col;
        text = text.slice(0, col) + String(resolved) + text.slice(col + target.length);
      }
    }
    output.push(text);
  }
  return output.join('\n');
}
