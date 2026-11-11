import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { readGcodeMetadata } from '../src/gcode/readGcode.ts';
import { makeSandbox, type Sandbox } from './helpers.ts';

let sandbox: Sandbox;
afterEach(() => sandbox.cleanup());

describe('readGcodeMetadata', () => {
  it('reads head and tail of a large file without the middle', async () => {
    sandbox = await makeSandbox();
    const middle = 'G1 X1 Y1 E1\n'.repeat(100_000);
    const text = `; layer_height = 0.12\n${middle}; filament used [g] = 7.5\n; estimated printing time (normal mode) = 3h 5m 9s\n`;
    const file = join(sandbox.root, 'big.gcode');
    await writeFile(file, text);
    expect(text.length).toBeGreaterThan(1_000_000);
    expect(await readGcodeMetadata(file)).toEqual({ altura_capa: 0.12, gramos: 7.5, tiempo: '3h 5m' });
  });
});
