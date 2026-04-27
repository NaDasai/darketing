// Tiny human-readable formatter for the common cron shapes the
// ScheduleEditor produces. Falls back to the raw expression for anything
// non-standard so users always see *something* meaningful.

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function describeCronShort(expr: string): string {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return expr;
  const [min, hour, dom, mon, dow] = parts;
  if (dom !== '*' || mon !== '*') return expr;

  if (dow === '*' && hour === '*' && min === '0') return 'Hourly';

  const intervalMatch = /^\*\/(\d+)$/.exec(hour);
  if (dow === '*' && intervalMatch && min === '0') {
    return `Every ${intervalMatch[1]}h`;
  }

  if (/^\d+$/.test(min) && /^\d+$/.test(hour)) {
    const m = Number(min);
    const h = Number(hour);
    if (m >= 0 && m < 60 && h >= 0 && h < 24) {
      const time = `${pad2(h)}:${pad2(m)}`;
      if (dow === '*') return `Daily at ${time}`;
      if (/^\d+$/.test(dow)) {
        const d = Number(dow);
        if (d >= 0 && d <= 6) return `${DAYS_SHORT[d]} at ${time}`;
      }
    }
  }

  return expr;
}
