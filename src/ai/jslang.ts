// The AI writes mlogjs-flavored JavaScript; the mlogjs compiler (MIT,
// runs fully in the browser) turns it into guaranteed-wellformed mlog.
// This removes the whole class of "AI hand-writes assembly" mistakes the
// community found: bad jump targets, wrong argument shapes, missing flushes.

import { Compiler } from 'mlogjs';

export interface CompileOutcome {
  mlog?: string;
  error?: string;
}

export function compileJS(source: string): CompileOutcome {
  try {
    const compiler = new Compiler({ compactNames: true });
    const [output, error] = compiler.compile(source);
    if (error) {
      const err = error as Error & { loc?: { line?: number; column?: number } };
      const where = err.loc?.line !== undefined ? ` (line ${err.loc.line})` : '';
      return { error: `${err.message}${where}` };
    }
    return { mlog: String(output).trim() };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

// Condensed, accurate API reference assembled from mlogjs's own type
// declarations (node_modules/mlogjs/lib/commands.d.ts, globals.d.ts).
export const JS_REFERENCE = `You write a SUBSET of JavaScript that the mlogjs compiler turns into Mindustry logic. Available language features: const/let, numbers, strings (only as print/draw text or block names), template literals, if/else, while, for, break/continue, comparison and arithmetic operators, Math.*. NOT available: arrays (except destructuring the documented returns), objects (except the documented option args), string methods, .length, functions you define yourself, async, classes. Use === only for comparing with symbols/content; use == / != for null-ish checks against undefined.

GLOBALS
- getBuilding("name1") — a linked block by its link name (message1, cell1, salvo1, reactor1, vault1, door1, display1...).
- getLink(i) — linked block by index, 0..Vars.links-1.
- Vars: Vars.unit (currently bound unit), Vars.this, Vars.thisx, Vars.thisy, Vars.links, Vars.tick, Vars.time, Vars.second, Vars.minute, Vars.waveNumber, Vars.waveTime, Vars.mapw, Vars.maph.
- Content symbols: Items.copper, Items.lead, Items.graphite, Items.silicon, Items.titanium, Items.thorium, Items.coal, Items.sand, Items.metaglass, Items.plastanium, Items.phaseFabric, Items.surgeAlloy, Items.pyratite, Items.blastCompound, Items.sporePod, Items.scrap; Liquids.water, Liquids.slag, Liquids.oil, Liquids.cryofluid; Units.mono, Units.poly, Units.mega, Units.flare, Units.horizon, Units.zenith, Units.dagger, Units.mace, Units.nova, Units.pulsar, Units.quasar, Units.crawler, Units.atrax; Blocks.coreShard, Blocks.duo, Blocks.salvo (camelCase block names).
- Memory(getBuilding("cell1")) — memory cell as an array: mem[0] = 5; const v = mem[1]; (64 slots, bank1 = 512).

READING PROPERTIES (sensor): buildings and units expose properties directly:
  building.copper, building.totalItems, building.itemCapacity, building.thorium,
  building.cryofluid, building.liquidCapacity, building.totalPower, building.powerCapacity,
  building.health, building.maxHealth, building.heat, building.efficiency, building.enabled,
  building.x, building.y, building.ammo, building.ammoCapacity, building.firstItem, building.type,
  unit.x, unit.y, unit.health, unit.flag, unit.dead, unit.totalItems, unit.itemCapacity,
  unit.firstItem, unit.mining, unit.shooting, unit.boosting, unit.controlled, unit.team.

COMMANDS
- print(value) or print\`text \${value}\`; printFlush(messageBlock) — nothing shows until printFlush.
- draw.clear(r,g,b); draw.color(r,g,b,a); draw.stroke(w); draw.line({x,y,x2,y2}); draw.rect({x,y,width,height}); draw.lineRect({x,y,width,height}); draw.poly({x,y,sides,radius,rotation}); draw.linePoly({...}); draw.triangle({x,y,x2,y2,x3,y3}); draw.image({x,y,image: Items.copper,size,rotation}); drawFlush(displayBlock). Display is 80x80 (display1) or 176x176, origin bottom-left.
- control.enabled(building, boolean); control.config(building, Items.titanium); control.shoot({building, x, y, shoot: true}); control.shootp({building, unit, shoot: true}); control.color(building, packColor(r,g,b,a)).
- radar({building, filters: ["enemy","any","any"], order: 1, sort: "distance"}) → unit or undefined. Filters: any/enemy/ally/player/attacker/flying/boss/ground. Sorts: distance/health/shield/armor/maxHealth. ALWAYS check the result: if (target != undefined) { ... }.
- sensor(LAccess.health, target) — rarely needed; prefer property access.
- wait(seconds); endScript() restarts the program.
- unitBind(Units.poly) then use Vars.unit. Check if (Vars.unit != undefined).
- unitControl.move(x,y); unitControl.approach({x,y,radius}); unitControl.mine(x,y); unitControl.itemDrop(buildingOrAir, amount) — first arg MUST be a building (or Blocks.air to dump), NEVER an item; unitControl.itemTake(building, Items.copper, amount); unitControl.flag(n); unitControl.boost(true); unitControl.target({x,y,shoot:true}); unitControl.targetp({unit, shoot:true}); unitControl.within({x,y,radius}) → boolean; unitControl.idle(); unitControl.stop(); unitControl.unbind(); unitControl.payDrop(); unitControl.payTake({takeUnits:false}); unitControl.payEnter(); unitControl.build({x,y,block: Blocks.duo, rotation, config}); unitControl.getBlock(x,y) → [type, building, floor].
- unitRadar({filters, order, sort}) — radar around the bound unit.
- unitLocate.ore(Items.copper) → [found, x, y]; unitLocate.building({group: "core", enemy: false}) → [found, x, y, building] (groups: core/storage/generator/turret/factory/repair/battery/reactor); unitLocate.spawn() / unitLocate.damaged() → [found, x, y, building]. Needs a bound unit.

PATTERNS (follow these exactly)
- Main loop: while (true) { ... } — or top-level code, which restarts automatically.
- Unit claiming: bind, skip units flagged by other processors:
    unitBind(Units.mono);
    const u = Vars.unit;
    if (u != undefined) {
      const f = u.flag;
      if (f === 0) { unitControl.flag(1); }
      if (f === 0 || f === 1) { /* work with this unit */ }
    }
- Prefer locating a building then reading building.x / building.y over using the raw x,y from unitLocate when approaching big buildings:
    const [found, , , core] = unitLocate.building({group: "core", enemy: false});
    if (found) { unitControl.approach({x: core.x, y: core.y, radius: 5}); }
- enemy: false means YOUR buildings; enemy: true means the enemy's. Re-read the request to pick the right one.`;
