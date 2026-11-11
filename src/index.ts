import { loadConfig } from './config.ts';
import { consoleLogger } from './logger.ts';
import { Scanner } from './scanner.ts';
import { StateStore } from './stateStore.ts';

const config = loadConfig(process.env);
const state = new StateStore(config.dataDir);
await state.load();
const scanner = new Scanner(config, state, consoleLogger);

let stopping = false;
let timer: NodeJS.Timeout | undefined;
let running: Promise<void> = Promise.resolve();

function schedule(): void {
  if (stopping) return;
  timer = setTimeout(() => {
    running = scanner.scanOnce().finally(schedule);
  }, config.pollIntervalSeconds * 1000);
}

async function shutdown(signal: string): Promise<void> {
  if (stopping) return;
  stopping = true;
  if (timer) clearTimeout(timer);
  consoleLogger.info(`received ${signal}, shutting down`);
  await running;
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

consoleLogger.info(`watching ${config.printsDir} every ${config.pollIntervalSeconds}s, notes in ${config.notesDir}`);
running = scanner.scanOnce().finally(schedule);
