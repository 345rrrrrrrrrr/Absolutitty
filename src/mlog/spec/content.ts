// Game content names usable as @constants, plus link short-names for linkable blocks.
// Names follow Anuken/Mindustry content definitions (Serpulo + Erekir, v7/v8).

export interface ContentEntry {
  name: string; // the @name, without @
  label: string; // human-friendly label for dropdowns
  planet?: 'serpulo' | 'erekir';
}

export const ITEMS: readonly ContentEntry[] = [
  { name: 'copper', label: 'Copper' },
  { name: 'lead', label: 'Lead' },
  { name: 'metaglass', label: 'Metaglass' },
  { name: 'graphite', label: 'Graphite' },
  { name: 'sand', label: 'Sand' },
  { name: 'coal', label: 'Coal' },
  { name: 'titanium', label: 'Titanium' },
  { name: 'thorium', label: 'Thorium' },
  { name: 'scrap', label: 'Scrap' },
  { name: 'silicon', label: 'Silicon' },
  { name: 'plastanium', label: 'Plastanium' },
  { name: 'phase-fabric', label: 'Phase Fabric' },
  { name: 'surge-alloy', label: 'Surge Alloy' },
  { name: 'spore-pod', label: 'Spore Pod' },
  { name: 'blast-compound', label: 'Blast Compound' },
  { name: 'pyratite', label: 'Pyratite' },
  { name: 'beryllium', label: 'Beryllium', planet: 'erekir' },
  { name: 'tungsten', label: 'Tungsten', planet: 'erekir' },
  { name: 'oxide', label: 'Oxide', planet: 'erekir' },
  { name: 'carbide', label: 'Carbide', planet: 'erekir' },
] as const;

export const LIQUIDS: readonly ContentEntry[] = [
  { name: 'water', label: 'Water' },
  { name: 'slag', label: 'Slag' },
  { name: 'oil', label: 'Oil' },
  { name: 'cryofluid', label: 'Cryofluid' },
  { name: 'neoplasm', label: 'Neoplasm', planet: 'erekir' },
  { name: 'arkycite', label: 'Arkycite', planet: 'erekir' },
  { name: 'ozone', label: 'Ozone', planet: 'erekir' },
  { name: 'hydrogen', label: 'Hydrogen', planet: 'erekir' },
  { name: 'nitrogen', label: 'Nitrogen', planet: 'erekir' },
  { name: 'cyanogen', label: 'Cyanogen', planet: 'erekir' },
] as const;

export const UNITS: readonly ContentEntry[] = [
  // Serpulo — support
  { name: 'mono', label: 'Mono (auto-miner)' },
  { name: 'poly', label: 'Poly (builder/miner)' },
  { name: 'mega', label: 'Mega (heavy support, flying)' },
  { name: 'quad', label: 'Quad' },
  { name: 'oct', label: 'Oct' },
  // Serpulo — ground attack
  { name: 'dagger', label: 'Dagger' },
  { name: 'mace', label: 'Mace' },
  { name: 'fortress', label: 'Fortress' },
  { name: 'scepter', label: 'Scepter' },
  { name: 'reign', label: 'Reign' },
  { name: 'nova', label: 'Nova (mech, can boost)' },
  { name: 'pulsar', label: 'Pulsar (mech, mines)' },
  { name: 'quasar', label: 'Quasar (mech, mines)' },
  { name: 'vela', label: 'Vela' },
  { name: 'corvus', label: 'Corvus' },
  { name: 'crawler', label: 'Crawler' },
  { name: 'atrax', label: 'Atrax' },
  { name: 'spiroct', label: 'Spiroct' },
  { name: 'arkyid', label: 'Arkyid' },
  { name: 'toxopid', label: 'Toxopid' },
  // Serpulo — air attack
  { name: 'flare', label: 'Flare (fast, flying)' },
  { name: 'horizon', label: 'Horizon (bomber)' },
  { name: 'zenith', label: 'Zenith' },
  { name: 'antumbra', label: 'Antumbra' },
  { name: 'eclipse', label: 'Eclipse' },
  // Erekir
  { name: 'stell', label: 'Stell', planet: 'erekir' },
  { name: 'locus', label: 'Locus', planet: 'erekir' },
  { name: 'precept', label: 'Precept', planet: 'erekir' },
  { name: 'elude', label: 'Elude', planet: 'erekir' },
  { name: 'avert', label: 'Avert', planet: 'erekir' },
] as const;

// Linkable blocks commonly referenced from logic + the short name used for links
// (linking a block names it shortName + number, e.g. "cell1", "switch1", "duo2").
export interface LinkableBlock extends ContentEntry {
  shortName: string;
}

