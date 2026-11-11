import { access, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { atomicWrite } from './atomicWrite.ts';
import type { Config } from './config.ts';
import { modelName, printDate } from './folderName.ts';
import { readGcodeMetadata } from './gcode/readGcode.ts';
import type { Logger } from './logger.ts';
import { findModelLink } from './models.ts';
import { renderNote } from './note/renderNote.ts';
import type { StateStore } from './stateStore.ts';

interface Observation {
  signature: string;
  since: number;
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export class Scanner {
  private readonly observations = new Map<string, Observation>();
  private readonly reportedErrors = new Map<string, string>();

  private readonly config: Config;
  private readonly state: StateStore;
  private readonly logger: Logger;
  private readonly now: () => number;

  constructor(config: Config, state: StateStore, logger: Logger, now: () => number = Date.now) {
    this.config = config;
    this.state = state;
    this.logger = logger;
    this.now = now;
  }

  /** Runs one pass over the prints folder; never throws. */
  async scanOnce(): Promise<void> {
    let entries;
    try {
      entries = await readdir(this.config.printsDir, { withFileTypes: true });
    } catch (error) {
      this.reportOnce('<prints dir>', 'unreadable', `cannot read ${this.config.printsDir}: ${describe(error)}`);
      return;
    }
    this.reportedErrors.delete('<prints dir>');
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.') || this.state.has(entry.name)) continue;
      try {
        await this.processFolder(entry.name);
      } catch (error) {
        this.reportOnce(entry.name, describe(error), `failed ${entry.name}: ${describe(error)}`);
      }
    }
  }

  private async newestGcode(folder: string): Promise<{ path: string; size: number; mtimeMs: number } | undefined> {
    const dir = join(this.config.printsDir, folder);
    const names = (await readdir(dir)).filter((n) => n.toLowerCase().endsWith('.gcode') && !n.startsWith('.'));
    let best: { path: string; size: number; mtimeMs: number } | undefined;
    for (const name of names) {
      const path = join(dir, name);
      const s = await stat(path);
      if (s.isFile() && (best === undefined || s.mtimeMs > best.mtimeMs)) best = { path, size: s.size, mtimeMs: s.mtimeMs };
    }
    return best;
  }

  private async processFolder(folder: string): Promise<void> {
    const gcode = await this.newestGcode(folder);
    if (gcode === undefined) {
      this.observations.delete(folder);
      return;
    }
    const signature = `${gcode.path}:${gcode.size}:${gcode.mtimeMs}`;
    const now = this.now();
    const seen = this.observations.get(folder);
    if (seen === undefined || seen.signature !== signature) {
      this.observations.set(folder, { signature, since: now });
      this.reportedErrors.delete(folder);
      if (this.config.stableSeconds > 0) return;
    } else if (now - seen.since < this.config.stableSeconds * 1000) {
      return;
    }

    const notePath = join(this.config.notesDir, `${folder}.md`);
    if (await exists(notePath)) {
      await this.state.add(folder);
      this.logger.info(`skipped ${folder}: note already exists`);
      return;
    }

    const metadata = await readGcodeMetadata(gcode.path);
    const name = modelName(folder);
    const modelo = await findModelLink(this.config.modelsDir, this.config.modelNotesLinkPrefix, name);
    const carpeta = this.config.fileBrowserBaseUrl
      ? `${this.config.fileBrowserBaseUrl}/${encodeURIComponent(folder)}`
      : undefined;
    const note = renderNote({
      folderName: folder,
      fecha: printDate(folder, new Date(gcode.mtimeMs)),
      modelo,
      carpeta,
      metadata,
    });
    await atomicWrite(notePath, note);
    await this.state.add(folder);
    this.logger.info(`created note ${folder}.md`);
  }

  private reportOnce(key: string, fingerprint: string, message: string): void {
    const signature = `${this.observations.get(key)?.signature ?? ''}|${fingerprint}`;
    if (this.reportedErrors.get(key) === signature) return;
    this.reportedErrors.set(key, signature);
    this.logger.error(message);
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
