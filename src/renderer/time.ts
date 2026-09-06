const BANGKOK_TIME = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Bangkok',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false
});

export function formatBangkokTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : BANGKOK_TIME.format(date);
}
