// The mlog instruction set (standard processors, v7 + common v8 additions).
// Verified against Anuken/Mindustry: core/src/mindustry/logic/LStatements.java.
// Arg counts follow the game's own export format (it pads optional args with 0).

import { OPS } from './ops';
import { RADAR_FILTERS, RADAR_SORTS, BUILDING_GROUPS } from './content';

export type ArgKind = 'input' | 'output' | 'enum';

export interface ArgSpec {
  name: string;
  kind: ArgKind;
  enum?: readonly string[];
  doc?: string;
}

export interface InstructionVariant {
  sub: string;
  args: ArgSpec[]; // args AFTER the subcommand token
  doc: string;
  example?: string;
}

export type Category =
  | 'Input/Output'
  | 'Block Control'
  | 'Operations'
  | 'Flow Control'
  | 'Unit Control'
  | 'Drawing';

export interface InstructionSpec {
  name: string;
  category: Category;
  doc: string;
  example: string;
  args?: ArgSpec[]; // simple instructions
  variants?: InstructionVariant[]; // subcommand instructions (first token selects variant)
  /** total padded token count after the instruction name, as the game exports it */
  paddedCount: number;
  notes?: string[];
  v8?: boolean;
}

export const JUMP_CONDS = [
  'equal', 'notEqual', 'lessThan', 'lessThanEq', 'greaterThan', 'greaterThanEq', 'strictEqual', 'always',
] as const;

const inp = (name: string, doc?: string): ArgSpec => ({ name, kind: 'input', doc });
const out = (name: string, doc?: string): ArgSpec => ({ name, kind: 'output', doc });

