import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { formatDuration } from '../src/gcode/formatDuration.ts';
import { parseGcode } from '../src/gcode/parseGcode.ts';

const fixture = readFileSync(new URL('./fixtures/orca-sample.gcode', import.meta.url), 'utf8');

describe('parseGcode', () => {
  it('extracts every field from the fixture', () => {
    expect(parseGcode(fixture)).toEqual({
      tiempo: '1h 23m',
      gramos: 12.34,
      altura_capa: 0.2,
      boquilla: 210,
      cama: 65,
      filamento: 'Generic PLA',
    });
  });

  it('works with separate head and tail slices', () => {
    const lines = fixture.split('\n');
    const result = parseGcode(lines.slice(0, 15).join('\n'), lines.slice(-25).join('\n'));
    expect(result.gramos).toBe(12.34);
    expect(result.tiempo).toBe('1h 23m');
  });

  it('returns an empty object when nothing is present', () => {
    expect(parseGcode('G28\nG1 X1 Y1\n')).toEqual({});
  });

  it('accepts colon separators', () => {
    const r = parseGcode('; layer_height: 0.16\n; filament used [g]: 5.5\n; estimated printing time (normal mode): 45m 10s\n');
    expect(r).toMatchObject({ altura_capa: 0.16, gramos: 5.5, tiempo: '45m' });
  });

  it('takes the first list item for temperatures and sums grams', () => {
    const r = parseGcode('; nozzle_temperature = 215,200\n; filament used [g] = 1.005,2.5\n');
    expect(r.boquilla).toBe(215);
    expect(r.gramos).toBe(3.51);
  });

  it('selects the bed temperature by plate type', () => {
    const base = '; cool_plate_temp = 35\n; eng_plate_temp = 80\n; hot_plate_temp = 90\n; textured_plate_temp = 70\n';
    expect(parseGcode(`${base}; curr_bed_type = Cool Plate\n`).cama).toBe(35);
    expect(parseGcode(`${base}; curr_bed_type = Engineering Plate\n`).cama).toBe(80);
    expect(parseGcode(`${base}; curr_bed_type = High Temp Plate\n`).cama).toBe(90);
    expect(parseGcode(`${base}; curr_bed_type = Textured PEI Plate\n`).cama).toBe(70);
  });

  it('falls back to bed_temperature, then to M140/M190', () => {
    expect(parseGcode('; curr_bed_type = Unknown\n; bed_temperature = 55,55\n').cama).toBe(55);
    expect(parseGcode('M104 S150\nM140 S62\nM190 S62\n').cama).toBe(62);
    expect(parseGcode('M190 S58\n').cama).toBe(58);
  });

  it('never uses M104 or M109 for the nozzle', () => {
    expect(parseGcode('M104 S150\nM109 S210\n').boquilla).toBeUndefined();
  });

  it('strips the profile suffix and quotes from the filament', () => {
    expect(parseGcode('; filament_settings_id = "Bambu PETG HF @BBL X1C"\n').filamento).toBe('Bambu PETG HF');
    expect(parseGcode('; filament_settings_id = Plain PLA\n').filamento).toBe('Plain PLA');
  });

  it('ignores non-numeric values', () => {
    expect(parseGcode('; layer_height = abc\n; nozzle_temperature = nil\n')).toEqual({});
  });
});

describe('formatDuration', () => {
  it('formats hours, minutes and drops seconds', () => {
    expect(formatDuration('1h 23m 45s')).toBe('1h 23m');
    expect(formatDuration('59m 59s')).toBe('59m');
    expect(formatDuration('2h')).toBe('2h 0m');
    expect(formatDuration('45s')).toBe('0m');
  });

  it('folds days into hours', () => {
    expect(formatDuration('1d 2h 3m 4s')).toBe('26h 3m');
  });

  it('rejects text without durations', () => {
    expect(formatDuration('soon')).toBeUndefined();
  });
});
