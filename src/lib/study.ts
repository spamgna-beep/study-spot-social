export const MAX_SESSION_SECONDS = 60 * 60 * 12;
export const LIVE_WINDOW_MS = 1000 * 60 * 2;

export function clampStudySeconds(seconds: number | null | undefined) {
  if (!Number.isFinite(seconds)) return 0;
  return Math.max(0, Math.min(Number(seconds), MAX_SESSION_SECONDS));
}

export function getWeekStartDate(date: Date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

export function formatHoursAndMinutes(totalSeconds: number) {
  const safeSeconds = clampStudySeconds(totalSeconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.round((safeSeconds % 3600) / 60);

  if (hours === 0) return `${minutes}m`;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

export function formatLiveDuration(startedAt: string, nowMs: number = Date.now()) {
  const elapsedSeconds = Math.max(0, Math.floor((nowMs - new Date(startedAt).getTime()) / 1000));
  return formatHoursAndMinutes(elapsedSeconds);
}

export function isRecentlySeen(lastSeenAt: string | null | undefined, nowMs: number = Date.now()) {
  if (!lastSeenAt) return false;
  const seenMs = new Date(lastSeenAt).getTime();
  if (Number.isNaN(seenMs)) return false;
  return nowMs - seenMs <= LIVE_WINDOW_MS;
}

export function formatCountdown(targetDate: string | null | undefined) {
  if (!targetDate) return '0m';
  const diffMs = new Date(targetDate).getTime() - Date.now();
  if (diffMs <= 0) return '0m';

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

export function toLocalDateTimeInputValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}