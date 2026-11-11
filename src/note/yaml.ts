const RESERVED = /^(?:true|false|yes|no|on|off|null|~|y|n)$/i;
const NUMERIC = /^[-+]?(?:\d[\d_]*\.?\d*|\.\d+)(?:e[-+]?\d+)?$|^0x[0-9a-f]+$/i;

/** Renders a YAML scalar, quoting strings only when plain style would be unsafe. */
export function yamlScalar(value: string | number | undefined): string {
  if (value === undefined) return '';
  if (typeof value === 'number') return String(value);
  if (value === '') return '""';
  const unsafe =
    /^[\s\-?:,[\]{}#&*!|>'"%@`]/.test(value) ||
    /\s$/.test(value) ||
    /:(\s|$)/.test(value) ||
    /\s#/.test(value) ||
    /[\n\r\t]/.test(value) ||
    RESERVED.test(value) ||
    NUMERIC.test(value);
  return unsafe ? JSON.stringify(value) : value;
}
