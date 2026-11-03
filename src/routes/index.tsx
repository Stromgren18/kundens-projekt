import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useDemo, STATUSES, resolveCode, type Project, type Status, type Ticket } from "@/lib/demo-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Projektportal – Frilans Norr" },
      { name: "description", content: "Ange din projektkod och lägg till ärenden i ditt projekt." },
      { property: "og:title", content: "Projektportal – Frilans Norr" },
      { property: "og:description", content: "Ange din projektkod och lägg till ärenden i ditt projekt." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

export const field = "w-full rounded-xl border-2 border-input bg-background px-4 py-3 outline-none transition focus:border-primary";

function Index() {
  const { projects, loading, error } = useDemo();
  const [code, setCode] = useState("");
  const [access, setAccess] = useState<{ code: string; subIds: string[] } | null>(null);
  const [err, setErr] = useState("");
  const project = projects.find((p) => p.code === access?.code);

  if (project && access) return <ProjectView project={project} subIds={access.subIds} onLeave={() => setAccess(null)} />;

  return (
    <main className="relative min-h-screen overflow-hidden text-graphite-foreground" style={{ background: "var(--gradient-hero)" }}>
      <div className="pointer-events-none absolute -left-24 bottom-[-6rem] h-80 w-80 rounded-full bg-primary/30 blur-3xl animate-pulse" />
      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col justify-center gap-12 px-6 py-16 md:flex-row md:items-center">
        <div className="flex-1 animate-in fade-in slide-in-from-left-6 duration-700">
          <span className="inline-block rounded-full bg-primary px-4 py-1 text-xs font-semibold uppercase tracking-widest text-primary-foreground">Frilans Norr</span>
          <h1 className="mt-6 text-5xl leading-[1.05] md:text-6xl">Ditt projekt.<br /><span className="text-primary">Dina önskemål.</span></h1>
          <p className="mt-5 max-w-md text-lg opacity-80">Logga in med din projektkod och berätta vad du vill ha fixat – med text och bilder. Vi hör av oss när det är klart.</p>
        </div>
        <form
          className="w-full max-w-sm rounded-3xl bg-card p-7 text-card-foreground animate-in fade-in zoom-in-95 duration-700"
          style={{ boxShadow: "var(--shadow-pop)" }}
          onSubmit={(e) => {
            e.preventDefault();
            const r = resolveCode(projects, code);
            if (r) { setAccess({ code: r.project.code, subIds: r.subIds }); setErr(""); } else setErr("Okänd projektkod – kontrollera och försök igen.");
          }}
        >
          <h2 className="text-2xl">Öppna ditt projekt</h2>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="PROJEKTKOD" className={`${field} mt-5 text-center text-lg font-semibold tracking-[0.3em] uppercase`} />
          {err && <p className="mt-2 text-sm text-destructive">{err}</p>}
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          <button disabled={loading} className="mt-4 w-full rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground transition hover:-translate-y-0.5 hover:brightness-110 disabled:opacity-60">{loading ? "Laddar projekt…" : "Öppna projekt →"}</button>
          {!loading && projects.length > 0 && (
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Huvudkod: {projects.map((p) => p.code).join(", ")} · Underkod: {projects.flatMap((p) => p.subs.flatMap((s) => s.codes)).slice(0, 4).join(", ")}
            </p>
          )}
        </form>
      </div>
      <Link to="/admin" className="absolute bottom-5 right-6 text-sm opacity-60 underline hover:opacity-100">Admin</Link>
    </main>
  );
}

function ProjectView({ project, subIds, onLeave }: { project: Project; subIds: string[]; onLeave: () => void }) {
  const { addTicket } = useDemo();
  const subs = project.subs.filter((s) => subIds.includes(s.id));
  const [subId, setSubId] = useState(subs[0]?.id ?? "");
  const sub = subs.find((s) => s.id === subId) ?? subs[0];
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitErr, setSubmitErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [notify, setNotify] = useState(false);
  const [email, setEmail] = useState("");
  const tickets = sub?.tickets ?? [];
  const open = tickets.filter((t) => t.status !== "Färdigt").length;

  return (
    <div className="min-h-screen">
      <header className="text-graphite-foreground" style={{ background: "var(--gradient-hero)" }}>
        <div className="mx-auto max-w-4xl px-6 py-10">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary-foreground">{project.name}</span>
            <button onClick={onLeave} className="text-sm opacity-70 underline hover:opacity-100">Byt projekt</button>
          </div>
          <p className="mt-6 opacity-70">{project.client}</p>
          <h1 className="text-4xl md:text-5xl">{sub?.name ?? "Inga underprojekt ännu"}</h1>
          {subs.length > 1 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {subs.map((s) => (
                <button key={s.id} onClick={() => setSubId(s.id)} className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${s.id === sub?.id ? "bg-primary text-primary-foreground" : "bg-graphite-foreground/10 hover:bg-graphite-foreground/20"}`}>{s.name}</button>
              ))}
            </div>
          )}
          <div className="mt-6 flex gap-3 text-sm">
            <span className="rounded-xl bg-graphite-foreground/10 px-4 py-2"><b className="text-lg">{open}</b> pågående</span>
            <span className="rounded-xl bg-graphite-foreground/10 px-4 py-2"><b className="text-lg">{tickets.length - open}</b> färdiga</span>
          </div>
        </div>
      </header>

      {sub && (
        <main className="mx-auto -mt-6 max-w-4xl px-6 pb-16">
          <form
            className="space-y-3 rounded-3xl border-t-4 border-primary bg-card p-6"
            style={{ boxShadow: "var(--shadow-pop)" }}
            onSubmit={(e) => {
              e.preventDefault();
              if (!title.trim() || !body.trim() || (notify && !email.includes("@"))) return;
              setBusy(true);
              setSubmitErr("");
              addTicket(project.code, sub.id, { title, body, files, notify, email: notify ? email : undefined })
                .then(() => {
                  setTitle(""); setBody(""); setFiles([]); setPreviews([]); setNotify(false); setEmail("");
                })
                .catch((err) => setSubmitErr(err instanceof Error ? err.message : "Något gick fel – försök igen."))
                .finally(() => setBusy(false));
            }}
          >
            <h2 className="text-2xl">Nytt ärende i {sub.name}</h2>
            <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Rubrik" className={field} />
            <textarea required value={body} onChange={(e) => setBody(e.target.value)} placeholder="Beskriv vad du vill ha gjort" rows={4} className={field} />
            <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-primary/40 bg-accent/40 px-4 py-6 text-sm text-accent-foreground transition hover:bg-accent">
              <span className="text-2xl">📎</span>
              <span className="font-semibold">Bifoga bilder</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { const fs = Array.from(e.target.files ?? []); setFiles(fs); setPreviews(fs.map((f) => URL.createObjectURL(f))); }} />
            </label>
            {previews.length > 0 && <div className="flex flex-wrap gap-2">{previews.map((s) => <img key={s} src={s} alt="" className="h-20 w-20 rounded-lg object-cover ring-2 ring-primary/30" />)}</div>}
            {submitErr && <p className="text-sm text-destructive">{submitErr}</p>}
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" className="h-4 w-4 accent-primary" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
              Meddela mig när ärendet är utfört
            </label>
            {notify && <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Din e-post" className={`${field} animate-in fade-in slide-in-from-top-2`} />}
            <button disabled={busy} className="rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground transition hover:-translate-y-0.5 hover:brightness-110 disabled:opacity-60">{busy ? "Skickar…" : "Skicka ärende"}</button>
          </form>

          <h2 className="mt-12 text-2xl">Dina ärenden</h2>
          <TicketList tickets={tickets} />
        </main>
      )}
    </div>
  );
}

export const statusStyle: Record<Status, { badge: string; border: string }> = {
  "Ej läst": { badge: "bg-primary text-primary-foreground", border: "border-primary" },
  Bekräftat: { badge: "bg-warning text-warning-foreground", border: "border-warning-foreground" },
  Påbörjat: { badge: "bg-info text-info-foreground", border: "border-info-foreground" },
  Färdigt: { badge: "bg-success text-success-foreground", border: "border-success-foreground" },
};

export function TicketList({ tickets, onStatus }: { tickets: Ticket[]; onStatus?: (id: string, s: Status) => void }) {
  if (tickets.length === 0) return <p className="mt-4 text-muted-foreground">Inga ärenden ännu.</p>;
  return (
    <ul className="mt-4 space-y-4">
      {tickets.map((t) => (
        <li key={t.id} className={`rounded-2xl border-l-4 bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md animate-in fade-in slide-in-from-bottom-2 ${statusStyle[t.status].border} ${t.status === "Färdigt" ? "opacity-75" : ""}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg">{t.title}</h3>
              <p className="text-sm text-muted-foreground">{t.createdAt}{t.notify && ` · meddelar ${t.email}`}</p>
            </div>
            <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${statusStyle[t.status].badge}`}>{t.status}</span>
          </div>
          <p className="mt-3 whitespace-pre-wrap">{t.body}</p>
          {t.images.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{t.images.map((s) => <a key={s} href={s} target="_blank" rel="noreferrer"><img src={s} alt="" className="h-24 w-24 rounded-lg object-cover transition hover:scale-105" /></a>)}</div>}
          {onStatus && (
            <div className="mt-4 flex flex-wrap gap-2">
              {STATUSES.map((s) => (
                <button key={s} onClick={() => onStatus(t.id, s)} className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition hover:brightness-105 ${t.status === s ? statusStyle[s].badge + " ring-2 ring-offset-1 ring-foreground/20" : "bg-secondary text-secondary-foreground"}`}>
                  {s}
                </button>
              ))}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
