import type { Template } from './types';
import { reactorCutoff } from './reactorCutoff';
import { coreDashboard } from './coreDashboard';
import { enemyAlarm } from './enemyAlarm';
import { gateAutomation } from './gateAutomation';
import { powerSaver } from './powerSaver';
import { waveCountdown } from './waveCountdown';
import { itemFlowControl } from './itemFlowControl';
import { unitMiner } from './unitMiner';
import { turretSupply } from './turretSupply';
import { displayDashboard } from './displayDashboard';

export const TEMPLATES: readonly Template[] = [
  unitMiner,
  reactorCutoff,
  turretSupply,
  enemyAlarm,
  coreDashboard,
  displayDashboard,
  gateAutomation,
  powerSaver,
  waveCountdown,
  itemFlowControl,
];

export function getTemplate(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

export * from './types';
