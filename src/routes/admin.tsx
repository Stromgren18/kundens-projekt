import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useDemo, unreadCount, allTickets, codeTaken, STATUSES, type Status } from "@/lib/demo-store";
import { TicketList, statusStyle } from "./index";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin – Projektportal" },
      { name: "description", content: "Hantera kundernas projekt, underprojekt och ärenden." },
      { property: "og:title", content: "Admin – Projektportal" },
      { property: "og:description", content: "Hantera kundernas projekt, underprojekt och ärenden." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Admin,
});

const inp = "rounded-xl border-2 border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary";
const btn = "rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:brightness-110";

function Admin() {
  const { projects, setStatus, addProject, addSub, addSubCode } = useDemo();
  const [in_, setIn] = useState(false);
  const [sel, setSel] = useState(projects[0]?.code ?? "");
  const [subSel, setSubSel] = useState<string>("");
  const [filter, setFilter] = useState<"Alla" | Status>("Alla");
  const [np, setNp] = useState({ name: "", code: "" });
  const [ns, setNs] = useState({ name: "", code: "" });
  const [nc, setNc] = useState<Record<string, string>>({});
  const [err, setErr] = useState("");
  const project = projects.find((p) => p.code === sel);
  const sub = project?.subs.find((s) => s.id === subSel) ?? project?.subs[0];

  const check = (c: string) => {
    if (!c.trim()) return false;
    if (codeTaken(projects, c)) { setErr(`Koden ${c.toUpperCase()} används redan.`); return false; }
    setErr(""); return true;
  };

  if (!in_)
    return (
      <main className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--gradient-hero)" }}>
        <form onSubmit={(e) => { e.preventDefault(); setIn(true); }} className="w-full max-w-sm space-y-3 rounded-3xl bg-card p-7" style={{ boxShadow: "var(--shadow-pop)" }}>
          <h1 className="text-2xl font-bold">Admininloggning</h1>
          <input placeholder="E-post" className={`w-full ${inp}`} />
          <input type="password" placeholder="Lösenord" className={`w-full ${inp}`} />
          <button className={`w-full ${btn}`}>Logga in (demo)</button>
          <Link to="/" className="block text-center text-sm underline text-muted-foreground">Tillbaka</Link>
        </form>
      </main>
    );

  return (
    <main className="min-h-screen">
      <header className="text-graphite-foreground" style={{ background: "var(--gradient-hero)" }}>
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-10">
          <h1 className="text-4xl">Admin<span className="text-primary">.</span></h1>
          <button onClick={() => setIn(false)} className="text-sm underline opacity-70">Logga ut</button>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-6 pb-16">
        {err && <p className="mt-6 rounded-xl bg-destructive/10 px-4 py-2 text-sm text-destructive">{err}</p>}

        <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-2xl">Alla projekt</h2>
          <form className="flex flex-wrap gap-2" onSubmit={(e) => {
            e.preventDefault();
            if (!np.name.trim() || !check(np.code)) return;
            addProject(np.name, np.code); setSel(np.code.trim().toUpperCase()); setSubSel(""); setNp({ name: "", code: "" });
          }}>
            <input value={np.name} onChange={(e) => setNp({ ...np, name: e.target.value })} placeholder="Projektnamn" className={inp} />
            <input value={np.code} onChange={(e) => setNp({ ...np, code: e.target.value })} placeholder="HUVUDKOD" className={`${inp} uppercase`} />
            <button className={btn}>+ Nytt projekt</button>
          </form>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => {
            const unread = unreadCount(p);
            const ts = allTickets(p);
            return (
              <button key={p.code} onClick={() => { setSel(p.code); setSubSel(""); }} className={`relative rounded-2xl bg-card p-5 text-left transition hover:-translate-y-0.5 ${p.code === sel ? "ring-2 ring-primary" : "ring-1 ring-border"}`} style={{ boxShadow: p.code === sel ? "var(--shadow-pop)" : undefined }}>
                {unread > 0 && <span className="absolute -right-2 -top-2 flex h-7 min-w-7 items-center justify-center rounded-full bg-primary px-2 text-sm font-bold text-primary-foreground animate-bounce" title="Olästa ärenden">{unread}</span>}
                <p className="text-xs font-semibold uppercase tracking-widest text-primary">{p.code}</p>
                <h3 className="mt-1 text-lg">{p.name}</h3>
                <p className="text-sm text-muted-foreground">{p.subs.length} underprojekt</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {STATUSES.map((s) => <span key={s} className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusStyle[s].badge}`}>{s}: {ts.filter((t) => t.status === s).length}</span>)}
                </div>
              </button>
            );
          })}
        </div>

        <Overview onOpen={(code, subId) => { setSel(code); setSubSel(subId); }} />

        {project && (
          <>
            <h2 className="mt-10 text-2xl">{project.name} – underprojekt</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {project.subs.map((s) => {
                const u = unreadCount(s);
                return (
                  <div key={s.id} onClick={() => setSubSel(s.id)} className={`relative cursor-pointer rounded-2xl bg-card p-4 transition ${s.id === sub?.id ? "ring-2 ring-primary" : "ring-1 ring-border"}`}>
                    {u > 0 && <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">{u}</span>}
                    <h3 className="text-lg">{s.name}</h3>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {s.codes.map((c) => <span key={c} className="rounded-md bg-graphite px-2 py-0.5 font-mono text-xs text-graphite-foreground">{c}</span>)}
                    </div>
                    <form className="mt-3 flex gap-2" onClick={(e) => e.stopPropagation()} onSubmit={(e) => {
                      e.preventDefault();
                      const c = nc[s.id] ?? "";
                      if (!check(c)) return;
                      addSubCode(project.code, s.id, c); setNc({ ...nc, [s.id]: "" });
                    }}>
                      <input value={nc[s.id] ?? ""} onChange={(e) => setNc({ ...nc, [s.id]: e.target.value })} placeholder="NY KOD" className={`${inp} w-full uppercase`} />
                      <button className="rounded-xl bg-secondary px-3 text-sm font-semibold text-secondary-foreground">+ Kod</button>
                    </form>
                  </div>
                );
              })}
              <form className="flex flex-col gap-2 rounded-2xl border-2 border-dashed border-primary/40 p-4" onSubmit={(e) => {
                e.preventDefault();
                if (!ns.name.trim() || !check(ns.code)) return;
                addSub(project.code, ns.name, ns.code); setNs({ name: "", code: "" });
              }}>
                <p className="font-semibold">Nytt underprojekt</p>
                <input value={ns.name} onChange={(e) => setNs({ ...ns, name: e.target.value })} placeholder="Namn" className={inp} />
                <input value={ns.code} onChange={(e) => setNs({ ...ns, code: e.target.value })} placeholder="UNDERKOD" className={`${inp} uppercase`} />
                <button className={btn}>+ Lägg till</button>
              </form>
            </div>

            {sub && (
              <>
                <h2 className="mt-10 text-2xl">{sub.name} – ärenden</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(["Alla", ...STATUSES] as const).map((f) => (
                    <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3 py-1 text-xs font-semibold ${filter === f ? "bg-graphite text-graphite-foreground" : "bg-secondary text-secondary-foreground"}`}>{f}</button>
                  ))}
                </div>
                <TicketList
                  tickets={filter === "Alla" ? sub.tickets : sub.tickets.filter((t) => t.status === filter)}
                  onStatus={(id, s) => setStatus(project.code, sub.id, id, s)}
                />
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
