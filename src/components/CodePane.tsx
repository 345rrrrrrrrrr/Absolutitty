import { useMemo, useState } from 'react';
import { INSTRUCTION_MAP, MAX_INSTRUCTIONS } from '../mlog/spec';

function classifyToken(text: string, isFirst: boolean, prevWasInstr: boolean): string {
  if (text.startsWith('"')) return 'tok-string';
  if (isFirst && INSTRUCTION_MAP.has(text)) return 'tok-instr';
  if (prevWasInstr) return 'tok-sub';
  if (text.startsWith('@')) return 'tok-builtin';
  if (/^-?(\d+\.?\d*|\.\d+)$/.test(text) || text === 'true' || text === 'false' || text === 'null') return 'tok-number';
  return 'tok-var';
}

function HighlightedLine({ line }: { line: string }) {
  if (line.trim().startsWith('#')) return <span className="tok-comment">{line}</span>;
  const parts = line.split(/(\s+|"[^"]*"?)/).filter((p) => p !== '');
  let seenFirst = false;
  let prevWasInstr = false;
  return (
    <>
      {parts.map((part, i) => {
        if (/^\s+$/.test(part)) return <span key={i}>{part}</span>;
        const cls = classifyToken(part, !seenFirst, prevWasInstr);
        prevWasInstr = !seenFirst && cls === 'tok-instr' && INSTRUCTION_MAP.get(part)?.variants !== undefined;
        seenFirst = true;
        return <span key={i} className={cls}>{part}</span>;
      })}
    </>
  );
}

export interface CodePaneProps {
  code: string;
  codeWithoutComments?: string;
  instructions?: number;
  title?: string;
}

export default function CodePane({ code, codeWithoutComments, instructions, title = 'generated mlog' }: CodePaneProps) {
  const [toast, setToast] = useState<string | null>(null);
  const lines = useMemo(() => code.split('\n'), [code]);

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setToast(`${label} — now open a processor in-game: Edit → Import from clipboard`);
    } catch {
      setToast('Copy failed — select the code and copy manually.');
    }
    window.setTimeout(() => setToast(null), 3500);
  };

  const overBudget = instructions !== undefined && instructions > MAX_INSTRUCTIONS;

  return (
    <div className="codepane">
      <div className="bar">
        <span className="title">{title}</span>
        {instructions !== undefined && (
          <span className={`badge${overBudget ? ' danger' : ''}`}>
            {instructions} / {MAX_INSTRUCTIONS} instructions
          </span>
        )}
        <span className="spacer" />
        {codeWithoutComments !== undefined && (
          <button className="btn secondary small" onClick={() => copy(codeWithoutComments, 'Copied without comments')}>
            copy w/o comments
          </button>
        )}
        <button className="btn small" onClick={() => copy(code, 'Copied!')}>copy code</button>
      </div>
      <pre>
        {lines.map((line, i) => (
          <div className="codeline" key={i}>
            <span className="ln">{i + 1}</span>
            <span><HighlightedLine line={line} /></span>
          </div>
        ))}
      </pre>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
