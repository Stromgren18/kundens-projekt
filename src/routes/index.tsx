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

function Index() {
  const { projects } = useDemo();
  const [code, setCode] = useState("");
  const [active, setActive] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const project = projects.find((p) => p.code === active);

  if (project) return <ProjectView project={project} onLeave={() => setActive(null)} />;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <p className="text-sm uppercase tracking-widest text-primary font-semibold">Frilans Norr</p>
      <h1 className="mt-2 text-4xl font-bold">Projektportal</h1>
      <form
        className="mt-8 w-full max-w-sm space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          const c = code.trim().toUpperCase();
          if (projects.some((p) => p.code === c)) { setActive(c); setErr(""); } else setErr("Okänd projektkod.");
        }}
      >
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Din projektkod" className="w-full rounded-md border border-input bg-background px-4 py-3 text-center tracking-widest uppercase" />
        {err && <p className="text-sm text-destructive text-center">{err}</p>}
        <button className="w-full rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground hover:opacity-90">Öppna projekt</button>
      </form>
      <p className="mt-6 text-xs text-muted-foreground">Demokoder: NORR-2026 · FJALL-42</p>
      <Link to="/admin" className="mt-10 text-sm text-muted-foreground underline">Admin</Link>
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

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-primary font-semibold">{project.client}</p>
          <h1 className="text-3xl font-bold">{project.name}</h1>
        </div>
        <button onClick={onLeave} className="text-sm underline text-muted-foreground">Byt projekt</button>
      </div>

      <form
        className="mt-8 space-y-3 rounded-lg border border-border bg-card p-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim() || !body.trim() || (notify && !email.includes("@"))) return;
          addTicket(project.code, { title, body, images, notify, email: notify ? email : undefined });
          setTitle(""); setBody(""); setImages([]); setNotify(false); setEmail("");
        }}
      >
        <h2 className="font-semibold">Nytt ärende</h2>
        <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Rubrik" className="w-full rounded-md border border-input bg-background px-3 py-2" />
        <textarea required value={body} onChange={(e) => setBody(e.target.value)} placeholder="Beskriv vad du vill ha gjort" rows={4} className="w-full rounded-md border border-input bg-background px-3 py-2" />
        <input type="file" accept="image/*" multiple onChange={(e) => setImages(Array.from(e.target.files ?? []).map((f) => URL.createObjectURL(f)))} className="text-sm" />
        {images.length > 0 && <div className="flex gap-2">{images.map((s) => <img key={s} src={s} alt="" className="h-16 w-16 rounded object-cover" />)}</div>}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
          Meddela mig när ärendet är utfört
        </label>
        {notify && <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Din e-post" className="w-full rounded-md border border-input bg-background px-3 py-2" />}
        <button className="rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground hover:opacity-90">Skicka ärende</button>
      </form>

      <TicketList project={project} />
    </main>
  );
}

export function TicketList({ project, admin }: { project: Project; admin?: boolean }) {
  const { toggleDone } = useDemo();
  return (
    <ul className="mt-6 space-y-3">
      {project.tickets.map((t) => (
        <li key={t.id} className="rounded-lg border border-border p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold">{t.title}</h3>
              <p className="text-sm text-muted-foreground">{t.createdAt}{t.notify && ` · meddela ${t.email}`}</p>
            </div>
            {admin ? (
              <button onClick={() => toggleDone(project.code, t.id)} className={`rounded-md px-3 py-1 text-sm font-semibold ${t.done ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground"}`}>
                {t.done ? "Ångra" : "Markera hanterat"}
              </button>
            ) : (
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${t.done ? "bg-secondary text-secondary-foreground" : "bg-accent text-accent-foreground"}`}>{t.done ? "Hanterat" : "Väntar"}</span>
            )}
          </div>
          <p className="mt-2 text-sm whitespace-pre-wrap">{t.body}</p>
          {t.images.length > 0 && <div className="mt-2 flex gap-2">{t.images.map((s) => <img key={s} src={s} alt="" className="h-20 w-20 rounded object-cover" />)}</div>}
        </li>
      ))}
    </ul>
  );
}
