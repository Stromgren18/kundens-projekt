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
export type Project = { code: string; name: string; client: string; tickets: Ticket[] };

export const unreadCount = (p: Project) => p.tickets.filter((t) => t.status === "Ej läst").length;

const seed = (): Project[] => [
  {
    code: "NORR-2026",
    name: "Ny webbplats",
    client: "Kafé Norrsken",
    tickets: [
      { id: "t1", title: "Byt bild på startsidan", body: "Vi vill ha vinterbilden istället.", images: [], notify: false, status: "Ej läst", createdAt: "2026-10-20" },
      { id: "t4", title: "Lägg till meny som PDF", body: "Ladda upp nya lunchmenyn.", images: [], notify: false, status: "Påbörjat", createdAt: "2026-10-19" },
      { id: "t2", title: "Uppdatera öppettider", body: "Mån–fre 7–17.", images: [], notify: true, email: "info@norrsken.se", status: "Färdigt", createdAt: "2026-10-18" },
    ],
  },
  {
    code: "FJALL-42",
    name: "Webbshop",
    client: "Fjällbutiken",
    tickets: [
      { id: "t3", title: "Lägg till fraktalternativ", body: "Vi behöver ombud-leverans.", images: [], notify: false, status: "Bekräftat", createdAt: "2026-10-25" },
    ],
  },
];

type Ctx = {
  projects: Project[];
  addTicket: (code: string, t: Omit<Ticket, "id" | "status" | "createdAt">) => void;
  setStatus: (code: string, id: string, s: Status) => void;
};
const C = createContext<Ctx | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>(seed);
  const addTicket: Ctx["addTicket"] = (code, t) =>
    setProjects((ps) =>
      ps.map((p) =>
        p.code === code
          ? { ...p, tickets: [{ ...t, id: String(Date.now()), status: "Ej läst", createdAt: new Date().toISOString().slice(0, 10) }, ...p.tickets] }
          : p,
      ),
    );
  const setStatus: Ctx["setStatus"] = (code, id, s) =>
    setProjects((ps) =>
      ps.map((p) => (p.code === code ? { ...p, tickets: p.tickets.map((t) => (t.id === id ? { ...t, status: s } : t)) } : p)),
    );
  return <C.Provider value={{ projects, addTicket, setStatus }}>{children}</C.Provider>;
}

export function useDemo() {
  const c = useContext(C);
  if (!c) throw new Error("DemoProvider missing");
  return c;
}
