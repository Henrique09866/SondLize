/**
 * Formata o total de segundos escutados em uma string legível.
 * Ex.: 3600 → "1h 0m" | 3661 → "1h 1m" | 125 → "2m 5s"
 */
export const formatListenedTime = (seconds: number): string => {
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};
