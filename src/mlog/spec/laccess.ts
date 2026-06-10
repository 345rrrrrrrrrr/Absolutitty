// Sensor-readable properties.
// Verified against Anuken/Mindustry: core/src/mindustry/logic/LAccess.java (v7/v8).

export interface SensorProp {
  name: string; // without the leading @
  doc: string;
  appliesTo: 'block' | 'unit' | 'both';
}

export const SENSOR_PROPS: readonly SensorProp[] = [
  { name: 'totalItems', doc: 'total number of items stored', appliesTo: 'both' },
  { name: 'firstItem', doc: 'first item type stored (null when empty)', appliesTo: 'both' },
  { name: 'totalLiquids', doc: 'total liquid stored', appliesTo: 'both' },
  { name: 'totalPower', doc: 'power stored (batteries) or in network', appliesTo: 'block' },
  { name: 'itemCapacity', doc: 'maximum item capacity', appliesTo: 'both' },
  { name: 'liquidCapacity', doc: 'maximum liquid capacity', appliesTo: 'block' },
  { name: 'powerCapacity', doc: 'maximum power storage', appliesTo: 'block' },
  { name: 'powerNetStored', doc: 'power stored in the whole power network', appliesTo: 'block' },
  { name: 'powerNetCapacity', doc: 'power capacity of the whole network', appliesTo: 'block' },
  { name: 'powerNetIn', doc: 'power generated per tick in the network', appliesTo: 'block' },
  { name: 'powerNetOut', doc: 'power consumed per tick in the network', appliesTo: 'block' },
  { name: 'ammo', doc: 'current ammo', appliesTo: 'both' },
  { name: 'ammoCapacity', doc: 'maximum ammo', appliesTo: 'both' },
  { name: 'health', doc: 'current health', appliesTo: 'both' },
  { name: 'maxHealth', doc: 'maximum health', appliesTo: 'both' },
  { name: 'heat', doc: 'heat, 0 to 1 (e.g. thorium reactor — 1 means meltdown)', appliesTo: 'block' },
  { name: 'shield', doc: 'shield strength', appliesTo: 'both' },
  { name: 'armor', doc: 'armor value', appliesTo: 'both' },
  { name: 'efficiency', doc: 'production efficiency, 0 to 1', appliesTo: 'block' },
  { name: 'progress', doc: 'crafting/build progress, 0 to 1', appliesTo: 'block' },
  { name: 'timescale', doc: 'overdrive time-scale multiplier', appliesTo: 'block' },
  { name: 'rotation', doc: 'rotation in degrees (or conveyor direction)', appliesTo: 'both' },
  { name: 'x', doc: 'x position, in tiles', appliesTo: 'both' },
  { name: 'y', doc: 'y position, in tiles', appliesTo: 'both' },
  { name: 'shootX', doc: 'x of the current aim point', appliesTo: 'both' },
  { name: 'shootY', doc: 'y of the current aim point', appliesTo: 'both' },
  { name: 'size', doc: 'footprint size in tiles (blocks) or hitbox size (units)', appliesTo: 'both' },
  { name: 'dead', doc: '1 if dead/destroyed, else 0', appliesTo: 'both' },
  { name: 'range', doc: 'weapon range, in tiles', appliesTo: 'both' },
  { name: 'shooting', doc: '1 while shooting', appliesTo: 'both' },
  { name: 'boosting', doc: '1 while a unit is boosting', appliesTo: 'unit' },
  { name: 'mineX', doc: 'x of the tile being mined', appliesTo: 'unit' },
  { name: 'mineY', doc: 'y of the tile being mined', appliesTo: 'unit' },
  { name: 'mining', doc: '1 while a unit is mining', appliesTo: 'unit' },
  { name: 'speed', doc: 'movement speed', appliesTo: 'unit' },
  { name: 'team', doc: 'team id', appliesTo: 'both' },
  { name: 'type', doc: 'unit or block type (compare with @poly, @duo, ...)', appliesTo: 'both' },
  { name: 'flag', doc: 'numeric flag set with ucontrol flag — used to mark owned units', appliesTo: 'unit' },
  { name: 'controlled', doc: '0 = not controlled, otherwise @ctrlProcessor/@ctrlPlayer/@ctrlCommand', appliesTo: 'unit' },
  { name: 'controller', doc: 'the processor/player controlling this unit', appliesTo: 'unit' },
  { name: 'name', doc: 'name of the controlling player (units)', appliesTo: 'unit' },
  { name: 'payloadCount', doc: 'number of payloads carried', appliesTo: 'unit' },
  { name: 'payloadType', doc: 'type of the first payload', appliesTo: 'unit' },
  { name: 'id', doc: 'numeric content id of the unit/block type', appliesTo: 'both' },
  { name: 'enabled', doc: '1 if the block is enabled (also settable via control)', appliesTo: 'block' },
  { name: 'config', doc: 'current configuration (e.g. item selected in a sorter)', appliesTo: 'block' },
  { name: 'color', doc: 'illuminator color as a packed number', appliesTo: 'block' },
] as const;

export const SENSOR_PROP_NAMES = new Set(SENSOR_PROPS.map((p) => p.name));
