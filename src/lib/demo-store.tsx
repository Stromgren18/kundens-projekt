import { createContext, useContext, useState, type ReactNode } from "react";

export type Ticket = {
  id: string;
  title: string;
  body: string;
  images: string[];
  notify: boolean;
  email?: string | undefined;
  done: boolean;
  createdAt: string;
};
export type Project = { code: string; name: string; client: string; tickets: Ticket[] };

const seed = (): Project[] => [
  {
    code: "NORR-2026",
    name: "Ny webbplats",
    client: "Kafé Norrsken",
    tickets: [
      { id: "t1", title: "Byt bild på startsidan", body: "Vi vill ha vinterbilden istället.", images: [], notify: false, done: false, createdAt: "2026-10-20" },
      { id: "t2", title: "Uppdatera öppettider", body: "Mån–fre 7–17.", images: [], notify: true, email: "info@norrsken.se", done: true, createdAt: "2026-10-18" },
    ],
  },
  {
    code: "FJALL-42",
    name: "Webbshop",
    client: "Fjällbutiken",
    tickets: [
      { id: "t3", title: "Lägg till fraktalternativ", body: "Vi behöver ombud-leverans.", images: [], notify: false, done: false, createdAt: "2026-10-25" },
    ],
  },
];

type Ctx = {
  projects: Project[];
  addTicket: (code: string, t: Omit<Ticket, "id" | "done" | "createdAt">) => void;
  toggleDone: (code: string, id: string) => void;
};
const C = createContext<Ctx | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>(seed);
  const addTicket: Ctx["addTicket"] = (code, t) =>
    setProjects((ps) =>
      ps.map((p) =>
        p.code === code
          ? { ...p, tickets: [{ ...t, id: String(Date.now()), done: false, createdAt: new Date().toISOString().slice(0, 10) }, ...p.tickets] }
          : p,
      ),
    );
  const toggleDone: Ctx["toggleDone"] = (code, id) =>
    setProjects((ps) =>
      ps.map((p) => (p.code === code ? { ...p, tickets: p.tickets.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) } : p)),
    );
  return <C.Provider value={{ projects, addTicket, toggleDone }}>{children}</C.Provider>;
}

export function useDemo() {
  const c = useContext(C);
  if (!c) throw new Error("DemoProvider missing");
  return c;
}
