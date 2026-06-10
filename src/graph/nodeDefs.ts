// The node vocabulary: friendly, high-level building blocks that compile to
// correct mlog idioms (null checks, printflush, flag claims, ...).

import { IRBuilder, type Arg, type JumpCond, v, n, s, at, kw, invertCond } from '../mlog/ir';
import { SENSOR_PROPS, ITEMS, LIQUIDS, UNITS, RADAR_FILTERS, RADAR_SORTS, BUILDING_GROUPS, OPS, JUMP_CONDS } from '../mlog/spec';

export interface NodeParamDef {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'boolean';
  options?: { value: string; label: string }[];
  default: string | number | boolean;
  help?: string;
  /** only show this param when another param has a specific value */
  showWhen?: { key: string; values: string[] };
}

export interface PortDef {
  key: string;
  label: string;
}

export interface EmitCtx {
  b: IRBuilder;
  params: Record<string, string | number | boolean>;
  /** resolve a data-in port: connected output var, or the literal fallback param */
  in(port: string): Arg;
  /** the variable for a data-out port */
  out(port: string): Arg;
}

export interface NodeDef {
  type: string;
  label: string;
  description: string;
  color: string; // accent for the node header
  params: NodeParamDef[];
  dataIn: PortDef[];
  dataOut: PortDef[];
  /** linear nodes have one exec out; branch nodes have exactly two */
  execOuts: string[];
  /** linear emit */
  emit?(ctx: EmitCtx): void;
  /** branch emit: emit code then a conditional jump to `secondLabel` when the
   *  SECOND exec out should be taken */
  emitBranch?(ctx: EmitCtx, secondLabel: string): void;
}

/** Parse a literal param into an IR arg: numbers, @content, "text", variables. */
export function parseValue(text: string | number | boolean): Arg {
  if (typeof text === 'number') return n(text);
  if (typeof text === 'boolean') return kw(text ? 'true' : 'false');
  const trimmed = text.trim();
  if (trimmed === '') return n(0);
  if (/^-?(\d+\.?\d*|\.\d+)$/.test(trimmed)) return n(Number(trimmed));
  if (trimmed === 'true' || trimmed === 'false' || trimmed === 'null') return kw(trimmed);
  if (trimmed.startsWith('@')) return at(trimmed);
  if (trimmed.startsWith('"')) return s(trimmed.replace(/^"|"$/g, ''));
  return v(trimmed);
}

const sensorPropOptions = [
  ...SENSOR_PROPS.map((p) => ({ value: `@${p.name}`, label: `@${p.name} — ${p.doc}` })),
  ...ITEMS.map((i) => ({ value: `@${i.name}`, label: `@${i.name} (stored amount)` })),
  ...LIQUIDS.map((l) => ({ value: `@${l.name}`, label: `@${l.name} (stored amount)` })),
];

const unitOptions = UNITS.map((u) => ({ value: `@${u.name}`, label: u.label }));
const itemOptions = ITEMS.map((i) => ({ value: `@${i.name}`, label: i.label }));
const condOptions = JUMP_CONDS.filter((c) => c !== 'always').map((c) => ({ value: c, label: c }));
const filterOptions = RADAR_FILTERS.map((f) => ({ value: f, label: f }));
const sortOptions = RADAR_SORTS.map((so) => ({ value: so, label: so }));

