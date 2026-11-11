/** Normalizes "1d 2h 3m 4s" style durations to "Xh Ym" (seconds dropped, days folded into hours). */
export function formatDuration(raw: string): string | undefined {
  const parts = [...raw.matchAll(/(\d+(?:\.\d+)?)\s*([dhms])/gi)];
  if (parts.length === 0) return undefined;
  let seconds = 0;
  for (const [, amount, unit] of parts) {
    const n = Number(amount);
    const factor = { d: 86400, h: 3600, m: 60, s: 1 }[unit!.toLowerCase() as 'd' | 'h' | 'm' | 's'];
    seconds += n * factor;
  }
  const totalMinutes = Math.floor(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}
