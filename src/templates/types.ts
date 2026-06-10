import type { GraphDoc } from '../graph/types';
import type { IRProgram } from '../mlog/ir';

export type ParamType =
  | 'unitType' | 'itemType' | 'liquidType' | 'blockLink'
  | 'number' | 'select' | 'boolean' | 'text' | 'processor';

export interface TemplateParam {
  key: string;
  label: string;
  help: string;
  type: ParamType;
  default: string | number | boolean;
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string; label: string }[];
  /** placeholder/example for blockLink params, e.g. "reactor1" */
  linkHint?: string;
}

export type ParamValues = Record<string, string | number | boolean>;

export type TemplateCategory =
  | 'Mining & Units'
  | 'Safety & Power'
  | 'Defense'
  | 'Logistics'
  | 'Displays & Info';

export interface Template {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  difficulty: 1 | 2 | 3;
  params: TemplateParam[];
  /** in-game setup instructions shown above the code */
  setupSteps: string[];
  /** preferred: the wizard compiles the graph so code and graph always match */
  buildGraph?(values: ParamValues): GraphDoc;
  /** for hand-tuned mlog beyond the node vocabulary */
  buildIR?(values: ParamValues): IRProgram;
}
