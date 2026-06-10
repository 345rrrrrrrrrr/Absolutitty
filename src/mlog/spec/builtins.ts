// Global built-in variables (read with plain references like `set x @tick`).
// Verified against Anuken/Mindustry: core/src/mindustry/logic/GlobalVars.java.

export interface BuiltinVar {
  name: string; // without leading @
  doc: string;
}

export const BUILTIN_VARS: readonly BuiltinVar[] = [
  { name: 'this', doc: 'the processor running the code' },
  { name: 'thisx', doc: 'x position of this processor, in tiles' },
  { name: 'thisy', doc: 'y position of this processor, in tiles' },
  { name: 'counter', doc: 'index of the next instruction — write to it to jump' },
  { name: 'links', doc: 'number of blocks linked to this processor' },
  { name: 'ipt', doc: 'instructions executed per tick (2 micro / 8 logic / 25 hyper)' },
  { name: 'unit', doc: 'the currently bound unit (set with ubind)' },
  { name: 'time', doc: 'current UNIX timestamp in milliseconds' },
  { name: 'tick', doc: 'ticks since the map started (60 per second)' },
  { name: 'second', doc: 'seconds since the map started' },
  { name: 'minute', doc: 'minutes since the map started' },
  { name: 'waveNumber', doc: 'current wave number' },
  { name: 'waveTime', doc: 'seconds until the next wave' },
  { name: 'mapw', doc: 'map width in tiles' },
  { name: 'maph', doc: 'map height in tiles' },
  { name: 'ctrlProcessor', doc: 'value of @controlled when a processor controls the unit' },
  { name: 'ctrlPlayer', doc: 'value of @controlled when a player controls the unit' },
  { name: 'ctrlCommand', doc: 'value of @controlled when the unit follows a command' },
  { name: 'blockCount', doc: 'number of block types (for lookup block)' },
  { name: 'itemCount', doc: 'number of item types (for lookup item)' },
  { name: 'liquidCount', doc: 'number of liquid types (for lookup liquid)' },
  { name: 'unitCount', doc: 'number of unit types (for lookup unit)' },
] as const;

export const KEYWORD_CONSTANTS = ['true', 'false', 'null'] as const;

export const BUILTIN_VAR_NAMES = new Set(BUILTIN_VARS.map((v) => v.name));