export const INSTRUCTIONS: readonly InstructionSpec[] = [
  // ───────────── Input/Output ─────────────
  {
    name: 'read', category: 'Input/Output', paddedCount: 3,
    doc: 'Read a number from a linked memory cell/bank into a variable.',
    example: 'read score cell1 0',
    args: [out('result'), inp('cell', 'linked memory cell, e.g. cell1'), inp('address', '0–63 (cell) or 0–511 (bank)')],
    notes: ['Memory cells store numbers only — not text or buildings.'],
  },
  {
    name: 'write', category: 'Input/Output', paddedCount: 3,
    doc: 'Write a number into a linked memory cell/bank.',
    example: 'write score cell1 0',
    args: [inp('value'), inp('cell', 'linked memory cell, e.g. cell1'), inp('address')],
  },
  {
    name: 'print', category: 'Input/Output', paddedCount: 1,
    doc: 'Add text or a value to the print buffer. Nothing shows until printflush.',
    example: 'print "items: "',
    args: [inp('value', 'text in "quotes" or a variable')],
    notes: [
      'Use \\n inside a string for a new line.',
      'Color tags work in messages: [red]warning[] — and item icons via unicode.',
      'The buffer holds about 400 characters.',
    ],
  },
  {
    name: 'printchar', category: 'Input/Output', paddedCount: 1, v8: true,
    doc: 'Add a single character (by unicode number) or content icon to the print buffer.',
    example: 'printchar 65',
    args: [inp('char', 'unicode codepoint or content like @copper')],
  },
  {
    name: 'format', category: 'Input/Output', paddedCount: 1, v8: true,
    doc: 'Replace the lowest {0}–{9} placeholder in the print buffer with a value.',
    example: 'format score',
    args: [inp('value')],
  },
  {
    name: 'printflush', category: 'Input/Output', paddedCount: 1,
    doc: 'Push the print buffer to a linked message block and clear it.',
    example: 'printflush message1',
    args: [inp('target', 'linked message block, e.g. message1')],
  },
  {
    name: 'getlink', category: 'Input/Output', paddedCount: 2,
    doc: 'Get a linked building by index (0 to @links − 1) — lets one program loop over every link.',
    example: 'getlink block 0',
    args: [out('result'), inp('index')],
  },
  {
    name: 'sensor', category: 'Input/Output', paddedCount: 3,
    doc: 'Read a property (health, items, position, …) of a building or unit.',
    example: 'sensor coalAmount container1 @coal',
    args: [out('result'), inp('target', 'linked block, @unit, or a variable holding one'), inp('property', '@health, @copper, @x, …')],
    notes: ['Reading an item like @copper returns how many of that item the target holds.'],
  },

  // ───────────── Block Control ─────────────
  {
    name: 'control', category: 'Block Control', paddedCount: 6,
    doc: 'Set a property of a linked building (turn it on/off, aim a turret, …).',
    example: 'control enabled reactor1 false 0 0 0',
    variants: [
      { sub: 'enabled', doc: 'Turn a building on (1/true) or off (0/false).', args: [inp('block'), inp('enabled', '1 or 0')], example: 'control enabled door1 1 0 0 0' },
      { sub: 'shoot', doc: 'Make a turret shoot at map coordinates (shoot = 0 stops).', args: [inp('turret'), inp('x'), inp('y'), inp('shoot', '1 to fire, 0 to stop')], example: 'control shoot duo1 50 50 1 0' },
      { sub: 'shootp', doc: 'Make a turret shoot at a unit (with target prediction).', args: [inp('turret'), inp('unit'), inp('shoot', '1 to fire, 0 to stop')], example: 'control shootp duo1 target 1 0 0' },
      { sub: 'config', doc: 'Set a block configuration, e.g. which item a sorter passes.', args: [inp('block'), inp('value', 'e.g. @titanium')], example: 'control config sorter1 @titanium 0 0 0' },
      { sub: 'color', doc: 'Set an illuminator color (use packcolor to build the value).', args: [inp('illuminator'), inp('color', 'packed color from packcolor')], example: 'control color illuminator1 col 0 0 0' },
    ],
  },
  {
    name: 'radar', category: 'Block Control', paddedCount: 7,
    doc: 'Find one unit near a linked turret (or other block with a range), filtered and sorted.',
    example: 'radar enemy any any distance turret1 1 target',
    args: [
      { name: 'filter1', kind: 'enum', enum: RADAR_FILTERS },
      { name: 'filter2', kind: 'enum', enum: RADAR_FILTERS },
      { name: 'filter3', kind: 'enum', enum: RADAR_FILTERS },
      { name: 'sort', kind: 'enum', enum: RADAR_SORTS },
      inp('from', 'linked block whose range is searched, e.g. turret1'),
      inp('order', '1 = closest/highest first, 0 = farthest/lowest'),
      out('result', 'the unit found, or null'),
    ],
    notes: ['Always check the result for null before using it.', 'The search range is the linked block\'s range — not the processor\'s.'],
  },

  // ───────────── Operations ─────────────
  {
    name: 'set', category: 'Operations', paddedCount: 2,
    doc: 'Assign a value to a variable.',
    example: 'set target 100',
    args: [out('variable'), inp('value')],
  },
  {
    name: 'op', category: 'Operations', paddedCount: 4,
    doc: 'Do math or comparisons: result = a (operation) b.',
    example: 'op add total total 1',
    variants: OPS.map((o) => ({
      sub: o.name,
      doc: o.doc + (o.symbol ? ` (${o.symbol})` : '') + (o.v8 ? ' — v8 only' : ''),
      args: o.arity === 2 ? [out('result'), inp('a'), inp('b')] : [out('result'), inp('a')],
      example: o.arity === 2 ? `op ${o.name} result a b` : `op ${o.name} result a 0`,
    })),
    notes: ['Trigonometry uses degrees, not radians.', 'Comparisons return 1 (true) or 0 (false).'],
  },
  {
    name: 'lookup', category: 'Operations', paddedCount: 3,
    doc: 'Look up an item/liquid/unit/block type by its numeric id.',
    example: 'lookup item result 0',
    variants: (['item', 'liquid', 'unit', 'block'] as const).map((t) => ({
      sub: t,
      doc: `Get the ${t} type with the given id (0 to @${t}Count − 1).`,
      args: [out('result'), inp('id')],
    })),
  },
  {
    name: 'packcolor', category: 'Operations', paddedCount: 5,
    doc: 'Pack red/green/blue/alpha (each 0–1) into one color value.',
    example: 'packcolor col 1 0.5 0 1',
    args: [out('result'), inp('r'), inp('g'), inp('b'), inp('a')],
  },

  // ───────────── Flow Control ─────────────
  {
    name: 'wait', category: 'Flow Control', paddedCount: 1,
    doc: 'Pause this processor for a number of seconds.',
    example: 'wait 0.5',
    args: [inp('seconds')],
  },
  {
    name: 'stop', category: 'Flow Control', paddedCount: 0,
    doc: 'Halt the processor until its code changes.',
    example: 'stop',
    args: [],
  },
  {
    name: 'end', category: 'Flow Control', paddedCount: 0,
    doc: 'Jump back to the first instruction (programs also wrap automatically at the end).',
    example: 'end',
    args: [],
  },
  {
    name: 'jump', category: 'Flow Control', paddedCount: 4,
    doc: 'Jump to another line, optionally only when a comparison is true.',
    example: 'jump 0 lessThan count 10',
    args: [
      inp('target', 'line number (0-based) — comment lines don\'t count'),
      { name: 'condition', kind: 'enum', enum: JUMP_CONDS },
      inp('a'),
      inp('b'),
    ],
    notes: ['`always` jumps unconditionally; the a/b values are ignored.'],
  },

  // ───────────── Unit Control ─────────────
  {
    name: 'ubind', category: 'Unit Control', paddedCount: 1,
    doc: 'Bind the next unit of a type. The bound unit becomes @unit.',
    example: 'ubind @poly',
    args: [inp('type', 'unit type, e.g. @poly')],
    notes: ['Calling ubind repeatedly cycles through all units of that type.', 'Check @unit for null — there may be no units.'],
  },
  {
    name: 'ucontrol', category: 'Unit Control', paddedCount: 6,
    doc: 'Give an order to the currently bound unit (@unit).',
    example: 'ucontrol move 50 50 0 0 0',
    variants: [
      { sub: 'idle', doc: 'Stop moving but keep building/mining.', args: [] },
      { sub: 'stop', doc: 'Stop moving, building and mining.', args: [] },
      { sub: 'move', doc: 'Move to the position.', args: [inp('x'), inp('y')] },
      { sub: 'approach', doc: 'Move within `radius` tiles of the position.', args: [inp('x'), inp('y'), inp('radius')] },
      { sub: 'pathfind', doc: 'Pathfind to the position (around walls).', args: [inp('x'), inp('y')] },
      { sub: 'autoPathfind', doc: 'Follow the default AI path toward the enemy (v8).', args: [] },
      { sub: 'boost', doc: 'Start/stop boosting (mechs only).', args: [inp('enable', '1 or 0')] },
      { sub: 'target', doc: 'Aim/shoot at a position.', args: [inp('x'), inp('y'), inp('shoot', '1 to fire')] },
      { sub: 'targetp', doc: 'Aim/shoot at a unit (with prediction).', args: [inp('unit'), inp('shoot', '1 to fire')] },
      { sub: 'itemDrop', doc: 'Drop carried items into a building (or @air to dump).', args: [inp('to', 'building or @air'), inp('amount')] },
      { sub: 'itemTake', doc: 'Take items from a building.', args: [inp('from', 'building'), inp('item', 'e.g. @copper'), inp('amount')] },
      { sub: 'payDrop', doc: 'Drop the current payload.', args: [] },
      { sub: 'payTake', doc: 'Pick up a payload at the unit\'s position.', args: [inp('takeUnits', '1 = pick up units too')] },
      { sub: 'payEnter', doc: 'Enter/land on the block below the unit.', args: [] },
      { sub: 'mine', doc: 'Mine the ore tile at the position.', args: [inp('x'), inp('y')] },
      { sub: 'flag', doc: 'Set the unit\'s numeric flag (used to mark "owned" units).', args: [inp('value')] },
      { sub: 'build', doc: 'Build a block.', args: [inp('x'), inp('y'), inp('block'), inp('rotation'), inp('config')] },
      { sub: 'getBlock', doc: 'Read what block is at a position near the unit.', args: [inp('x'), inp('y'), out('type'), out('building'), out('floor')] },
      { sub: 'within', doc: 'Check whether the unit is within radius of a position.', args: [inp('x'), inp('y'), inp('radius'), out('result', '1 or 0')] },
      { sub: 'unbind', doc: 'Release the unit from logic control (it resumes normal AI).', args: [] },
    ],
    notes: ['Orders persist — a moving unit keeps moving while your code does other things.'],
  },
  {
    name: 'uradar', category: 'Unit Control', paddedCount: 7,
    doc: 'Like radar, but searches around the bound unit (@unit).',
    example: 'uradar enemy any any distance 0 1 target',
    args: [
      { name: 'filter1', kind: 'enum', enum: RADAR_FILTERS },
      { name: 'filter2', kind: 'enum', enum: RADAR_FILTERS },
      { name: 'filter3', kind: 'enum', enum: RADAR_FILTERS },
      { name: 'sort', kind: 'enum', enum: RADAR_SORTS },
      inp('unused', 'always 0'),
      inp('order', '1 = closest first'),
      out('result'),
    ],
  },
  {
    name: 'ulocate', category: 'Unit Control', paddedCount: 8,
    doc: 'Find an ore tile, building, spawn point or damaged ally — anywhere on the map (needs a bound unit).',
    example: 'ulocate building core false @copper outX outY found building',
    variants: [
      {
        sub: 'ore', doc: 'Find the nearest tile of an ore.',
        args: [inp('unused', 'always core'), inp('unused2', 'always true'), inp('ore', 'e.g. @copper'), out('outX'), out('outY'), out('found'), out('building', 'always null for ore')],
        example: 'ulocate ore core true @copper outX outY found building',
      },
      {
        sub: 'building', doc: 'Find the nearest building of a group.',
        args: [
          { name: 'group', kind: 'enum', enum: BUILDING_GROUPS },
          inp('enemy', 'true = enemy buildings'), inp('unused', 'ore filler, e.g. @copper'),
          out('outX'), out('outY'), out('found'), out('building'),
        ],
        example: 'ulocate building core false @copper outX outY found core',
      },
      {
        sub: 'spawn', doc: 'Find the nearest enemy spawn point.',
        args: [inp('unused', 'always core'), inp('unused2'), inp('unused3'), out('outX'), out('outY'), out('found'), out('building')],
      },
      {
        sub: 'damaged', doc: 'Find the nearest damaged allied building.',
        args: [inp('unused', 'always core'), inp('unused2'), inp('unused3'), out('outX'), out('outY'), out('found'), out('building')],
      },
    ],
    notes: ['Requires a bound unit (@unit) — bind one with ubind first.', 'Check `found` before using the result.'],
  },

  // ───────────── Drawing ─────────────
  {
    name: 'draw', category: 'Drawing', paddedCount: 7,
    doc: 'Queue a drawing operation for a logic display. Nothing shows until drawflush.',
    example: 'draw rect 10 10 40 20 0 0',
    variants: [
      { sub: 'clear', doc: 'Fill the whole display with an RGB color (0–255).', args: [inp('r'), inp('g'), inp('b')] },
      { sub: 'color', doc: 'Set the drawing color (RGBA 0–255).', args: [inp('r'), inp('g'), inp('b'), inp('a')] },
      { sub: 'col', doc: 'Set the drawing color from one packed value (see packcolor).', args: [inp('color')] },
      { sub: 'stroke', doc: 'Set line thickness for line drawing.', args: [inp('width')] },
      { sub: 'line', doc: 'Draw a line between two points.', args: [inp('x'), inp('y'), inp('x2'), inp('y2')] },
      { sub: 'rect', doc: 'Draw a filled rectangle.', args: [inp('x'), inp('y'), inp('width'), inp('height')] },
      { sub: 'lineRect', doc: 'Draw a rectangle outline.', args: [inp('x'), inp('y'), inp('width'), inp('height')] },
      { sub: 'poly', doc: 'Draw a filled regular polygon.', args: [inp('x'), inp('y'), inp('sides'), inp('radius'), inp('rotation')] },
      { sub: 'linePoly', doc: 'Draw a polygon outline.', args: [inp('x'), inp('y'), inp('sides'), inp('radius'), inp('rotation')] },
      { sub: 'triangle', doc: 'Draw a filled triangle.', args: [inp('x'), inp('y'), inp('x2'), inp('y2'), inp('x3'), inp('y3')] },
      { sub: 'image', doc: 'Draw the icon of an item/unit/block.', args: [inp('x'), inp('y'), inp('image', 'e.g. @copper'), inp('size'), inp('rotation')] },
      { sub: 'print', doc: 'Draw the print buffer as text on the display (v8).', args: [inp('x'), inp('y'), { name: 'align', kind: 'enum', enum: ['center', 'top', 'bottom', 'left', 'right', 'topLeft', 'topRight', 'bottomLeft', 'bottomRight'] }] },
    ],
    notes: ['The display origin (0,0) is the BOTTOM-left corner.', 'Logic Display is 80×80 px; Large is 176×176 px.', 'At most 256 draw calls can be queued before a drawflush.'],
  },
  {
    name: 'drawflush', category: 'Drawing', paddedCount: 1,
    doc: 'Push all queued draw operations to a linked display.',
    example: 'drawflush display1',
    args: [inp('target', 'linked display, e.g. display1')],
  },
] as const;

export const INSTRUCTION_MAP: ReadonlyMap<string, InstructionSpec> = new Map(
  INSTRUCTIONS.map((i) => [i.name, i]),
);

export function getVariant(spec: InstructionSpec, sub: string): InstructionVariant | undefined {
  return spec.variants?.find((v) => v.sub === sub);
}
