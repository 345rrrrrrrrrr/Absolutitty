// Intermediate representation that both wizard templates and the node-graph
// compiler produce; the emitter turns it into pasteable mlog text.

export type Arg =
  | { t: 'var'; name: string }
  | { t: 'num'; value: number }
  | { t: 'str'; value: string }
  | { t: 'builtin'; name: string } // emitted with a leading @
  | { t: 'enum'; value: string }; // sub-command / keyword token

export const v = (name: string): Arg => ({ t: 'var', name });
export const n = (value: number): Arg => ({ t: 'num', value });
export const s = (value: string): Arg => ({ t: 'str', value });
export const at = (name: string): Arg => ({ t: 'builtin', name: name.replace(/^@/, '') });
export const kw = (value: string): Arg => ({ t: 'enum', value });

export type JumpCond =
  | 'equal' | 'notEqual' | 'lessThan' | 'lessThanEq'
  | 'greaterThan' | 'greaterThanEq' | 'strictEqual' | 'always';

export type IRNode =
  | { kind: 'instr'; op: string; args: Arg[] }
  | { kind: 'jump'; target: string; cond: JumpCond; a?: Arg; b?: Arg }
  | { kind: 'label'; name: string }
  | { kind: 'comment'; text: string }
  | { kind: 'raw'; line: string };

export interface IRProgram {
  nodes: IRNode[];
}

const INVERTED: Record<Exclude<JumpCond, 'always'>, JumpCond> = {
  equal: 'notEqual',
  notEqual: 'equal',
  lessThan: 'greaterThanEq',
  lessThanEq: 'greaterThan',
  greaterThan: 'lessThanEq',
  greaterThanEq: 'lessThan',
  strictEqual: 'notEqual', // no strictNotEqual in mlog; notEqual is the closest inverse
};

export function invertCond(cond: JumpCond): JumpCond {
  if (cond === 'always') return 'always';
  return INVERTED[cond];
}

export class IRBuilder {
  readonly nodes: IRNode[] = [];
  private labelCounter = 0;
  private tempCounter = 0;

  instr(op: string, ...args: Arg[]): void {
    this.nodes.push({ kind: 'instr', op, args });
  }

  comment(text: string): void {
    this.nodes.push({ kind: 'comment', text });
  }

  raw(line: string): void {
    this.nodes.push({ kind: 'raw', line });
  }

  /** Create a fresh label name (does not place it). */
  newLabel(hint = 'L'): string {
    return `${hint}_${this.labelCounter++}`;
  }

  /** Place a label at the current position. */
  label(name: string): void {
    this.nodes.push({ kind: 'label', name });
  }

  jump(target: string, cond: JumpCond = 'always', a?: Arg, b?: Arg): void {
    this.nodes.push({ kind: 'jump', target, cond, a, b });
  }

  tempVar(prefix = 't'): Arg {
    return v(`_${prefix}${this.tempCounter++}`);
  }

  /** if (a cond b) { then } else { else_ } */
  ifBlock(cond: JumpCond, a: Arg, b: Arg, then: () => void, else_?: () => void): void {
    const elseLabel = this.newLabel('else');
    const endLabel = this.newLabel('endif');
    this.jump(else_ ? elseLabel : endLabel, invertCond(cond), a, b);
    then();
    if (else_) {
      this.jump(endLabel, 'always');
      this.label(elseLabel);
      else_();
    }
    this.label(endLabel);
  }

  /** while (a cond b) { body } */
  whileBlock(cond: JumpCond, a: Arg, b: Arg, body: () => void): void {
    const top = this.newLabel('while');
    const done = this.newLabel('endwhile');
    this.label(top);
    this.jump(done, invertCond(cond), a, b);
    body();
    this.jump(top, 'always');
    this.label(done);
  }

  program(): IRProgram {
    return { nodes: [...this.nodes] };
  }
}
