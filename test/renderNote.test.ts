import { describe, expect, it } from 'vitest';
import { renderNote } from '../src/note/renderNote.ts';
import { yamlScalar } from '../src/note/yaml.ts';

const full = `---
type: print
project: "[[Impresora 3D]]"
modelo: "[[Project Management/Impresora 3D/Modelos/Test de primera capa]]"
fecha: 2026-11-12
resultado:
calidad:
filamento: Generic PLA
boquilla: 210
cama: 60
altura_capa: 0.2
tiempo: 1h 23m
gramos: 12.34
carpeta: http://192.168.1.15:8900/files/Disco/30-39_Creativo/31_3D_Modeling_Printing/31.04_Impresiones/2026-11-12%20Test%20de%20primera%20capa
fotos: []
cover:
tags: []
---
# 2026-11-12 Test de primera capa

## Bien

## Mal

## La próxima vez
`;

describe('renderNote', () => {
  it('renders the exact template', () => {
    expect(
      renderNote({
        folderName: '2026-11-12 Test de primera capa',
        fecha: '2026-11-12',
        modelo: 'Project Management/Impresora 3D/Modelos/Test de primera capa',
        carpeta:
          'http://192.168.1.15:8900/files/Disco/30-39_Creativo/31_3D_Modeling_Printing/31.04_Impresiones/2026-11-12%20Test%20de%20primera%20capa',
        metadata: { filamento: 'Generic PLA', boquilla: 210, cama: 60, altura_capa: 0.2, tiempo: '1h 23m', gramos: 12.34 },
      }),
    ).toBe(full);
  });

  it('leaves unknown values empty', () => {
    const out = renderNote({ folderName: 'x', fecha: '2026-01-01', metadata: {} });
    expect(out).toContain('modelo:\n');
    expect(out).toContain('\nfilamento:\n');
    expect(out).toContain('\ncarpeta:\n');
    expect(out).toContain('\ngramos:\n');
  });
});

describe('yamlScalar', () => {
  it('keeps safe strings plain', () => {
    expect(yamlScalar('Generic PLA')).toBe('Generic PLA');
    expect(yamlScalar('1h 23m')).toBe('1h 23m');
    expect(yamlScalar('http://a/b%20c')).toBe('http://a/b%20c');
  });

  it('quotes unsafe strings', () => {
    expect(yamlScalar('a: b')).toBe('"a: b"');
    expect(yamlScalar('@pla')).toBe('"@pla"');
    expect(yamlScalar('#tag')).toBe('"#tag"');
    expect(yamlScalar('say "hi"')).toBe('say "hi"');
    expect(yamlScalar('"quoted"')).toBe('"\\"quoted\\""');
    expect(yamlScalar('- item')).toBe('"- item"');
    expect(yamlScalar('x #y')).toBe('"x #y"');
    expect(yamlScalar('true')).toBe('"true"');
    expect(yamlScalar('12')).toBe('"12"');
    expect(yamlScalar('')).toBe('""');
  });

  it('leaves numbers unquoted', () => {
    expect(yamlScalar(0.2)).toBe('0.2');
  });
});
