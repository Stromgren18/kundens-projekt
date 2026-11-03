import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import type { Project, Status } from "./types";
import {
  loadProjects,
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
  projects: Project[];
  loading: boolean;
  error: string;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useServerFn(loadProjects);
  const runTicket = useServerFn(createTicket);
  const runStatus = useServerFn(setTicketStatus);
  const runProject = useServerFn(createProject);
  const runSub = useServerFn(createSub);
  const runCode = useServerFn(addSubCodeSrv);

  const refresh = async () => {
    try {
      setProjects(await load());
      setError("");
    } catch {
      setError("Kunde inte nå databasen – kontrollera anslutningen och ladda om sidan.");
      throw new Error("load failed");
    }
  };

  useEffect(() => {
    refresh()
      .catch(() => {})
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: Ctx = {
    projects,
    loading,
    error,
    addTicket: async (code, subId, t) => {
      const files = await Promise.all(
        t.files.map(async (f) => ({ name: f.name, dataUrl: await toDataUrl(f) })),
      );
      await runTicket({
        data: {
          projectCode: code,
          subId,
          title: t.title,
          body: t.body,
          notify: t.notify,
          email: t.notify ? t.email : undefined,
          files,
        },
      });
      await refresh().catch(() => {});
    },
    setStatus: (code, subId, id, st) => {
      runStatus({ data: { id, status: st } })
        .then(() => refresh().catch(() => {}))
        .catch(() => setError("Kunde inte uppdatera statusen."));
    },
    addProject: async (name, code) => {
      await runProject({ data: { name, code } });
      await refresh().catch(() => {});
    },
    addSub: async (code, name, subCode) => {
      await runSub({ data: { projectCode: code, name, code: subCode } });
      await refresh().catch(() => {});
    },
    addSubCode: async (code, subId, subCode) => {
      await runCode({ data: { subId, code: subCode } });
      await refresh().catch(() => {});
    },
  };
  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useDemo() {
  const c = useContext(C);
  if (!c) throw new Error("DemoProvider missing");
  return c;
}
