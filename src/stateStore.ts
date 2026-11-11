import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { atomicWrite } from './atomicWrite.ts';

export class StateStore {
  private readonly file: string;
  private readonly processed = new Set<string>();

  constructor(dataDir: string) {
    this.file = join(dataDir, 'processed.json');
  }

  async load(): Promise<void> {
    let raw: string;
    try {
      raw = await readFile(this.file, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
      throw error;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.some((v) => typeof v !== 'string')) {
      throw new Error(`${this.file} must contain a JSON array of folder names`);
    }
    for (const name of parsed as string[]) this.processed.add(name);
  }

  has(folder: string): boolean {
    return this.processed.has(folder);
  }

  async add(folder: string): Promise<void> {
    await mkdir(join(this.file, '..'), { recursive: true });
    const next = new Set(this.processed).add(folder);
    await atomicWrite(this.file, `${JSON.stringify([...next], null, 2)}\n`);
    this.processed.add(folder);
  }
}
