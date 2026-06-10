// Tiny approximate mlog interpreter — just enough to preview `draw` programs.
// Unknown instructions are no-ops (reads produce 0/null) so full programs
// containing sensor/control/etc. still render something sensible.

import { tokenize, type TokenLine } from './tokenizer';
import { DRAW_BUFFER_LIMIT } from './spec';

export type DrawCall =
  | { op: 'clear'; r: number; g: number; b: number }
  | { op: 'color'; r: number; g: number; b: number; a: number }
  | { op: 'stroke'; width: number }
  | { op: 'line'; x: number; y: number; x2: number; y2: number }
  | { op: 'rect'; x: number; y: number; w: number; h: number }
  | { op: 'lineRect'; x: number; y: number; w: number; h: number }
  | { op: 'poly'; x: number; y: number; sides: number; radius: number; rotation: number }
  | { op: 'linePoly'; x: number; y: number; sides: number; radius: number; rotation: number }
  | { op: 'triangle'; x1: number; y1: number; x2: number; y2: number; x3: number; y3: number }
  | { op: 'image'; x: number; y: number; image: string; size: number; rotation: number }
  | { op: 'print'; x: number; y: number; align: string; text: string };

export interface VMResult {
  frames: DrawCall[][]; // one frame per drawflush
  printOutput: string; // last printflush content (or leftover buffer)
  steps: number;
  halted: 'end' | 'stop' | 'budget' | 'wrapped';
}

type Value = number | string | null;

const DEG = Math.PI / 180;

function num(v: Value): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (v === null) return 0;
  const parsed = Number(v);
  return Number.isFinite(parsed) ? parsed : 1; // non-null objects are truthy (1)
}

// deterministic hash noise stand-in
function fakeNoise(a: number, b: number): number {
  const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
}

function applyOp(op: string, a: Value, b: Value): Value {
  const x = num(a);
  const y = num(b);
  switch (op) {
    case 'add': return x + y;
    case 'sub': return x - y;
    case 'mul': return x * y;
    case 'div': return y === 0 ? null : x / y;
    case 'idiv': return y === 0 ? null : Math.floor(x / y);
    case 'mod': return y === 0 ? null : x % y;
    case 'emod': return y === 0 ? null : ((x % y) + y) % y;
    case 'pow': return Math.pow(x, y);
    case 'equal': return (a === null ? 0 : x) === (b === null ? 0 : y) || a === b ? 1 : 0;
    case 'notEqual': return a === b || x === y ? 0 : 1;
    case 'land': return x !== 0 && y !== 0 ? 1 : 0;
    case 'lessThan': return x < y ? 1 : 0;
    case 'lessThanEq': return x <= y ? 1 : 0;
    case 'greaterThan': return x > y ? 1 : 0;
    case 'greaterThanEq': return x >= y ? 1 : 0;
    case 'strictEqual': return a === b ? 1 : 0;
    case 'shl': return x << y;
    case 'shr': return x >> y;
    case 'ushr': return x >>> y;
    case 'or': return x | y;
    case 'and': return x & y;
    case 'xor': return x ^ y;
    case 'not': return ~x;
    case 'max': return Math.max(x, y);
    case 'min': return Math.min(x, y);
    case 'angle': return ((Math.atan2(y, x) / DEG) + 360) % 360;
    case 'angleDiff': { const d = Math.abs(x - y) % 360; return d > 180 ? 360 - d : d; }
    case 'len': return Math.hypot(x, y);
    case 'noise': return fakeNoise(x, y);
    case 'abs': return Math.abs(x);
    case 'sign': return Math.sign(x);
    case 'log': return Math.log(x);
    case 'logn': return Math.log(x) / Math.log(y);
    case 'log10': return Math.log10(x);
    case 'floor': return Math.floor(x);
    case 'ceil': return Math.ceil(x);
    case 'round': return Math.round(x);
    case 'sqrt': return Math.sqrt(x);
    case 'rand': return Math.random() * x;
    case 'sin': return Math.sin(x * DEG);
    case 'cos': return Math.cos(x * DEG);
    case 'tan': return Math.tan(x * DEG);
    case 'asin': return Math.asin(x) / DEG;
    case 'acos': return Math.acos(x) / DEG;
    case 'atan': return Math.atan(x) / DEG;
    default: return 0;
  }
}

