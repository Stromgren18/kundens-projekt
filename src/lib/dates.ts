// Browser-safe date helpers (no Supabase, no server code) so they can be unit tested.
// Ticket dates arrive as "YYYY-MM-DD". Comparing them as UTC calendar days keeps the
// count stable no matter which timezone the browser is in, and a ticket created today
// always reads "Idag" instead of a negative number.

const DAY = 864e5;

function dayNumber(y: number, m: number, d: number) {
  return Math.round(Date.UTC(y, m, d) / DAY);
}

/** Whole calendar days between the ticket date and today. Never negative. */
export function daysSince(createdAt: string, now: number = Date.now()): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(createdAt ?? "");
  if (!m) return 0;
  const then = dayNumber(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(now);
  const today = dayNumber(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.max(0, today - then);
}

/** Swedish label for an age in days: "Idag", "Igår", "3 dagar sedan". */
export function ageLabel(days: number): string {
  if (days <= 0) return "Idag";
  if (days === 1) return "Igår";
  return `${days} dagar sedan`;
}
