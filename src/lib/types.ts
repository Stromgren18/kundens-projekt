export const STATUSES = ["Ej läst", "Bekräftat", "Påbörjat", "Färdigt"] as const;
export type Status = (typeof STATUSES)[number];

export type Ticket = {
  id: string;
  title: string;
  body: string;
  images: string[];
  notify: boolean;
  email?: string | undefined;
  status: Status;
  createdAt: string;
};
export type Sub = { id: string; name: string; codes: string[]; tickets: Ticket[]; archived?: boolean };
export type Project = { code: string; name: string; client: string; subs: Sub[] };

export const allTickets = (p: Project) => p.subs.flatMap((s) => s.tickets);
export const unreadCount = (p: Project | Sub) =>
  ("subs" in p ? allTickets(p) : p.tickets).filter((t) => t.status === "Ej läst").length;

/** Resolves a login code: main code gives all subs, sub code gives only that sub. */
export function resolveCode(projects: Project[], raw: string): { project: Project; subIds: string[] } | null {
  const c = raw.trim().toUpperCase();
  for (const p of projects) {
    if (p.code === c) return { project: p, subIds: p.subs.map((s) => s.id) };
    const s = p.subs.find((s) => s.codes.includes(c));
    if (s) return { project: p, subIds: [s.id] };
  }
  return null;
}

export const codeTaken = (projects: Project[], c: string) => resolveCode(projects, c) !== null;
