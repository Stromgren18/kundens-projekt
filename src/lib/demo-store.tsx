import { createContext, useContext, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import type { Project, Status } from "./types";
import {
  loadProjects,
  loadByCode,
  createTicket,
  setTicketStatus,
  createProject,
  createSub,
  addSubCode as addSubCodeSrv,
} from "./db.functions";

export * from "./types";

export type NewTicket = {
  title: string;
  body: string;
  files: File[];
  notify: boolean;
  email?: string | undefined;
};

type Ctx = {
  /** Admin: all projects. Customer: only the project their code opens. */
  projects: Project[];
  loading: boolean;
  error: string;
  isAdmin: boolean;
  setAdminToken: (t: string | null) => Promise<void>;
  openCode: (code: string) => Promise<{ project: Project; subIds: string[] } | null>;
  addTicket: (code: string, subId: string, t: NewTicket) => Promise<void>;
  setStatus: (code: string, subId: string, id: string, s: Status) => void;
  addProject: (name: string, code: string) => Promise<void>;
  addSub: (code: string, name: string, subCode: string) => Promise<void>;
  addSubCode: (code: string, subId: string, subCode: string) => Promise<void>;
};

const C = createContext<Ctx | null>(null);

const toDataUrl = (f: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error(`Kunde inte läsa filen ${f.name}`));
    r.readAsDataURL(f);
  });

export function DemoProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [custCode, setCustCode] = useState<string | null>(null);

  const loadAll = useServerFn(loadProjects);
  const loadCode = useServerFn(loadByCode);
  const runTicket = useServerFn(createTicket);
  const runStatus = useServerFn(setTicketStatus);
  const runProject = useServerFn(createProject);
  const runSub = useServerFn(createSub);
  const runCode = useServerFn(addSubCodeSrv);

  const refresh = async (tok = token, code = custCode) => {
    try {
      if (tok) setProjects(await loadAll({ data: { token: tok } }));
      else if (code) {
        const p = await loadCode({ data: { code } });
        setProjects(p ? [p] : []);
      }
      setError("");
    } catch {
      setError("Kunde inte nå databasen – försök igen.");
    }
  };

  const need = () => {
    if (!token) throw new Error("Inte inloggad");
    return token;
  };

  const value: Ctx = {
    projects,
    loading,
    error,
    isAdmin: !!token,
    setAdminToken: async (t) => {
      setToken(t);
      setProjects([]);
      if (t) { setLoading(true); await refresh(t, null); setLoading(false); }
    },
    openCode: async (code) => {
      setLoading(true);
      try {
        const p = await loadCode({ data: { code } });
        if (!p) return null;
        setCustCode(code);
        setProjects([p]);
        return { project: p, subIds: p.subs.map((s) => s.id) };
      } finally { setLoading(false); }
    },
    addTicket: async (code, subId, t) => {
      const files = await Promise.all(
        t.files.map(async (f) => ({ name: f.name, dataUrl: await toDataUrl(f) })),
      );
      const login = custCode ?? code;
      await runTicket({
        data: {
          projectCode: login,
          subId,
          title: t.title,
          body: t.body,
          notify: t.notify,
          email: t.notify ? t.email : undefined,
          files,
        },
      });
      await refresh();
    },
    setStatus: (_code, _subId, id, st) => {
      runStatus({ data: { token: need(), id, status: st } })
        .then(() => refresh())
        .catch(() => setError("Kunde inte uppdatera statusen."));
    },
    addProject: async (name, code) => {
      await runProject({ data: { token: need(), name, code } });
      await refresh();
    },
    addSub: async (code, name, subCode) => {
      await runSub({ data: { token: need(), projectCode: code, name, code: subCode } });
      await refresh();
    },
    addSubCode: async (_code, subId, subCode) => {
      await runCode({ data: { token: need(), subId, code: subCode } });
      await refresh();
    },
  };
  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useDemo() {
  const c = useContext(C);
  if (!c) throw new Error("DemoProvider missing");
  return c;
}
