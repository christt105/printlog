export interface Logger {
  info(message: string): void;
  error(message: string): void;
}

export const consoleLogger: Logger = {
  info: (message) => console.log(`${new Date().toISOString()} INFO ${message}`),
  error: (message) => console.error(`${new Date().toISOString()} ERROR ${message}`),
};
