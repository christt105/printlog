import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

export function normalizeName(name: string): string {
  return name.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

async function listNotes(dir: string, relative: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const found: string[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const rel = relative === '' ? entry.name : `${relative}/${entry.name}`;
    if (entry.isDirectory()) found.push(...(await listNotes(join(dir, entry.name), rel)));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) found.push(rel.slice(0, -3));
  }
  return found;
}

/**
 * Finds the model note matching a model name and returns its vault link target
 * (prefix plus path relative to the models folder, without extension).
 * Returns undefined when nothing matches or the folder is unreadable.
 */
export async function findModelLink(modelsDir: string, prefix: string, name: string): Promise<string | undefined> {
  let notes: string[];
  try {
    notes = await listNotes(modelsDir, '');
  } catch {
    return undefined;
  }
  const wanted = normalizeName(name);
  const exact = notes.find((n) => n.split('/').pop()!.toLowerCase() === name.toLowerCase());
  const match = exact ?? notes.find((n) => normalizeName(n.split('/').pop()!) === wanted);
  return match === undefined ? undefined : `${prefix}/${match}`;
}
