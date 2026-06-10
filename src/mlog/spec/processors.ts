// Logic processor stats. Verified against Anuken/Mindustry LogicBlock definitions:
// micro = 2 ipt / range 8 tiles, logic = 8 ipt / range 22 tiles (10 in older versions),
// hyper = 25 ipt / range 42 tiles. 1 tick = 1/60 s. Max 1000 instructions for all.

export interface ProcessorSpec {
  id: 'micro' | 'logic' | 'hyper';
  name: string;
  ipt: number;
  opsPerSecond: number;
  range: number; // link range in tiles
  note: string;
}

export const PROCESSORS: readonly ProcessorSpec[] = [
  { id: 'micro', name: 'Micro Processor', ipt: 2, opsPerSecond: 120, range: 8, note: 'cheap, slow — fine for simple checks' },
  { id: 'logic', name: 'Logic Processor', ipt: 8, opsPerSecond: 480, range: 22, note: 'the standard choice' },
  { id: 'hyper', name: 'Hyper Processor', ipt: 25, opsPerSecond: 1500, range: 42, note: 'fast but needs cryofluid' },
] as const;

export const MAX_INSTRUCTIONS = 1000;
export const PRINT_BUFFER_LIMIT = 400; // characters
export const DRAW_BUFFER_LIMIT = 256; // queued draw calls

export const DISPLAYS = [
  { id: 'logic-display', name: 'Logic Display', pixels: 80 },
  { id: 'large-logic-display', name: 'Large Logic Display', pixels: 176 },
] as const;

export function getProcessor(id: string): ProcessorSpec {
  return PROCESSORS.find((p) => p.id === id) ?? PROCESSORS[1];
}
