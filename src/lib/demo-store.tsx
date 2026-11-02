import { createContext, useContext, useState, type ReactNode } from "react";

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
export type Sub = { id: string; name: string; codes: string[]; tickets: Ticket[] };
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

const seed = (): Project[] => [
  {
    code: "NORR-ALL",
    name: "Kafé Norrsken",
    client: "Kafé Norrsken",
    subs: [
      {
        id: "s1", name: "Ny webbplats", codes: ["NORR-WEB"],
        tickets: [
          { id: "t1", title: "Byt bild på startsidan", body: "Vi vill ha vinterbilden istället.", images: [], notify: false, status: "Ej läst", createdAt: "2026-10-20" },
          { id: "t2", title: "Uppdatera öppettider", body: "Mån–fre 7–17.", images: [], notify: true, email: "info@norrsken.se", status: "Färdigt", createdAt: "2026-10-18" },
        ],
      },
      {
        id: "s2", name: "Grafisk profil", codes: ["NORR-DESIGN"],
        tickets: [
          { id: "t4", title: "Ny logga till menyn", body: "Ljusare variant behövs.", images: [], notify: false, status: "Påbörjat", createdAt: "2026-10-19" },
        ],
      },
    ],
  },
  {
    code: "FJALL-ALL",
    name: "Fjällbutiken",
    client: "Fjällbutiken",
    subs: [
      {
        id: "s3", name: "Webbshop", codes: ["FJALL-SHOP"],
        tickets: [
          { id: "t3", title: "Lägg till fraktalternativ", body: "Vi behöver ombud-leverans.", images: [], notify: false, status: "Ej läst", createdAt: "2026-10-25" },
        ],
      },
    ],
  },
];

type Ctx = {
  projects: Project[];
  addTicket: (code: string, subId: string, t: Omit<Ticket, "id" | "status" | "createdAt">) => void;
  setStatus: (code: string, subId: string, id: string, s: Status) => void;
  addProject: (name: string, code: string) => void;
  addSub: (code: string, name: string, subCode: string) => void;
  addSubCode: (code: string, subId: string, subCode: string) => void;
};
const C = createContext<Ctx | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>(seed);
  const editSub = (code: string, subId: string, f: (s: Sub) => Sub) =>
    setProjects((ps) => ps.map((p) => (p.code === code ? { ...p, subs: p.subs.map((s) => (s.id === subId ? f(s) : s)) } : p)));

  const value: Ctx = {
    projects,
    addTicket: (code, subId, t) =>
      editSub(code, subId, (s) => ({
        ...s,
        tickets: [{ ...t, id: String(Date.now()), status: "Ej läst", createdAt: new Date().toISOString().slice(0, 10) }, ...s.tickets],
      })),
    setStatus: (code, subId, id, st) =>
      editSub(code, subId, (s) => ({ ...s, tickets: s.tickets.map((t) => (t.id === id ? { ...t, status: st } : t)) })),
    addProject: (name, code) =>
      setProjects((ps) => [...ps, { code: code.trim().toUpperCase(), name, client: name, subs: [] }]),
    addSub: (code, name, subCode) =>
      setProjects((ps) =>
        ps.map((p) =>
          p.code === code ? { ...p, subs: [...p.subs, { id: "s" + Date.now(), name, codes: [subCode.trim().toUpperCase()], tickets: [] }] } : p,
        ),
      ),
    addSubCode: (code, subId, subCode) => editSub(code, subId, (s) => ({ ...s, codes: [...s.codes, subCode.trim().toUpperCase()] })),
  };
  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useDemo() {
  const c = useContext(C);
  if (!c) throw new Error("DemoProvider missing");
  return c;
}