export interface VMOptions {
  maxSteps?: number;
  maxFrames?: number;
  /** starting value for @tick/@time-style vars, lets the animate mode advance time */
  timeOffsetMs?: number;
}

export function runForDisplay(source: string, opts: VMOptions = {}): VMResult {
  const maxSteps = opts.maxSteps ?? 20_000;
  const maxFrames = opts.maxFrames ?? 60;
  const t0 = opts.timeOffsetMs ?? 0;

  const lines = tokenize(source).filter((l) => l.index >= 0 || l.label);
  const instrs: TokenLine[] = lines.filter((l) => l.index >= 0);
  const labels = new Map<string, number>();
  {
    let nextIndex = 0;
    for (const l of lines) {
      if (l.label) labels.set(l.label, nextIndex);
      else nextIndex++;
    }
  }

  const vars = new Map<string, Value>();
  const builtinValue = (name: string): Value => {
    switch (name) {
      case '@time': return t0 + 1_700_000_000_000;
      case '@tick': return (t0 / 1000) * 60;
      case '@second': return t0 / 1000;
      case '@minute': return t0 / 60000;
      default: return null;
    }
  };
  const get = (text: string | undefined): Value => {
    if (text === undefined) return null;
    if (text.startsWith('"')) return text.slice(1, -1);
    if (text === 'true') return 1;
    if (text === 'false' || text === 'null') return text === 'false' ? 0 : null;
    if (/^-?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(text)) return Number(text);
    if (text.startsWith('@')) return vars.has(text) ? vars.get(text)! : builtinValue(text);
    return vars.get(text) ?? null;
  };
  const set = (name: string | undefined, value: Value) => {
    if (name) vars.set(name, value);
  };

  const frames: DrawCall[][] = [];
  let buffer: DrawCall[] = [];
  let printBuffer = '';
  let printOutput = '';
  let pc = 0;
  let steps = 0;
  let halted: VMResult['halted'] = 'wrapped';
  let wrapped = false;

  while (steps < maxSteps && frames.length < maxFrames) {
    if (pc >= instrs.length) {
      if (wrapped && frames.length > 0) break; // looped once with output — enough for preview
      wrapped = true;
      pc = 0;
      if (instrs.length === 0) break;
    }
    const t = instrs[pc].tokens.map((x) => x.text);
    const strTokens = instrs[pc].tokens;
    pc++;
    steps++;

    switch (t[0]) {
      case 'set': set(t[1], get(t[2])); break;
      case 'op': set(t[2], applyOp(t[1], get(t[3]), get(t[4]))); break;
      case 'jump': {
        const cond = t[2] ?? 'always';
        const a = get(t[3]);
        const b = get(t[4]);
        const taken = cond === 'always' ? true : num(applyOp(cond, a, b)) !== 0;
        if (taken) {
          const target = /^\d+$/.test(t[1]) ? Number(t[1]) : labels.get(t[1]) ?? -1;
          if (target >= 0 && target < instrs.length) pc = target;
        }
        break;
      }
      case 'end':
        if (frames.length > 0 || printOutput) { halted = 'end'; steps = maxSteps; }
        pc = 0;
        wrapped = true;
        break;
      case 'stop': halted = 'stop'; steps = maxSteps; break;
      case 'wait': break; // no-op for preview
      case 'print': {
        const v = strTokens[1]?.isString ? strTokens[1].text.slice(1, -1) : get(t[1]);
        printBuffer += v === null ? 'null' : typeof v === 'number' ? formatNumber(v) : String(v);
        break;
      }
      case 'printchar': {
        const v = get(t[1]);
        if (typeof v === 'number') printBuffer += String.fromCodePoint(Math.max(32, Math.floor(v)));
        break;
      }
      case 'format': {
        const v = get(t[1]);
        const m = printBuffer.match(/\{(\d)\}/);
        if (m) printBuffer = printBuffer.replace(m[0], v === null ? 'null' : String(typeof v === 'number' ? formatNumber(v) : v));
        break;
      }
      case 'printflush':
        printOutput = printBuffer;
        printBuffer = '';
        break;
      case 'draw': {
        if (buffer.length >= DRAW_BUFFER_LIMIT) break;
        const call = decodeDraw(t, get, printBuffer);
        if (call) {
          buffer.push(call);
          if (call.op === 'print') printBuffer = '';
        }
        break;
      }
      case 'drawflush':
        frames.push(buffer);
        buffer = [];
        break;
      default:
        // unknown/unsupported (sensor, control, ubind...): outputs become null
        approximateUnknown(t, set);
        break;
    }
  }

  if (frames.length === 0 && buffer.length > 0) frames.push(buffer);
  if (steps >= maxSteps && halted === 'wrapped') halted = 'budget';
  return { frames, printOutput: printOutput || printBuffer, steps, halted };
}

