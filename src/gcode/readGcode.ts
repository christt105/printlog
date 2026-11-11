import { open } from 'node:fs/promises';
import { parseGcode } from './parseGcode.ts';
import type { PrintMetadata } from './printMetadata.ts';

export const HEAD_BYTES = 64 * 1024;
export const TAIL_BYTES = 256 * 1024;

async function readSlice(path: string, position: number, length: number): Promise<Buffer> {
  const handle = await open(path, 'r');
  try {
    const buffer = Buffer.alloc(length);
    const { bytesRead } = await handle.read(buffer, 0, length, position);
    return buffer.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}

async function fileSize(path: string): Promise<number> {
  const handle = await open(path, 'r');
  try {
    return (await handle.stat()).size;
  } finally {
    await handle.close();
  }
}

/** Reads only the first and last slices of a (possibly huge) G-code file and parses them. */
export async function readGcodeMetadata(path: string): Promise<PrintMetadata> {
  const size = await fileSize(path);
  if (size <= HEAD_BYTES + TAIL_BYTES) {
    return parseGcode((await readSlice(path, 0, size)).toString('utf8'));
  }
  const head = (await readSlice(path, 0, HEAD_BYTES)).toString('utf8');
  const tail = (await readSlice(path, size - TAIL_BYTES, TAIL_BYTES)).toString('utf8');
  const headWhole = head.slice(0, head.lastIndexOf('\n') + 1);
  const tailWhole = tail.slice(tail.indexOf('\n') + 1);
  return parseGcode(headWhole, tailWhole);
}
