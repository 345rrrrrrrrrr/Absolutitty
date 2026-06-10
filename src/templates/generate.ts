// Turn a template + parameter values into mlog code (and the graph, when
// the template is graph-based). Used by the wizard, the editor handoff
// and the regression tests.

import type { Template, ParamValues } from './types';
import type { GraphDoc, GraphError } from '../graph/types';
import { compileGraph } from '../graph/compile';
import { emit, instructionCount } from '../mlog/emitter';
import type { IRProgram } from '../mlog/ir';

export interface GenerateResult {
  code: string;
  codeWithoutComments: string;
  instructions: number;
  graph?: GraphDoc;
  errors: GraphError[];
}

export function defaultValues(template: Template): ParamValues {
  return Object.fromEntries(template.params.map((p) => [p.key, p.default]));
}

export function generate(template: Template, values: ParamValues): GenerateResult {
  let ir: IRProgram;
  let graph: GraphDoc | undefined;
  let errors: GraphError[] = [];

  if (template.buildGraph) {
    graph = template.buildGraph(values);
    const compiled = compileGraph(graph);
    ir = compiled.ir;
    errors = compiled.errors;
  } else if (template.buildIR) {
    ir = template.buildIR(values);
  } else {
    return { code: '', codeWithoutComments: '', instructions: 0, errors: [{ message: 'template has no builder' }] };
  }

  return {
    code: emit(ir),
    codeWithoutComments: emit(ir, { comments: false }),
    instructions: instructionCount(ir),
    graph,
    errors,
  };
}