function formatNumber(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return String(Math.round(value * 100) / 100);
}

function decodeDraw(t: string[], get: (s: string | undefined) => Value, printBuffer: string): DrawCall | null {
  const f = (i: number) => num(get(t[i]));
  switch (t[1]) {
    case 'clear': return { op: 'clear', r: f(2), g: f(3), b: f(4) };
    case 'color': return { op: 'color', r: f(2), g: f(3), b: f(4), a: t[5] !== undefined ? f(5) : 255 };
    case 'col': {
      // packed color: double whose bits encode rgba8888
      const packed = f(2);
      const buf = new DataView(new ArrayBuffer(8));
      buf.setFloat64(0, packed);
      const int = Number((buf.getBigUint64(0) & 0xffffffffn));
      return { op: 'color', r: (int >>> 24) & 0xff, g: (int >>> 16) & 0xff, b: (int >>> 8) & 0xff, a: int & 0xff };
    }
    case 'stroke': return { op: 'stroke', width: f(2) };
    case 'line': return { op: 'line', x: f(2), y: f(3), x2: f(4), y2: f(5) };
    case 'rect': return { op: 'rect', x: f(2), y: f(3), w: f(4), h: f(5) };
    case 'lineRect': return { op: 'lineRect', x: f(2), y: f(3), w: f(4), h: f(5) };
    case 'poly': return { op: 'poly', x: f(2), y: f(3), sides: f(4), radius: f(5), rotation: f(6) };
    case 'linePoly': return { op: 'linePoly', x: f(2), y: f(3), sides: f(4), radius: f(5), rotation: f(6) };
    case 'triangle': return { op: 'triangle', x1: f(2), y1: f(3), x2: f(4), y2: f(5), x3: f(6), y3: f(7) };
    case 'image': return { op: 'image', x: f(2), y: f(3), image: t[4] ?? '@copper', size: f(5), rotation: f(6) };
    case 'print': return { op: 'print', x: f(2), y: f(3), align: t[4] ?? 'bottomLeft', text: printBuffer };
    default: return null;
  }
}

function approximateUnknown(t: string[], set: (name: string | undefined, v: Value) => void): void {
  // best-effort: zero out obvious output positions so loops still terminate
  switch (t[0]) {
    case 'sensor': set(t[1], 0); break;
    case 'read': set(t[1], 0); break;
    case 'getlink': set(t[1], null); break;
    case 'radar': case 'uradar': set(t[7], null); break;
    case 'ulocate': set(t[5], 0); set(t[6], 0); set(t[7], 0); break;
    case 'lookup': set(t[2], null); break;
    case 'packcolor': {
      // approximate: keep components for draw col round-tripping
      const r = Number(t[2]) || 0, g = Number(t[3]) || 0, b = Number(t[4]) || 0, a = Number(t[5]) || 1;
      const int = (Math.round(r * 255) << 24 >>> 0) + (Math.round(g * 255) << 16) + (Math.round(b * 255) << 8) + Math.round(a * 255);
      const buf = new DataView(new ArrayBuffer(8));
      buf.setBigUint64(0, BigInt(int));
      set(t[1], buf.getFloat64(0));
      break;
    }
  }
}
