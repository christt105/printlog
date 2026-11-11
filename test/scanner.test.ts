import { copyFile, mkdir, readdir, readFile, rm, stat, utimes, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { Scanner } from '../src/scanner.ts';
import { StateStore } from '../src/stateStore.ts';
import { makeSandbox, memoryLogger, type Sandbox } from './helpers.ts';

const fixture = new URL('./fixtures/orca-sample.gcode', import.meta.url);
let sandbox: Sandbox;
afterEach(() => sandbox.cleanup());

async function setup(overrides = {}) {
  sandbox = await makeSandbox(overrides);
  const state = new StateStore(sandbox.config.dataDir);
  await state.load();
  const logger = memoryLogger();
  const clock = { t: 1_000_000 };
  const scanner = new Scanner(sandbox.config, state, logger, () => clock.t);
  return { scanner, logger, clock, config: sandbox.config };
}

async function addPrint(printsDir: string, folder: string, gcodeName = 'model.gcode') {
  const dir = join(printsDir, folder);
  await mkdir(dir, { recursive: true });
  await copyFile(fixture, join(dir, gcodeName));
  return dir;
}

describe('Scanner', () => {
  it('creates a note once the gcode has been stable', async () => {
    const { scanner, clock, config, logger } = await setup();
    await addPrint(config.printsDir, '2026-11-12 Test de primera capa');
    await writeFile(join(config.modelsDir, 'Test de primera capa.md'), '');

    await scanner.scanOnce();
    expect(await readdir(config.notesDir)).toEqual([]);

    clock.t += 59_000;
    await scanner.scanOnce();
    expect(await readdir(config.notesDir)).toEqual([]);

    clock.t += 1_000;
    await scanner.scanOnce();
    const note = await readFile(join(config.notesDir, '2026-11-12 Test de primera capa.md'), 'utf8');
    expect(note).toContain('fecha: 2026-11-12\n');
    expect(note).toContain('modelo: "[[Project Management/Impresora 3D/Modelos/Test de primera capa]]"\n');
    expect(note).toContain('carpeta: http://nas/files/Prints/2026-11-12%20Test%20de%20primera%20capa\n');
    expect(note).toContain('gramos: 12.34\n');
    expect(logger.infos).toEqual(['created note 2026-11-12 Test de primera capa.md']);
  });

  it('restarts the stability wait when the file changes', async () => {
    const { scanner, clock, config } = await setup();
    const dir = await addPrint(config.printsDir, '2026-11-12 A');
    await scanner.scanOnce();
    clock.t += 50_000;
    await writeFile(join(dir, 'model.gcode'), 'G28\n');
    await scanner.scanOnce();
    clock.t += 50_000;
    await scanner.scanOnce();
    expect(await readdir(config.notesDir)).toEqual([]);
    clock.t += 10_000;
    await scanner.scanOnce();
    expect(await readdir(config.notesDir)).toEqual(['2026-11-12 A.md']);
  });

  it('never overwrites an existing note', async () => {
    const { scanner, clock, config, logger } = await setup();
    await addPrint(config.printsDir, '2026-11-12 A');
    await writeFile(join(config.notesDir, '2026-11-12 A.md'), 'mine');
    await scanner.scanOnce();
    clock.t += 60_000;
    await scanner.scanOnce();
    expect(await readFile(join(config.notesDir, '2026-11-12 A.md'), 'utf8')).toBe('mine');
    expect(logger.infos).toEqual(['skipped 2026-11-12 A: note already exists']);
  });

  it('does not recreate a note recorded in the state file', async () => {
    const { clock, config } = await setup();
    await addPrint(config.printsDir, '2026-11-12 A');
    await writeFile(join(config.dataDir, 'processed.json'), JSON.stringify(['2026-11-12 A']));
    const state = new StateStore(config.dataDir);
    await state.load();
    const fresh = new Scanner(config, state, memoryLogger(), () => clock.t);
    await fresh.scanOnce();
    clock.t += 120_000;
    await fresh.scanOnce();
    expect(await readdir(config.notesDir)).toEqual([]);
  });

  it('persists processed folders and does not recreate a deleted note', async () => {
    const { scanner, clock, config } = await setup();
    await addPrint(config.printsDir, '2026-11-12 A');
    await scanner.scanOnce();
    clock.t += 60_000;
    await scanner.scanOnce();
    expect(JSON.parse(await readFile(join(config.dataDir, 'processed.json'), 'utf8'))).toEqual(['2026-11-12 A']);
    await rm(join(config.notesDir, '2026-11-12 A.md'));
    clock.t += 60_000;
    await scanner.scanOnce();
    expect(await readdir(config.notesDir)).toEqual([]);
  });

  it('ignores folders without gcode and plain files', async () => {
    const { scanner, clock, config } = await setup();
    await mkdir(join(config.printsDir, 'empty'));
    await writeFile(join(config.printsDir, 'empty', 'model.3mf'), 'x');
    await writeFile(join(config.printsDir, 'stray.gcode'), 'x');
    await scanner.scanOnce();
    clock.t += 120_000;
    await scanner.scanOnce();
    expect(await readdir(config.notesDir)).toEqual([]);
  });

  it('uses the newest gcode, matches the extension case-insensitively and falls back to mtime for the date', async () => {
    const { scanner, clock, config } = await setup({ fileBrowserBaseUrl: '' });
    const dir = await addPrint(config.printsDir, 'Benchy', 'old.gcode');
    await writeFile(join(dir, 'NEW.GCODE'), '; layer_height = 0.28\n');
    await utimes(join(dir, 'old.gcode'), new Date(2020, 0, 1), new Date(2020, 0, 1));
    await utimes(join(dir, 'NEW.GCODE'), new Date(2026, 5, 7, 12), new Date(2026, 5, 7, 12));
    await scanner.scanOnce();
    clock.t += 60_000;
    await scanner.scanOnce();
    const note = await readFile(join(config.notesDir, 'Benchy.md'), 'utf8');
    expect(note).toContain('fecha: 2026-06-07\n');
    expect(note).toContain('altura_capa: 0.28\n');
    expect(note).toContain('\ncarpeta:\n');
    expect(note).toContain('\nmodelo:\n');
  });

  it('leaves no temp file behind', async () => {
    const { scanner, clock, config } = await setup();
    await addPrint(config.printsDir, '2026-11-12 A');
    await scanner.scanOnce();
    clock.t += 60_000;
    await scanner.scanOnce();
    const names = await readdir(config.notesDir);
    expect(names.filter((n) => n.includes('.tmp'))).toEqual([]);
    expect((await readdir(config.dataDir)).filter((n) => n.includes('.tmp'))).toEqual([]);
    expect((await stat(join(config.notesDir, '2026-11-12 A.md'))).mode & 0o777).toBe(0o644);
  });

  it('logs a failure once per folder state and keeps going', async () => {
    const { scanner, clock, config, logger } = await setup();
    await addPrint(config.printsDir, '2026-11-12 A');
    await addPrint(config.printsDir, '2026-11-12 B');
    await rm(config.notesDir, { recursive: true });
    await scanner.scanOnce();
    clock.t += 60_000;
    await scanner.scanOnce();
    clock.t += 60_000;
    await scanner.scanOnce();
    expect(logger.errors).toHaveLength(2);
    expect(logger.errors[0]).toMatch(/^failed 2026-11-12 A:/);
  });

  it('survives a malformed gcode', async () => {
    const { scanner, clock, config } = await setup();
    const dir = await addPrint(config.printsDir, '2026-11-12 A');
    await writeFile(join(dir, 'model.gcode'), Buffer.from([0xff, 0xfe, 0x00, 0x3b, 0x3d]));
    await scanner.scanOnce();
    clock.t += 60_000;
    await scanner.scanOnce();
    expect(await readdir(config.notesDir)).toEqual(['2026-11-12 A.md']);
  });

  it('survives a missing prints directory', async () => {
    const { scanner, logger, config } = await setup();
    await rm(config.printsDir, { recursive: true });
    await scanner.scanOnce();
    await scanner.scanOnce();
    expect(logger.errors).toHaveLength(1);
  });
});
