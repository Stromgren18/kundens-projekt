import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useDemo, unreadCount, allTickets, codeTaken, STATUSES, type Status } from "@/lib/demo-store";
import { TicketList, NewTicketForm } from "./index";
import { Overview } from "@/components/AdminOverview";
import { useServerFn } from "@tanstack/react-start";
import { adminSignIn, adminSetPassword, adminRefresh } from "@/lib/auth.functions";

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

const REFRESH_KEY = "fn-admin-refresh";
const inp = "rounded-xl border-2 border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary";
const btn = "rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-60";

function AdminLogin({ onIn }: { onIn: (token: string, refresh?: string | null) => void }) {
  const signIn = useServerFn(adminSignIn);
  const setPw = useServerFn(adminSetPassword);
  const [token, setToken] = useState("");
  const [refreshTok, setRefreshTok] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPwVal] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const h = new URLSearchParams(window.location.hash.slice(1));
    const t = h.get("access_token");
    if (t && (h.get("type") === "invite" || h.get("type") === "recovery")) { setToken(t); setRefreshTok(h.get("refresh_token") ?? ""); }
    if (h.get("error_description")) setMsg(h.get("error_description") ?? "");
  }, []);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setMsg("");
    try {
      if (token) {
        const r = await setPw({ data: { accessToken: token, refresh: refreshTok || undefined, password: pw } });
        window.history.replaceState(null, "", "/admin");
        onIn(r.token, r.refresh);
      } else {
        const r = await signIn({ data: { email, password: pw } });
        onIn(r.token, r.refresh);
      }
    } catch (er) { setMsg(er instanceof Error ? er.message : "Något gick fel"); }
    finally { setBusy(false); }
  };
  return (
    <main className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--gradient-hero)" }}>
      <form onSubmit={submit} className="w-full max-w-sm space-y-3 rounded-3xl bg-card p-7" style={{ boxShadow: "var(--shadow-pop)" }}>
        <h1 className="text-2xl font-bold">{token ? "Välj lösenord" : "Admininloggning"}</h1>
        {!token && <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-post" className={`w-full ${inp}`} />}
        <input type="password" required minLength={token ? 8 : 1} value={pw} onChange={(e) => setPwVal(e.target.value)} placeholder={token ? "Nytt lösenord (minst 8 tecken)" : "Lösenord"} className={`w-full ${inp}`} />
        {msg && <p className="text-sm text-destructive">{msg}</p>}
        <button disabled={busy} className={`w-full ${btn}`}>{busy ? "Vänta…" : token ? "Spara och logga in" : "Logga in"}</button>
        <Link to="/" className="block text-center text-sm underline text-muted-foreground">Tillbaka</Link>
      </form>
    </main>
  );
}

