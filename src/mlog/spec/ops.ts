// `op` instruction operations.
// Verified against Anuken/Mindustry: core/src/mindustry/logic/LogicOp.java (v7 set, v8 additions noted).

export interface OpSpec {
  name: string;
  arity: 1 | 2;
  symbol?: string;
  doc: string;
  v8?: boolean;
}

export const OPS: readonly OpSpec[] = [
  { name: 'add', arity: 2, symbol: '+', doc: 'a + b' },
  { name: 'sub', arity: 2, symbol: '-', doc: 'a - b' },
  { name: 'mul', arity: 2, symbol: '*', doc: 'a × b' },
  { name: 'div', arity: 2, symbol: '/', doc: 'a ÷ b (floating point)' },
  { name: 'idiv', arity: 2, symbol: '//', doc: 'a ÷ b, rounded down to an integer' },
  { name: 'mod', arity: 2, symbol: '%', doc: 'remainder of a ÷ b' },
  { name: 'emod', arity: 2, symbol: '%%', doc: 'Euclidean modulo — always positive', v8: true },
  { name: 'pow', arity: 2, symbol: '^', doc: 'a raised to the power b' },
  { name: 'equal', arity: 2, symbol: '==', doc: '1 if a equals b, else 0' },
  { name: 'notEqual', arity: 2, symbol: '!=', doc: '1 if a does not equal b, else 0' },
  { name: 'land', arity: 2, symbol: '&&', doc: 'logical AND — 1 if both a and b are non-zero' },
  { name: 'lessThan', arity: 2, symbol: '<', doc: '1 if a < b, else 0' },
  { name: 'lessThanEq', arity: 2, symbol: '<=', doc: '1 if a ≤ b, else 0' },
  { name: 'greaterThan', arity: 2, symbol: '>', doc: '1 if a > b, else 0' },
  { name: 'greaterThanEq', arity: 2, symbol: '>=', doc: '1 if a ≥ b, else 0' },
  { name: 'strictEqual', arity: 2, symbol: '===', doc: '1 if a and b are the same value AND type (no coercion)' },
  { name: 'shl', arity: 2, symbol: '<<', doc: 'bit-shift a left by b' },
  { name: 'shr', arity: 2, symbol: '>>', doc: 'bit-shift a right by b (arithmetic)' },
  { name: 'ushr', arity: 2, symbol: '>>>', doc: 'bit-shift a right by b (unsigned)', v8: true },
  { name: 'or', arity: 2, symbol: '|', doc: 'bitwise OR' },
  { name: 'and', arity: 2, symbol: '&', doc: 'bitwise AND' },
  { name: 'xor', arity: 2, symbol: 'xor', doc: 'bitwise XOR' },
  { name: 'not', arity: 1, symbol: '~', doc: 'bitwise NOT (flip all bits)' },
  { name: 'max', arity: 2, doc: 'larger of a and b' },
  { name: 'min', arity: 2, doc: 'smaller of a and b' },
  { name: 'angle', arity: 2, doc: 'angle of the vector (a, b) in degrees' },
  { name: 'angleDiff', arity: 2, doc: 'smallest difference between angles a and b, in degrees' },
  { name: 'len', arity: 2, doc: 'length of the vector (a, b)' },
  { name: 'noise', arity: 2, doc: '2D simplex noise at (a, b), range -1..1' },
  { name: 'abs', arity: 1, doc: 'absolute value of a' },
  { name: 'sign', arity: 1, doc: '-1, 0 or 1 depending on the sign of a', v8: true },
  { name: 'log', arity: 1, doc: 'natural logarithm of a' },
  { name: 'logn', arity: 2, doc: 'logarithm of a with base b', v8: true },
  { name: 'log10', arity: 1, doc: 'base-10 logarithm of a' },
  { name: 'floor', arity: 1, doc: 'round a down' },
  { name: 'ceil', arity: 1, doc: 'round a up' },
  { name: 'round', arity: 1, doc: 'round a to the nearest integer', v8: true },
  { name: 'sqrt', arity: 1, doc: 'square root of a' },
  { name: 'rand', arity: 1, doc: 'random number between 0 (inclusive) and a (exclusive)' },
  { name: 'sin', arity: 1, doc: 'sine of a (degrees)' },
  { name: 'cos', arity: 1, doc: 'cosine of a (degrees)' },
  { name: 'tan', arity: 1, doc: 'tangent of a (degrees)' },
  { name: 'asin', arity: 1, doc: 'arc sine of a, in degrees' },
  { name: 'acos', arity: 1, doc: 'arc cosine of a, in degrees' },
  { name: 'atan', arity: 1, doc: 'arc tangent of a, in degrees' },
] as const;

export const OP_NAMES = new Set(OPS.map((o) => o.name));
export function getOp(name: string): OpSpec | undefined {
  return OPS.find((o) => o.name === name);
}
