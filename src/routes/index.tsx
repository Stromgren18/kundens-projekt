import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useDemo, type Project } from "@/lib/demo-store";

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

const field = "w-full rounded-xl border-2 border-input bg-background px-4 py-3 outline-none transition focus:border-primary";

function Index() {
  const { projects } = useDemo();
  const [code, setCode] = useState("");
  const [active, setActive] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const project = projects.find((p) => p.code === active);

  if (project) return <ProjectView project={project} onLeave={() => setActive(null)} />;

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
            const c = code.trim().toUpperCase();
            if (projects.some((p) => p.code === c)) { setActive(c); setErr(""); } else setErr("Okänd projektkod – kontrollera och försök igen.");
          }}
        >
          <h2 className="text-2xl">Öppna ditt projekt</h2>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="PROJEKTKOD" className={`${field} mt-5 text-center text-lg font-semibold tracking-[0.3em] uppercase`} />
          {err && <p className="mt-2 text-sm text-destructive">{err}</p>}
          <button className="mt-4 w-full rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground transition hover:-translate-y-0.5 hover:brightness-110">Öppna projekt →</button>
          <p className="mt-4 text-center text-xs text-muted-foreground">Demokoder: NORR-2026 · FJALL-42</p>
        </form>
      </div>
      <Link to="/admin" className="absolute bottom-5 right-6 text-sm opacity-60 underline hover:opacity-100">Admin</Link>
    </main>
  );
}

function ProjectView({ project, onLeave }: { project: Project; onLeave: () => void }) {
  const { addTicket } = useDemo();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [notify, setNotify] = useState(false);
  const [email, setEmail] = useState("");
  const open = project.tickets.filter((t) => !t.done).length;

  return (
    <div className="min-h-screen">
      <header className="text-graphite-foreground" style={{ background: "var(--gradient-hero)" }}>
        <div className="mx-auto max-w-4xl px-6 py-10">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary-foreground">{project.code}</span>
            <button onClick={onLeave} className="text-sm opacity-70 underline hover:opacity-100">Byt projekt</button>
          </div>
          <p className="mt-6 opacity-70">{project.client}</p>
          <h1 className="text-4xl md:text-5xl">{project.name}</h1>
          <div className="mt-6 flex gap-3 text-sm">
            <span className="rounded-xl bg-graphite-foreground/10 px-4 py-2"><b className="text-lg">{open}</b> väntar</span>
            <span className="rounded-xl bg-graphite-foreground/10 px-4 py-2"><b className="text-lg">{project.tickets.length - open}</b> hanterade</span>
          </div>
        </div>
      </header>

      <main className="mx-auto -mt-6 max-w-4xl px-6 pb-16">
        <form
          className="space-y-3 rounded-3xl border-t-4 border-primary bg-card p-6"
          style={{ boxShadow: "var(--shadow-pop)" }}
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim() || !body.trim() || (notify && !email.includes("@"))) return;
            addTicket(project.code, { title, body, images, notify, email: notify ? email : undefined });
            setTitle(""); setBody(""); setImages([]); setNotify(false); setEmail("");
          }}
        >
          <h2 className="text-2xl">Nytt ärende</h2>
          <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Rubrik" className={field} />
          <textarea required value={body} onChange={(e) => setBody(e.target.value)} placeholder="Beskriv vad du vill ha gjort" rows={4} className={field} />
          <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-primary/40 bg-accent/40 px-4 py-6 text-sm text-accent-foreground transition hover:bg-accent">
            <span className="text-2xl">📎</span>
            <span className="font-semibold">Bifoga bilder</span>
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => setImages(Array.from(e.target.files ?? []).map((f) => URL.createObjectURL(f)))} />
          </label>
          {images.length > 0 && <div className="flex flex-wrap gap-2">{images.map((s) => <img key={s} src={s} alt="" className="h-20 w-20 rounded-lg object-cover ring-2 ring-primary/30" />)}</div>}
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" className="h-4 w-4 accent-primary" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
            Meddela mig när ärendet är utfört
          </label>
          {notify && <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Din e-post" className={`${field} animate-in fade-in slide-in-from-top-2`} />}
          <button className="rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground transition hover:-translate-y-0.5 hover:brightness-110">Skicka ärende</button>
        </form>

        <h2 className="mt-12 text-2xl">Dina ärenden</h2>
        <TicketList project={project} />
      </main>
    </div>
  );
}

export function TicketList({ project, admin }: { project: Project; admin?: boolean }) {
  const { toggleDone } = useDemo();
  if (project.tickets.length === 0) return <p className="mt-4 text-muted-foreground">Inga ärenden ännu.</p>;
  return (
    <ul className="mt-4 space-y-4">
      {project.tickets.map((t) => (
        <li key={t.id} className={`rounded-2xl border-l-4 bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md animate-in fade-in slide-in-from-bottom-2 ${t.done ? "border-success-foreground opacity-75" : "border-primary"}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg">{t.title}</h3>
              <p className="text-sm text-muted-foreground">{t.createdAt}{t.notify && ` · meddelar ${t.email}`}</p>
            </div>
            {admin ? (
              <button onClick={() => toggleDone(project.code, t.id)} className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition hover:brightness-110 ${t.done ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground"}`}>
                {t.done ? "Ångra" : "✓ Markera hanterat"}
              </button>
            ) : (
              <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${t.done ? "bg-success text-success-foreground" : "bg-accent text-accent-foreground"}`}>{t.done ? "✓ Hanterat" : "● Väntar"}</span>
            )}
          </div>
          <p className="mt-3 whitespace-pre-wrap">{t.body}</p>
          {t.images.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{t.images.map((s) => <a key={s} href={s} target="_blank" rel="noreferrer"><img src={s} alt="" className="h-24 w-24 rounded-lg object-cover transition hover:scale-105" /></a>)}</div>}
        </li>
      ))}
    </ul>
  );
}
