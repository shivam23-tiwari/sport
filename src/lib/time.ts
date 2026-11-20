const IST_TIMEZONE = 'Asia/Kolkata';

export function formatClockIST(iso?: string): string {
  if (!iso) return '--:--:--';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '--:--:--';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: IST_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(d);
}

export function formatMatchTimeIST(iso?: string): string {
  if (!iso) return 'TBD';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'TBD';

  const now = new Date();
  const fmtDate = (date: Date) =>
    new Intl.DateTimeFormat('en-CA', { timeZone: IST_TIMEZONE }).format(date);

  const todayKey = fmtDate(now);
  const tomorrow = new Date(now.getTime() + 86_400_000);
  const tomorrowKey = fmtDate(tomorrow);
  const targetKey = fmtDate(d);

  const timePart = new Intl.DateTimeFormat('en-IN', {
    timeZone: IST_TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d);

  if (targetKey === todayKey) return `Today · ${timePart} IST`;
  if (targetKey === tomorrowKey) return `Tomorrow · ${timePart} IST`;

  const datePart = new Intl.DateTimeFormat('en-IN', {
    timeZone: IST_TIMEZONE,
    month: 'short',
    day: 'numeric',
  }).format(d);

  return `${datePart} · ${timePart} IST`;
}

export function formatRelativeTime(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';

  const diffSec = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Intl.DateTimeFormat('en-IN', {
    timeZone: IST_TIMEZONE,
    month: 'short',
    day: 'numeric',
  }).format(d);
}
