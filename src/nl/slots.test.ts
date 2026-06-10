import { describe, it, expect } from 'vitest';
import { normalize, extractSlots } from './slots';

const slots = (text: string) => extractSlots(normalize(text));

describe('slot extraction', () => {
  it('finds items, with plurals', () => {
    const s = slots('mine some coppers and lead');
    expect(s.items.map((i) => i.name)).toEqual(['copper', 'lead']);
  });

  it('keeps token order for "copper and lead"', () => {
    const s = slots('show lead and copper amounts');
    expect(s.items.map((i) => i.name)).toEqual(['lead', 'copper']);
  });

  it('matches multi-word entities like phase fabric and thorium reactor', () => {
    const s = slots('move phase fabric near the thorium reactor');
    expect(s.items.map((i) => i.name)).toContain('phase-fabric');
    expect(s.blocks.map((b) => b.name)).toContain('thorium-reactor');
    expect(s.blocks[0].linkName).toBe('reactor1');
  });

  it('maps units with plurals and counts', () => {
    const s = slots('use 5 flares to carry stuff');
    expect(s.units[0].name).toBe('flare');
    expect(s.units[0].count).toBe(5);
  });

  it('maps monos via plural', () => {
    expect(slots('make my monos work').units[0]?.name).toBe('mono');
  });

  it('maps turret names to link names', () => {
    const s = slots('keep my salvos loaded');
    expect(s.blocks[0].name).toBe('salvo');
    expect(s.blocks[0].linkName).toBe('salvo1');
  });

  it('understands synonyms: gate→door, screen→display', () => {
    const s = slots('close the gates and put it on the screen');
    expect(s.blocks.map((b) => b.name)).toEqual(expect.arrayContaining(['door', 'logic-display']));
  });

  it('parses "below 20%" as a percent threshold', () => {
    const s = slots('turn it off below 20%');
    expect(s.numbers[0]).toMatchObject({ value: 20, isPercent: true, comparator: 'below' });
  });

  it('parses "drops under 15"', () => {
    const s = slots('when coolant drops under 15');
    expect(s.numbers[0]).toMatchObject({ value: 15, comparator: 'below' });
    expect(s.flags.has('coolant')).toBe(true);
  });

  it('parses "more than 200"', () => {
    expect(slots('when there is more than 200 copper').numbers[0]).toMatchObject({ value: 200, comparator: 'above' });
  });

  it('parses "between 100 and 200"', () => {
    const s = slots('keep stock between 100 and 200');
    expect(s.numbers.map((n) => ({ v: n.value, c: n.comparator }))).toEqual([
      { v: 100, c: 'above' },
      { v: 200, c: 'below' },
    ]);
  });

  it('collects context flags', () => {
    const s = slots('warn me when enemies come and ammo is low');
    expect(s.flags.has('enemy')).toBe(true);
    expect(s.flags.has('ammo')).toBe(true);
    expect(s.flags.has('low')).toBe(true);
  });
});