function Admin() {
  const { projects, setStatus, addProject, addSub, addSubCode, archiveSub, moveTicket, renameProject, archiveProject, removeProject, removeSub, setTime, sendUpdate, isAdmin, setAdminToken, error } = useDemo();
  const [showArchived, setShowArchived] = useState(false);
  const [showArchivedP, setShowArchivedP] = useState(false);
  const [sel, setSel] = useState("");
  const [subSel, setSubSel] = useState<string>("all");
  const [filter, setFilter] = useState<"Alla" | Status>("Alla");
  const [np, setNp] = useState({ name: "", code: "" });
  const [ns, setNs] = useState({ name: "", code: "" });
  const [nc, setNc] = useState<Record<string, string>>({});
  const [newOpen, setNewOpen] = useState(false);
  const [settings, setSettings] = useState(false);
  const [newTicket, setNewTicket] = useState(false);
  const [err, setErr] = useState("");
  const [restoring, setRestoring] = useState(true);
  const refreshFn = useServerFn(adminRefresh);
  useEffect(() => {
    const saved = localStorage.getItem(REFRESH_KEY);
    if (!saved || isAdmin) { setRestoring(false); return; }
    refreshFn({ data: { refresh: saved } })
      .then((r) => { localStorage.setItem(REFRESH_KEY, r.refresh); return setAdminToken(r.token); })
      .catch(() => localStorage.removeItem(REFRESH_KEY))
      .finally(() => setRestoring(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [sel]);
  const project = projects.find((p) => p.code === sel);
  const open = (code: string, subId = "all") => { setSel(code); setSubSel(subId); setFilter("Alla"); setSettings(false); setNewTicket(false); setErr(""); };

  const check = (c: string) => {
    if (!c.trim()) return false;
    if (codeTaken(projects, c)) { setErr(`Koden ${c.toUpperCase()} används redan.`); return false; }
    setErr(""); return true;
  };

  if (!isAdmin && restoring) return <main className="min-h-screen flex items-center justify-center text-muted-foreground">Loggar in…</main>;
  if (!isAdmin) return <AdminLogin onIn={(t, r) => { if (r) localStorage.setItem(REFRESH_KEY, r); void setAdminToken(t); }} />;

  const activeProjects = projects.filter((p) => !p.archived);
  const activeTickets = activeProjects.flatMap((p) => p.subs.filter((s) => !s.archived).flatMap((s) => s.tickets));
  const unreadTotal = activeTickets.filter((t) => t.status === "Ej läst").length;
  const urgentTotal = activeTickets.filter((t) => t.urgent && t.status !== "Färdigt").length;
  const openTotal = activeTickets.filter((t) => t.status !== "Färdigt").length;

  const header = (
    <header className="text-graphite-foreground" style={{ background: "var(--gradient-hero)" }}>
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-8">
        <button onClick={() => setSel("")} className="text-4xl">Admin<span className="text-primary">.</span></button>
        <button onClick={() => { localStorage.removeItem(REFRESH_KEY); void setAdminToken(null); }} className="text-sm underline opacity-70">Logga ut</button>
      </div>
    </header>
  );
  const errBox = (err || error) && <p className="mt-6 rounded-xl bg-destructive/10 px-4 py-2 text-sm text-destructive">{err || error}</p>;

  if (!project) {
    return (
      <main className="min-h-screen">
        {header}
        <div className="mx-auto max-w-5xl px-6 pb-16">
          {errBox}
          <div className="mt-8 grid grid-cols-3 gap-3">
            {[["Olästa", unreadTotal, true], ["Akuta", urgentTotal, true], ["Öppna ärenden", openTotal, false]].map(([l, n, hl]) => (
              <div key={String(l)} className={`rounded-2xl p-4 ring-1 ring-border ${hl && Number(n) > 0 ? "bg-primary text-primary-foreground" : "bg-card"}`}>
                <p className="text-3xl font-bold">{String(n)}</p>
                <p className="text-sm opacity-80">{String(l)}</p>
              </div>
            ))}
          </div>

          <Overview onOpen={(code, subId) => open(code, subId)} />

          <div className="mt-12 flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-2xl">Kunder</h2>
            <button onClick={() => setNewOpen(!newOpen)} className={btn}>{newOpen ? "Avbryt" : "+ Ny kund"}</button>
          </div>
          {newOpen && (
            <form className="mt-3 flex flex-wrap gap-2 rounded-2xl bg-card p-4 ring-1 ring-border" onSubmit={(e) => {
              e.preventDefault();
              if (!np.name.trim() || !check(np.code)) return;
              addProject(np.name, np.code)
                .then(() => { setNp({ name: "", code: "" }); setNewOpen(false); open(np.code.trim().toUpperCase()); })
                 .catch((e) => setErr(e instanceof Error ? e.message : "Kunde inte skapa kunden"));
            }}>
              <input autoFocus value={np.name} onChange={(e) => setNp({ ...np, name: e.target.value })} placeholder="Kundnamn" className={inp} />
              <input value={np.code} onChange={(e) => setNp({ ...np, code: e.target.value })} placeholder="HUVUDKOD" className={`${inp} uppercase`} />
              <button className={btn}>Skapa</button>
            </form>
          )}
          {projects.length === 0 && <p className="mt-4 text-sm text-muted-foreground">Inga kunder ännu – lägg till din första ovan.</p>}
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {projects.filter((p) => showArchivedP || !p.archived).map((p) => {
              const active = { ...p, subs: p.subs.filter((s) => !s.archived) };
              const unread = p.archived ? 0 : unreadCount(active);
              const openN = allTickets(active).filter((t) => t.status !== "Färdigt").length;
              return (
                <button key={p.code} onClick={() => open(p.code)} className={`relative rounded-2xl bg-card p-4 text-left ring-1 ring-border transition hover:-translate-y-0.5 hover:ring-primary ${p.archived ? "opacity-60" : ""}`}>
                  {unread > 0 && <span className="absolute -right-2 -top-2 flex h-7 min-w-7 items-center justify-center rounded-full bg-primary px-2 text-sm font-bold text-primary-foreground animate-bounce" title="Olästa ärenden">{unread}</span>}
                  <p className="text-xs font-semibold uppercase tracking-widest text-primary">{p.code}</p>
                  <h3 className="mt-1 text-lg">{p.name}{p.archived && <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold">Arkiverat</span>}</h3>
                  <p className="text-sm text-muted-foreground">{active.subs.length} underprojekt · {openN} öppna ärenden</p>
                </button>
              );
            })}
          </div>
          {projects.some((p) => p.archived) && (
            <label className="mt-3 flex items-center gap-1.5 text-sm"><input type="checkbox" checked={showArchivedP} onChange={(e) => setShowArchivedP(e.target.checked)} /> Visa arkiverade projekt ({projects.filter((p) => p.archived).length})</label>
          )}
        </div>
      </main>
    );
  }

  const activeSubs = project.subs.filter((s) => !s.archived);
  const sub = subSel === "all" ? undefined : project.subs.find((s) => s.id === subSel);
  const pool = sub ? sub.tickets : activeSubs.flatMap((s) => s.tickets);
  const subOf = (id: string) => project.subs.find((s) => s.tickets.some((t) => t.id === id));
  const tab = (id: string, label: string, n: number) => (
    <button key={id} onClick={() => setSubSel(id)} className={`relative rounded-full px-4 py-1.5 text-sm font-semibold transition ${subSel === id ? "bg-graphite text-graphite-foreground" : "bg-secondary text-secondary-foreground hover:brightness-95"}`}>
      {label}{n > 0 && <span className="ml-1.5 rounded-full bg-primary px-1.5 text-xs text-primary-foreground">{n}</span>}
    </button>
  );
  const small = "rounded-lg bg-secondary px-2 py-1 text-xs font-semibold text-secondary-foreground hover:brightness-95";

  return (
    <main className="min-h-screen">
      {header}
      <div className="mx-auto max-w-5xl px-6 pb-16">
        <button onClick={() => setSel("")} className="mt-6 text-sm font-semibold text-primary hover:underline">← Tillbaka till översikten</button>
        {errBox}
        <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">{project.code}</p>
            <h2 className="text-3xl">{project.name}{project.archived && <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold align-middle">Arkiverat</span>}</h2>
          </div>
          <button onClick={() => setSettings(!settings)} className={`rounded-xl px-4 py-2 text-sm font-semibold ${settings ? "bg-graphite text-graphite-foreground" : "bg-secondary text-secondary-foreground"}`}>⚙️ Projektinställningar</button>
        </div>

        {settings && (
          <section className="mt-4 rounded-2xl bg-card p-5 ring-1 ring-border" style={{ boxShadow: "var(--shadow-pop)" }}>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => {
                const n = prompt("Nytt namn på projektet:", project.name)?.trim();
                if (n && n !== project.name) renameProject(project.code, n).catch((er) => setErr(er instanceof Error ? er.message : "Kunde inte byta namn"));
              }} className={small}>✏️ Byt namn</button>
              <button type="button" onClick={() => {
                if (!project.archived && !confirm(`Arkivera hela "${project.name}"? Kunden kommer inte in längre, men allt sparas.`)) return;
                archiveProject(project.code, !project.archived).catch((er) => setErr(er instanceof Error ? er.message : "Kunde inte arkivera"));
              }} className={small}>{project.archived ? "↩ Återställ projekt" : "🗄 Arkivera projekt"}</button>
              <button type="button" onClick={() => {
                const n = allTickets(project).length;
                const typed = prompt(`Ta bort "${project.name}" för alltid? Alla ${project.subs.length} underprojekt, ${n} ärenden och bilder raderas och kan inte återställas.\n\nSkriv projektkoden ${project.code} för att bekräfta:`);
                if (typed?.trim().toUpperCase() !== project.code) return;
                removeProject(project.code).then(() => setSel("")).catch((er) => setErr(er instanceof Error ? er.message : "Kunde inte ta bort projektet"));
              }} className="rounded-lg bg-destructive/10 px-2 py-1 text-xs font-semibold text-destructive hover:bg-destructive/20">🗑 Ta bort projekt</button>
            </div>

            <div className="mt-5 flex items-center justify-between gap-2">
              <h3 className="text-lg">Underprojekt & koder</h3>
              {project.subs.some((s) => s.archived) && (
                <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} /> Visa arkiverade ({project.subs.filter((s) => s.archived).length})</label>
              )}
            </div>
            <div className="mt-2 divide-y divide-border">
              {project.subs.filter((s) => showArchived || !s.archived).map((s) => (
                <div key={s.id} className={`flex flex-wrap items-center gap-2 py-3 ${s.archived ? "opacity-60" : ""}`}>
                  <p className="min-w-32 font-semibold">{s.name}</p>
                  <div className="flex flex-1 flex-wrap gap-1.5">
                    {s.codes.map((c) => <span key={c} className="rounded-md bg-graphite px-2 py-0.5 font-mono text-xs text-graphite-foreground">{c}</span>)}
                  </div>
                  <form className="flex gap-1" onSubmit={(e) => {
                    e.preventDefault();
                    const c = nc[s.id] ?? "";
                    if (!check(c)) return;
                    addSubCode(project.code, s.id, c).then(() => setNc({ ...nc, [s.id]: "" })).catch((e) => setErr(e instanceof Error ? e.message : "Kunde inte lägga till koden"));
                  }}>
                    <input value={nc[s.id] ?? ""} onChange={(e) => setNc({ ...nc, [s.id]: e.target.value })} placeholder="NY KOD" className={`${inp} w-28 py-1 uppercase`} />
                    <button className={small}>+ Kod</button>
                  </form>
                  <button type="button" onClick={() => {
                    if (!s.archived && !confirm(`Arkivera "${s.name}"? Kunden ser det inte längre, men historiken sparas.`)) return;
                    archiveSub(s.id, !s.archived).then(() => { if (subSel === s.id) setSubSel("all"); }).catch((er) => setErr(er instanceof Error ? er.message : "Kunde inte arkivera"));
                  }} className={small}>{s.archived ? "↩ Återställ" : "🗄 Arkivera"}</button>
                  <button type="button" onClick={() => {
                    if (!confirm(`Ta bort "${s.name}" för alltid? ${s.tickets.length} ärenden, noteringar, koder och bilder raderas och kan inte återställas.`)) return;
                    removeSub(s.id).then(() => { if (subSel === s.id) setSubSel("all"); }).catch((er) => setErr(er instanceof Error ? er.message : "Kunde inte ta bort underprojektet"));
                  }} className="rounded-lg bg-destructive/10 px-2 py-1 text-xs font-semibold text-destructive hover:bg-destructive/20">🗑 Ta bort</button>
                </div>
              ))}
            </div>
            <form className="mt-3 flex flex-wrap gap-2" onSubmit={(e) => {
              e.preventDefault();
              if (!ns.name.trim() || !check(ns.code)) return;
              addSub(project.code, ns.name, ns.code).then(() => setNs({ name: "", code: "" })).catch((e) => setErr(e instanceof Error ? e.message : "Kunde inte skapa underprojektet"));
            }}>
              <input value={ns.name} onChange={(e) => setNs({ ...ns, name: e.target.value })} placeholder="Nytt underprojekt" className={inp} />
              <input value={ns.code} onChange={(e) => setNs({ ...ns, code: e.target.value })} placeholder="UNDERKOD" className={`${inp} uppercase`} />
              <button className={btn}>+ Lägg till</button>
            </form>
          </section>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          {tab("all", "Alla ärenden", activeSubs.reduce((n, s) => n + unreadCount(s), 0))}
          {activeSubs.map((s) => tab(s.id, s.name, unreadCount(s)))}
          {sub?.archived && tab(sub.id, `${sub.name} (arkiverad)`, 0)}
        </div>
        {activeSubs.length === 0 && <p className="mt-4 text-sm text-muted-foreground">Inga underprojekt ännu – lägg till under ⚙️ Projektinställningar.</p>}
        {activeSubs.length > 0 && (
          <div className="mt-4">
            <button onClick={() => setNewTicket(!newTicket)} className={btn}>{newTicket ? "Avbryt" : "+ Nytt ärende"}</button>
            {newTicket && (
              <div className="mt-3">
                <NewTicketForm key={subSel} admin projectCode={project.code} subs={activeSubs.map((s) => ({ id: s.id, name: s.name }))} defaultSubId={sub?.id} onDone={() => setNewTicket(false)} />
              </div>
            )}
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {(["Alla", ...STATUSES] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3 py-0.5 text-xs font-semibold ring-1 ring-border ${filter === f ? "bg-primary text-primary-foreground" : "bg-card"}`}>{f}</button>
          ))}
        </div>
        <TicketList
          tickets={filter === "Alla" ? pool : pool.filter((t) => t.status === filter)}
          onStatus={(id, s) => { const sb = subOf(id); if (sb) setStatus(project.code, sb.id, id, s); }}
          moveTargets={activeSubs.filter((s) => s.id !== sub?.id).map((s) => ({ id: s.id, name: s.name }))}
          onTime={setTime}
          onSend={sendUpdate}
          onMove={(id, to) => moveTicket(id, to).catch((er) => setErr(er instanceof Error ? er.message : "Kunde inte flytta ärendet"))}
        />
      </div>
    </main>
  );
}
