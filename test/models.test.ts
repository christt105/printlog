import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { findModelLink } from '../src/models.ts';
import { makeSandbox, type Sandbox } from './helpers.ts';

let sandbox: Sandbox;
afterEach(() => sandbox.cleanup());

const PREFIX = 'Project Management/Impresora 3D/Modelos';

describe('findModelLink', () => {
  it('matches case-insensitively and ignoring accents, returning the exact basename', async () => {
    sandbox = await makeSandbox();
    await writeFile(join(sandbox.config.modelsDir, 'Soporte Cámara.md'), '');
    await writeFile(join(sandbox.config.modelsDir, 'Other.md'), '');
    expect(await findModelLink(sandbox.config.modelsDir, PREFIX, 'soporte camara')).toBe(`${PREFIX}/Soporte Cámara`);
  });

  it('prefers an exact case-insensitive match over an accent-folded one', async () => {
    sandbox = await makeSandbox();
    await writeFile(join(sandbox.config.modelsDir, 'Cafe.md'), '');
    await writeFile(join(sandbox.config.modelsDir, 'Café.md'), '');
    expect(await findModelLink(sandbox.config.modelsDir, PREFIX, 'café')).toBe(`${PREFIX}/Café`);
  });

  it('finds notes in subfolders and ignores non-markdown files', async () => {
    sandbox = await makeSandbox();
    await mkdir(join(sandbox.config.modelsDir, 'Sub'));
    await writeFile(join(sandbox.config.modelsDir, 'Sub', 'Vase.md'), '');
    await writeFile(join(sandbox.config.modelsDir, 'Cube.stl'), '');
    expect(await findModelLink(sandbox.config.modelsDir, PREFIX, 'Vase')).toBe(`${PREFIX}/Sub/Vase`);
    expect(await findModelLink(sandbox.config.modelsDir, PREFIX, 'Cube')).toBeUndefined();
  });

  it('returns undefined when the folder is missing', async () => {
    sandbox = await makeSandbox();
    expect(await findModelLink(join(sandbox.root, 'nope'), PREFIX, 'x')).toBeUndefined();
  });
});
