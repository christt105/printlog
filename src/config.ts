export interface Config {
  printsDir: string;
  notesDir: string;
  modelsDir: string;
  dataDir: string;
  fileBrowserBaseUrl: string;
  pollIntervalSeconds: number;
  stableSeconds: number;
  modelNotesLinkPrefix: string;
}

function positiveInt(value: string | undefined, fallback: number, name: string): number {
  if (value === undefined || value.trim() === '') return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) throw new Error(`${name} must be a non-negative integer, got "${value}"`);
  return n;
}

export function loadConfig(env: NodeJS.ProcessEnv): Config {
  return {
    printsDir: env.PRINTS_DIR || '/prints',
    notesDir: env.NOTES_DIR || '/notes',
    modelsDir: env.MODELS_DIR || '/models',
    dataDir: env.DATA_DIR || '/data',
    fileBrowserBaseUrl: (env.FILEBROWSER_BASE_URL || '').replace(/\/+$/, ''),
    pollIntervalSeconds: Math.max(1, positiveInt(env.POLL_INTERVAL_SECONDS, 60, 'POLL_INTERVAL_SECONDS')),
    stableSeconds: positiveInt(env.STABLE_SECONDS, 60, 'STABLE_SECONDS'),
    modelNotesLinkPrefix: (env.MODEL_NOTES_LINK_PREFIX || 'Project Management/Impresora 3D/Modelos').replace(/\/+$/, ''),
  };
}
