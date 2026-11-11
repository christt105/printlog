import { chmod, rename, unlink, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';

export async function atomicWrite(path: string, content: string): Promise<void> {
  const temp = join(dirname(path), `.${basename(path)}.tmp`);
  try {
    await writeFile(temp, content, { encoding: 'utf8', flag: 'w' });
    await chmod(temp, 0o644);
    await rename(temp, path);
  } catch (error) {
    await unlink(temp).catch(() => {});
    throw error;
  }
}
