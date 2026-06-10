// Splits mlog source into per-line tokens, respecting "quoted strings" and
// `#` comments, and assigning each real instruction its in-game index
// (comments and blank lines are skipped by the game's parser).

export interface Token {
  text: string;
  /** column of the first character, 0-based */
  col: number;
  isString: boolean;
}

export interface TokenLine {
  /** 1-based source line number */
  line: number;
  /** in-game instruction index, or -1 for comment/blank/label lines */
  index: number;
  tokens: Token[];
  /** set when the line is a `name:` label definition */
  label?: string;
}

export function tokenize(source: string): TokenLine[] {
  const result: TokenLine[] = [];
  let instructionIndex = 0;

  const rawLines = source.split(/\r?\n/);
  for (let i = 0; i < rawLines.length; i++) {
    const raw = rawLines[i];
    const trimmed = raw.trim();
    if (trimmed === '' || trimmed.startsWith('#')) {
      result.push({ line: i + 1, index: -1, tokens: [] });
      continue;
    }

    const tokens: Token[] = [];
    let pos = 0;
    while (pos < raw.length) {
      const ch = raw[pos];
      if (ch === ' ' || ch === '\t') {
        pos++;
        continue;
      }
      if (ch === '#') break; // trailing comment
      if (ch === '"') {
        let end = pos + 1;
        while (end < raw.length && raw[end] !== '"') end++;
        tokens.push({ text: raw.slice(pos, Math.min(end + 1, raw.length)), col: pos, isString: true });
        pos = end + 1;
        continue;
      }
      let end = pos;
      while (end < raw.length && raw[end] !== ' ' && raw[end] !== '\t') end++;
      tokens.push({ text: raw.slice(pos, end), col: pos, isString: false });
      pos = end;
    }

    if (tokens.length === 0) {
      result.push({ line: i + 1, index: -1, tokens: [] });
      continue;
    }
    // `name:` label definitions don't count as instructions
    if (tokens.length === 1 && !tokens[0].isString && tokens[0].text.endsWith(':') && tokens[0].text.length > 1) {
      result.push({ line: i + 1, index: -1, tokens, label: tokens[0].text.slice(0, -1) });
      continue;
    }
    result.push({ line: i + 1, index: instructionIndex++, tokens });
  }
  return result;
}

/** Total real instructions in the source. */
export function countInstructions(lines: TokenLine[]): number {
  return lines.filter((l) => l.index >= 0).length;
}
