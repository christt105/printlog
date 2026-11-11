const DATE_PREFIX = /^(\d{4})-(\d{2})-(\d{2})(?:[\s-]+|$)/;

function localDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function printDate(folderName: string, fallback: Date): string {
  const m = DATE_PREFIX.exec(folderName);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : localDate(fallback);
}

export function modelName(folderName: string): string {
  const stripped = folderName.replace(DATE_PREFIX, '').trim();
  return stripped === '' ? folderName : stripped;
}