export const NODE_DEFS: readonly NodeDef[] = [
  {
    type: 'start',
    label: 'Start (main loop)',
    description: 'Where the program begins. Everything after it repeats forever — processors loop automatically.',
    color: 'var(--accent)',
    params: [],
    dataIn: [],
    dataOut: [],
    execOuts: ['next'],
  },
  {
    type: 'sensor',
    label: 'Read Sensor',
    description: 'Read a property (items, health, liquids, …) from a linked block or the bound unit.',
    color: 'var(--c-io)',
    params: [
      { key: 'target', label: 'From block', type: 'text', default: 'container1', help: 'A linked block name (e.g. container1, reactor1), @unit, or connect a block/unit value.' },
      { key: 'property', label: 'Property', type: 'select', options: sensorPropOptions, default: '@copper' },
      { key: 'varName', label: 'Save as', type: 'text', default: '', help: 'Optional variable name. Leave empty for automatic.' },
    ],
    dataIn: [{ key: 'target', label: 'from' }],
    dataOut: [{ key: 'value', label: 'value' }],
    execOuts: ['next'],
    emit({ b, params, in: input, out }) {
      void params;
      b.instr('sensor', out('value'), input('target'), parseValue(String(params.property)));
    },
  },
  {
    type: 'setvar',
    label: 'Set Variable',
    description: 'Store a value in a named variable.',
    color: 'var(--c-op)',
    params: [
      { key: 'varName', label: 'Variable', type: 'text', default: 'myVar' },
      { key: 'value', label: 'Value', type: 'text', default: '0' },
    ],
    dataIn: [{ key: 'value', label: 'value' }],
    dataOut: [{ key: 'value', label: 'value' }],
    execOuts: ['next'],
    emit({ b, params, in: input }) {
      b.instr('set', v(String(params.varName || 'myVar')), input('value'));
    },
  },
  {
    type: 'op',
    label: 'Math / Compare',
    description: 'result = a (operation) b. Comparisons give 1 (true) or 0 (false).',
    color: 'var(--c-op)',
    params: [
      { key: 'op', label: 'Operation', type: 'select', options: OPS.map((o) => ({ value: o.name, label: o.symbol ? `${o.name} (${o.symbol})` : o.name })), default: 'add' },
      { key: 'a', label: 'a', type: 'text', default: '0' },
      { key: 'b', label: 'b', type: 'text', default: '0' },
      { key: 'varName', label: 'Save as', type: 'text', default: '' },
    ],
    dataIn: [{ key: 'a', label: 'a' }, { key: 'b', label: 'b' }],
    dataOut: [{ key: 'result', label: 'result' }],
    execOuts: ['next'],
    emit({ b, params, in: input, out }) {
      b.instr('op', kw(String(params.op)), out('result'), input('a'), input('b'));
    },
  },
  {
    type: 'if',
    label: 'If / Compare',
    description: 'Take the first path when the comparison is true, otherwise the second.',
    color: 'var(--c-flow)',
    params: [
      { key: 'cond', label: 'Condition', type: 'select', options: condOptions, default: 'greaterThan' },
      { key: 'a', label: 'a', type: 'text', default: '0' },
      { key: 'b', label: 'b', type: 'text', default: '0' },
    ],
    dataIn: [{ key: 'a', label: 'a' }, { key: 'b', label: 'b' }],
    dataOut: [],
    execOuts: ['true', 'false'],
    emitBranch({ b, params, in: input }, secondLabel) {
      const cond = String(params.cond) as JumpCond;
      b.jump(secondLabel, invertCond(cond), input('a'), input('b'));
    },
  },
  {
    type: 'control',
    label: 'Control Block',
    description: 'Turn a linked block on/off, or set its configuration (e.g. a sorter\'s item).',
    color: 'var(--c-block)',
    params: [
      { key: 'link', label: 'Block', type: 'text', default: 'door1', help: 'Linked block name, e.g. door1, reactor1, sorter1.' },
      { key: 'action', label: 'Action', type: 'select', default: 'enabled', options: [
        { value: 'enabled', label: 'enabled — turn on/off' },
        { value: 'config', label: 'config — set item/content' },
        { value: 'color', label: 'color — set illuminator color' },
      ] },
      { key: 'value', label: 'Value', type: 'text', default: '1', help: 'For enabled: 1 = on, 0 = off. For config: an item like @titanium.' },
    ],
    dataIn: [{ key: 'value', label: 'value' }],
    dataOut: [],
    execOuts: ['next'],
    emit({ b, params, in: input }) {
      b.instr('control', kw(String(params.action)), parseValue(String(params.link)), input('value'));
    },
  },
  {
    type: 'readmem',
    label: 'Read Memory',
    description: 'Read a number from a linked memory cell or bank.',
    color: 'var(--c-io)',
    params: [
      { key: 'cell', label: 'Cell', type: 'text', default: 'cell1' },
      { key: 'address', label: 'Slot', type: 'number', default: 0, help: '0–63 for a cell, 0–511 for a bank.' },
      { key: 'varName', label: 'Save as', type: 'text', default: '' },
    ],
    dataIn: [],
    dataOut: [{ key: 'value', label: 'value' }],
    execOuts: ['next'],
    emit({ b, params, out }) {
      b.instr('read', out('value'), parseValue(String(params.cell)), parseValue(params.address));
    },
  },
  {
    type: 'writemem',
    label: 'Write Memory',
    description: 'Write a number into a linked memory cell or bank.',
    color: 'var(--c-io)',
    params: [
      { key: 'cell', label: 'Cell', type: 'text', default: 'cell1' },
      { key: 'address', label: 'Slot', type: 'number', default: 0 },
      { key: 'value', label: 'Value', type: 'text', default: '0' },
    ],
    dataIn: [{ key: 'value', label: 'value' }],
    dataOut: [],
    execOuts: ['next'],
    emit({ b, params, in: input }) {
      b.instr('write', input('value'), parseValue(String(params.cell)), parseValue(params.address));
    },
  },
  {
    type: 'radar',
    label: 'Radar',
    description: 'Find one unit near a linked turret. Takes the "found" path when a unit is there — the null check is built in.',
    color: 'var(--c-block)',
    params: [
      { key: 'from', label: 'Search around', type: 'text', default: 'turret1', help: 'A linked turret (the search range is the turret\'s range).' },
      { key: 'filter1', label: 'Filter', type: 'select', options: filterOptions, default: 'enemy' },
      { key: 'filter2', label: 'Filter 2', type: 'select', options: filterOptions, default: 'any' },
      { key: 'filter3', label: 'Filter 3', type: 'select', options: filterOptions, default: 'any' },
      { key: 'sort', label: 'Sort by', type: 'select', options: sortOptions, default: 'distance' },
      { key: 'order', label: 'Order', type: 'select', default: '1', options: [
        { value: '1', label: 'closest / highest first' },
        { value: '0', label: 'farthest / lowest first' },
      ] },
    ],
    dataIn: [],
    dataOut: [{ key: 'unit', label: 'unit' }],
    execOuts: ['found', 'none'],
    emitBranch({ b, params, out }, secondLabel) {
      b.instr('radar',
        kw(String(params.filter1)), kw(String(params.filter2)), kw(String(params.filter3)),
        kw(String(params.sort)), parseValue(String(params.from)), n(Number(params.order)), out('unit'));
      b.jump(secondLabel, 'equal', out('unit'), kw('null'));
    },
  },
  {
    type: 'ubind',
    label: 'Bind Unit',
    description: 'Take control of the next unit of a type. Takes the "found" path when one exists.',
    color: 'var(--c-unit)',
    params: [
      { key: 'unitType', label: 'Unit type', type: 'select', options: unitOptions, default: '@poly' },
    ],
    dataIn: [],
    dataOut: [{ key: 'unit', label: '@unit' }],
    execOuts: ['found', 'none'],
    emitBranch({ b, params, out }, secondLabel) {
      b.instr('ubind', parseValue(String(params.unitType)));
      b.instr('set', out('unit'), at('unit'));
      b.jump(secondLabel, 'equal', at('unit'), kw('null'));
    },
  },
  {
    type: 'ucontrol',
    label: 'Unit Order',
    description: 'Give an order to the bound unit (@unit): move, mine, take or drop items, attack, …',
    color: 'var(--c-unit)',
    params: [
      { key: 'order', label: 'Order', type: 'select', default: 'move', options: [
        { value: 'move', label: 'move to x, y' },
        { value: 'approach', label: 'approach x, y within radius' },
        { value: 'mine', label: 'mine the tile at x, y' },
        { value: 'itemDrop', label: 'drop items into a building' },
        { value: 'itemTake', label: 'take items from a building' },
        { value: 'target', label: 'shoot at x, y' },
        { value: 'targetp', label: 'shoot at a unit' },
        { value: 'flag', label: 'set the unit\'s flag' },
        { value: 'boost', label: 'boost on/off' },
        { value: 'idle', label: 'idle' },
        { value: 'stop', label: 'stop everything' },
        { value: 'unbind', label: 'release from logic control' },
      ] },
      { key: 'x', label: 'x', type: 'text', default: '0', showWhen: { key: 'order', values: ['move', 'approach', 'mine', 'target'] } },
      { key: 'y', label: 'y', type: 'text', default: '0', showWhen: { key: 'order', values: ['move', 'approach', 'mine', 'target'] } },
      { key: 'radius', label: 'radius', type: 'text', default: '5', showWhen: { key: 'order', values: ['approach'] } },
      { key: 'building', label: 'building', type: 'text', default: 'core', help: 'A building variable (e.g. from Locate) — or @air to dump.', showWhen: { key: 'order', values: ['itemDrop', 'itemTake'] } },
      { key: 'item', label: 'item', type: 'select', options: itemOptions, default: '@copper', showWhen: { key: 'order', values: ['itemTake'] } },
      { key: 'amount', label: 'amount', type: 'text', default: '999', showWhen: { key: 'order', values: ['itemDrop', 'itemTake'] } },
      { key: 'unit', label: 'target unit', type: 'text', default: 'target', showWhen: { key: 'order', values: ['targetp'] } },
      { key: 'shoot', label: 'shoot (1/0)', type: 'text', default: '1', showWhen: { key: 'order', values: ['target', 'targetp'] } },
      { key: 'value', label: 'value', type: 'text', default: '1', showWhen: { key: 'order', values: ['flag', 'boost'] } },
    ],
    dataIn: [{ key: 'x', label: 'x' }, { key: 'y', label: 'y' }, { key: 'unit', label: 'unit' }],
    dataOut: [],
    execOuts: ['next'],
    emit({ b, params, in: input }) {
      const order = String(params.order);
      const p = (key: string) => parseValue(String(params[key] ?? '0'));
      switch (order) {
        case 'move': b.instr('ucontrol', kw('move'), input('x'), input('y')); break;
        case 'approach': b.instr('ucontrol', kw('approach'), input('x'), input('y'), p('radius')); break;
        case 'mine': b.instr('ucontrol', kw('mine'), input('x'), input('y')); break;
        case 'itemDrop': b.instr('ucontrol', kw('itemDrop'), p('building'), p('amount')); break;
        case 'itemTake': b.instr('ucontrol', kw('itemTake'), p('building'), p('item'), p('amount')); break;
        case 'target': b.instr('ucontrol', kw('target'), input('x'), input('y'), p('shoot')); break;
        case 'targetp': b.instr('ucontrol', kw('targetp'), input('unit'), p('shoot')); break;
        case 'flag': b.instr('ucontrol', kw('flag'), p('value')); break;
        case 'boost': b.instr('ucontrol', kw('boost'), p('value')); break;
        default: b.instr('ucontrol', kw(order)); break;
      }
    },
  },
  {
    type: 'ulocate',
    label: 'Locate',
    description: 'Find the nearest ore tile or building anywhere on the map (needs a bound unit). Takes the "found" path on success.',
    color: 'var(--c-unit)',
    params: [
      { key: 'find', label: 'Find', type: 'select', default: 'ore', options: [
        { value: 'ore', label: 'an ore tile' },
        { value: 'building', label: 'a building' },
        { value: 'spawn', label: 'the enemy spawn' },
        { value: 'damaged', label: 'a damaged ally building' },
      ] },
      { key: 'ore', label: 'Ore', type: 'select', options: itemOptions, default: '@copper', showWhen: { key: 'find', values: ['ore'] } },
      { key: 'group', label: 'Building group', type: 'select', options: BUILDING_GROUPS.map((g) => ({ value: g, label: g })), default: 'core', showWhen: { key: 'find', values: ['building'] } },
      { key: 'enemy', label: 'Enemy buildings?', type: 'boolean', default: false, showWhen: { key: 'find', values: ['building'] } },
    ],
    dataIn: [],
    dataOut: [
      { key: 'x', label: 'x' },
      { key: 'y', label: 'y' },
      { key: 'building', label: 'building' },
    ],
    execOuts: ['found', 'none'],
    emitBranch({ b, params, out }, secondLabel) {
      const found = b.tempVar('found');
      const find = String(params.find);
      if (find === 'ore') {
        b.instr('ulocate', kw('ore'), kw('core'), kw('true'), parseValue(String(params.ore)), out('x'), out('y'), found, out('building'));
      } else if (find === 'building') {
        b.instr('ulocate', kw('building'), kw(String(params.group)), kw(params.enemy ? 'true' : 'false'), at('copper'), out('x'), out('y'), found, out('building'));
      } else {
        b.instr('ulocate', kw(find), kw('core'), kw('true'), at('copper'), out('x'), out('y'), found, out('building'));
      }
      b.jump(secondLabel, 'equal', found, kw('false'));
    },
  },
  {
    type: 'print',
    label: 'Print Message',
    description: 'Show text on a linked message block. Use {a} and {b} to insert connected values — printflush is included.',
    color: 'var(--c-io)',
    params: [
      { key: 'text', label: 'Text', type: 'text', default: 'Hello!', help: 'Plain text. {a}, {b} and {c} insert the connected values; \\n starts a new line.' },
      { key: 'target', label: 'Message block', type: 'text', default: 'message1' },
    ],
    dataIn: [{ key: 'a', label: 'a' }, { key: 'b', label: 'b' }, { key: 'c', label: 'c' }],
    dataOut: [],
    execOuts: ['next'],
    emit({ b, params, in: input }) {
      const text = String(params.text);
      const parts = text.split(/(\{[abc]\})/);
      for (const part of parts) {
        if (part === '') continue;
        if (part === '{a}') b.instr('print', input('a'));
        else if (part === '{b}') b.instr('print', input('b'));
        else if (part === '{c}') b.instr('print', input('c'));
        else b.instr('print', s(part));
      }
      b.instr('printflush', parseValue(String(params.target)));
    },
  },
  {
    type: 'wait',
    label: 'Wait',
    description: 'Pause for a number of seconds before continuing.',
    color: 'var(--c-flow)',
    params: [
      { key: 'seconds', label: 'Seconds', type: 'number', default: 0.5 },
    ],
    dataIn: [],
    dataOut: [],
    execOuts: ['next'],
    emit({ b, params }) {
      b.instr('wait', n(Number(params.seconds)));
    },
  },
  {
    type: 'draw',
    label: 'Draw Shape',
    description: 'Queue a shape for a logic display. Add a Draw Flush node afterward to show everything.',
    color: 'var(--c-draw)',
    params: [
      { key: 'shape', label: 'Shape', type: 'select', default: 'rect', options: [
        { value: 'clear', label: 'clear (fill screen)' },
        { value: 'color', label: 'set color' },
        { value: 'stroke', label: 'set line width' },
        { value: 'line', label: 'line' },
        { value: 'rect', label: 'filled rectangle' },
        { value: 'lineRect', label: 'rectangle outline' },
        { value: 'poly', label: 'filled polygon' },
        { value: 'linePoly', label: 'polygon outline' },
        { value: 'triangle', label: 'filled triangle' },
        { value: 'image', label: 'item/unit icon' },
      ] },
      { key: 'a1', label: 'x / r', type: 'text', default: '0' },
      { key: 'a2', label: 'y / g', type: 'text', default: '0' },
      { key: 'a3', label: 'w / b / sides', type: 'text', default: '0' },
      { key: 'a4', label: 'h / a / radius', type: 'text', default: '0' },
      { key: 'a5', label: 'rotation / extra', type: 'text', default: '0' },
      { key: 'a6', label: 'extra', type: 'text', default: '0' },
    ],
    dataIn: [{ key: 'a1', label: 'x/r' }, { key: 'a2', label: 'y/g' }, { key: 'a3', label: 'w/b' }, { key: 'a4', label: 'h/a' }],
    dataOut: [],
    execOuts: ['next'],
    emit({ b, params, in: input }) {
      b.instr('draw', kw(String(params.shape)), input('a1'), input('a2'), input('a3'), input('a4'),
        parseValue(String(params.a5 ?? '0')), parseValue(String(params.a6 ?? '0')));
    },
  },
  {
    type: 'drawflush',
    label: 'Draw Flush',
    description: 'Push all queued shapes to a linked logic display.',
    color: 'var(--c-draw)',
    params: [
      { key: 'target', label: 'Display', type: 'text', default: 'display1' },
    ],
    dataIn: [],
    dataOut: [],
    execOuts: ['next'],
    emit({ b, params }) {
      b.instr('drawflush', parseValue(String(params.target)));
    },
  },
  {
    type: 'getlink',
    label: 'Get Link by Index',
    description: 'Get the Nth linked block (0 to @links − 1) — useful to loop over all links.',
    color: 'var(--c-io)',
    params: [
      { key: 'index', label: 'Index', type: 'text', default: '0' },
      { key: 'varName', label: 'Save as', type: 'text', default: '' },
    ],
    dataIn: [{ key: 'index', label: 'index' }],
    dataOut: [{ key: 'block', label: 'block' }],
    execOuts: ['next'],
    emit({ b, params, in: input, out }) {
      void params;
      b.instr('getlink', out('block'), input('index'));
    },
  },
] as const;

export const NODE_DEF_MAP: ReadonlyMap<string, NodeDef> = new Map(NODE_DEFS.map((d) => [d.type, d]));