export const LINKABLE_BLOCKS: readonly LinkableBlock[] = [
  { name: 'message', label: 'Message', shortName: 'message' },
  { name: 'switch', label: 'Switch', shortName: 'switch' },
  { name: 'memory-cell', label: 'Memory Cell (64 slots)', shortName: 'cell' },
  { name: 'memory-bank', label: 'Memory Bank (512 slots)', shortName: 'bank' },
  { name: 'logic-display', label: 'Logic Display (80×80)', shortName: 'display' },
  { name: 'large-logic-display', label: 'Large Logic Display (176×176)', shortName: 'display' },
  { name: 'illuminator', label: 'Illuminator', shortName: 'illuminator' },
  { name: 'duo', label: 'Duo turret', shortName: 'duo' },
  { name: 'scatter', label: 'Scatter turret', shortName: 'scatter' },
  { name: 'scorch', label: 'Scorch turret', shortName: 'scorch' },
  { name: 'hail', label: 'Hail turret', shortName: 'hail' },
  { name: 'wave', label: 'Wave turret', shortName: 'wave' },
  { name: 'lancer', label: 'Lancer turret', shortName: 'lancer' },
  { name: 'arc', label: 'Arc turret', shortName: 'arc' },
  { name: 'salvo', label: 'Salvo turret', shortName: 'salvo' },
  { name: 'swarmer', label: 'Swarmer turret', shortName: 'swarmer' },
  { name: 'cyclone', label: 'Cyclone turret', shortName: 'cyclone' },
  { name: 'ripple', label: 'Ripple turret', shortName: 'ripple' },
  { name: 'fuse', label: 'Fuse turret', shortName: 'fuse' },
  { name: 'spectre', label: 'Spectre turret', shortName: 'spectre' },
  { name: 'meltdown', label: 'Meltdown turret', shortName: 'meltdown' },
  { name: 'foreshadow', label: 'Foreshadow turret', shortName: 'foreshadow' },
  { name: 'thorium-reactor', label: 'Thorium Reactor', shortName: 'reactor' },
  { name: 'impact-reactor', label: 'Impact Reactor', shortName: 'reactor' },
  { name: 'battery', label: 'Battery', shortName: 'battery' },
  { name: 'battery-large', label: 'Large Battery', shortName: 'battery' },
  { name: 'container', label: 'Container', shortName: 'container' },
  { name: 'vault', label: 'Vault', shortName: 'vault' },
  { name: 'unloader', label: 'Unloader', shortName: 'unloader' },
  { name: 'sorter', label: 'Sorter', shortName: 'sorter' },
  { name: 'conveyor', label: 'Conveyor', shortName: 'conveyor' },
  { name: 'titanium-conveyor', label: 'Titanium Conveyor', shortName: 'conveyor' },
  { name: 'door', label: 'Door', shortName: 'door' },
  { name: 'blast-door', label: 'Blast Door', shortName: 'door' },
  { name: 'mechanical-drill', label: 'Mechanical Drill', shortName: 'drill' },
  { name: 'pneumatic-drill', label: 'Pneumatic Drill', shortName: 'drill' },
  { name: 'laser-drill', label: 'Laser Drill', shortName: 'drill' },
  { name: 'airblast-drill', label: 'Airblast Drill', shortName: 'drill' },
  { name: 'mend-projector', label: 'Mend Projector', shortName: 'projector' },
  { name: 'force-projector', label: 'Force Projector', shortName: 'projector' },
  { name: 'overdrive-projector', label: 'Overdrive Projector', shortName: 'projector' },
  { name: 'cultivator', label: 'Cultivator', shortName: 'cultivator' },
  { name: 'core-shard', label: 'Core: Shard', shortName: 'core' },
  { name: 'core-foundation', label: 'Core: Foundation', shortName: 'core' },
  { name: 'core-nucleus', label: 'Core: Nucleus', shortName: 'core' },
] as const;

// ulocate building groups (BlockFlag values usable in `ulocate building <group> ...`)
export const BUILDING_GROUPS = [
  'core', 'storage', 'generator', 'turret', 'factory', 'repair', 'battery', 'reactor',
] as const;

export const RADAR_FILTERS = ['any', 'enemy', 'ally', 'player', 'attacker', 'flying', 'boss', 'ground'] as const;
export const RADAR_SORTS = ['distance', 'health', 'shield', 'armor', 'maxHealth'] as const;

const ALL_CONTENT_NAMES = new Set<string>([
  ...ITEMS.map((i) => i.name),
  ...LIQUIDS.map((l) => l.name),
  ...UNITS.map((u) => u.name),
  ...LINKABLE_BLOCKS.map((b) => b.name),
]);

export function isKnownContent(name: string): boolean {
  return ALL_CONTENT_NAMES.has(name);
}
