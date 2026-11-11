import { formatDuration } from './formatDuration.ts';
import type { PrintMetadata } from './printMetadata.ts';

const BED_KEY_BY_TYPE: Record<string, string> = {
  'cool plate': 'cool_plate_temp',
  'engineering plate': 'eng_plate_temp',
  'high temp plate': 'hot_plate_temp',
  'textured pei plate': 'textured_plate_temp',
};

const COMMENT_LINE = /^;\s*([^=:]+?)\s*[=:]\s*(.*?)\s*$/;

function unquote(value: string): string {
  const v = value.trim();
  return v.length >= 2 && v.startsWith('"') && v.endsWith('"') ? v.slice(1, -1) : v;
}

function numberList(value: string | undefined): number[] {
  if (value === undefined) return [];
  return unquote(value)
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter((s) => s !== '')
    .map(Number)
    .filter((n) => Number.isFinite(n));
}

function firstNumber(value: string | undefined): number | undefined {
  return numberList(value)[0];
}

function collectComments(text: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith(';')) continue;
    const match = COMMENT_LINE.exec(line);
    if (!match) continue;
    map.set(match[1]!.toLowerCase(), match[2]!);
  }
  return map;
}

function bedTemperature(comments: Map<string, string>, head: string): number | undefined {
  const bedType = unquote(comments.get('curr_bed_type') ?? '').toLowerCase();
  const key = BED_KEY_BY_TYPE[bedType];
  const fromPlate = key ? firstNumber(comments.get(key)) : undefined;
  if (fromPlate !== undefined) return fromPlate;
  const fromGeneric = firstNumber(comments.get('bed_temperature'));
  if (fromGeneric !== undefined) return fromGeneric;
  const m = /^\s*M(?:140|190)\s[^;\n]*?S(\d+(?:\.\d+)?)/m.exec(head);
  return m ? Number(m[1]) : undefined;
}

/** Extracts print metadata from the head and tail slices of an OrcaSlicer G-code file. */
export function parseGcode(head: string, tail: string = ''): PrintMetadata {
  const comments = collectComments(`${head}\n${tail}`);
  const result: PrintMetadata = {};

  const time = comments.get('estimated printing time (normal mode)') ?? comments.get('estimated printing time');
  const tiempo = time === undefined ? undefined : formatDuration(time);
  if (tiempo !== undefined) result.tiempo = tiempo;

  const grams = numberList(comments.get('filament used [g]'));
  if (grams.length > 0) result.gramos = Math.round(grams.reduce((a, b) => a + b, 0) * 100) / 100;

  const layer = firstNumber(comments.get('layer_height'));
  if (layer !== undefined) result.altura_capa = layer;

  const nozzle = firstNumber(comments.get('nozzle_temperature'));
  if (nozzle !== undefined) result.boquilla = nozzle;

  const bed = bedTemperature(comments, head);
  if (bed !== undefined) result.cama = bed;

  const filamentId = comments.get('filament_settings_id');
  if (filamentId !== undefined) {
    const name = unquote(filamentId).split(/\s+@/)[0]!.trim();
    if (name !== '') result.filamento = name;
  }
  return result;
}
