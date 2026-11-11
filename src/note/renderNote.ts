import type { PrintMetadata } from '../gcode/printMetadata.ts';
import { yamlScalar } from './yaml.ts';

export interface NoteInput {
  folderName: string;
  fecha: string;
  modelo?: string;
  carpeta?: string;
  metadata: PrintMetadata;
}

function line(key: string, value: string | number | undefined): string {
  const rendered = yamlScalar(value);
  return rendered === '' ? `${key}:` : `${key}: ${rendered}`;
}

export function renderNote(input: NoteInput): string {
  const { metadata } = input;
  const lines = [
    '---',
    'type: print',
    'project: "[[Impresora 3D]]"',
    input.modelo ? `modelo: ${JSON.stringify(`[[${input.modelo}]]`)}` : 'modelo:',
    line('fecha', input.fecha),
    'resultado:',
    'calidad:',
    line('filamento', metadata.filamento),
    line('boquilla', metadata.boquilla),
    line('cama', metadata.cama),
    line('altura_capa', metadata.altura_capa),
    line('tiempo', metadata.tiempo),
    line('gramos', metadata.gramos),
    line('carpeta', input.carpeta),
    'fotos: []',
    'cover:',
    'tags: []',
    '---',
    `# ${input.folderName}`,
    '',
    '## Bien',
    '',
    '## Mal',
    '',
    '## La próxima vez',
    '',
  ];
  return lines.join('\n');
}
