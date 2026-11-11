import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Config } from '../src/config.ts';
import type { Logger } from '../src/logger.ts';

export interface Sandbox {
  root: string;
  config: Config;
  cleanup(): Promise<void>;
}

export async function makeSandbox(overrides: Partial<Config> = {}): Promise<Sandbox> {
  const root = await mkdtemp(join(tmpdir(), 'printlog-'));
  const config: Config = {
    printsDir: join(root, 'prints'),
    notesDir: join(root, 'notes'),
    modelsDir: join(root, 'models'),
    dataDir: join(root, 'data'),
    fileBrowserBaseUrl: 'http://nas/files/Prints',
    pollIntervalSeconds: 60,
    stableSeconds: 60,
    modelNotesLinkPrefix: 'Project Management/Impresora 3D/Modelos',
    ...overrides,
  };
  for (const dir of [config.printsDir, config.notesDir, config.modelsDir, config.dataDir]) await mkdir(dir, { recursive: true });
  return { root, config, cleanup: () => rm(root, { recursive: true, force: true }) };
}

export function memoryLogger(): Logger & { infos: string[]; errors: string[] } {
  const infos: string[] = [];
  const errors: string[] = [];
  return { infos, errors, info: (m) => infos.push(m), error: (m) => errors.push(m) };
}
