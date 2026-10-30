import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useDemo, unreadCount, STATUSES, type Status } from "@/lib/demo-store";
import { TicketList, statusStyle } from "./index";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin – Projektportal" },
      { name: "description", content: "Hantera kundernas ärenden." },
      { property: "og:title", content: "Admin – Projektportal" },
      { property: "og:description", content: "Hantera kundernas ärenden." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Admin,
});

function Admin() {
  const { projects } = useDemo();
  const [in_, setIn] = useState(false);
  const [sel, setSel] = useState(projects[0]?.code ?? "");
  const [filter, setFilter] = useState<"Alla" | Status>("Alla");
  const project = projects.find((p) => p.code === sel)!;

  if (!in_)
    return (
      <main className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--gradient-hero)" }}>
        <form onSubmit={(e) => { e.preventDefault(); setIn(true); }} className="w-full max-w-sm space-y-3 rounded-3xl bg-card p-7" style={{ boxShadow: "var(--shadow-pop)" }}>
          <h1 className="text-2xl font-bold">Admininloggning</h1>
          <input placeholder="E-post" className="w-full rounded-xl border-2 border-input outline-none focus:border-primary bg-background px-3 py-2" />
          <input type="password" placeholder="Lösenord" className="w-full rounded-xl border-2 border-input outline-none focus:border-primary bg-background px-3 py-2" />
          <button className="w-full rounded-xl bg-primary px-4 py-2 font-semibold text-primary-foreground">Logga in (demo)</button>
          <Link to="/" className="block text-center text-sm underline text-muted-foreground">Tillbaka</Link>
        </form>
      </main>
    );

  return (
    <main className="min-h-screen">
      <header className="text-graphite-foreground" style={{ background: "var(--gradient-hero)" }}>
      <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-10">
        <h1 className="text-4xl">Admin<span className="text-primary">.</span></h1>
        <button onClick={() => setIn(false)} className="text-sm underline opacity-70">Logga ut</button>
      </div>
      </header>
      <div className="mx-auto max-w-4xl px-6 pb-16">
        <h2 className="mt-8 text-2xl">Alla projekt</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {projects.map((p) => {
            const unread = unreadCount(p);
            return (
              <button key={p.code} onClick={() => setSel(p.code)} className={`relative rounded-2xl bg-card p-5 text-left transition hover:-translate-y-0.5 ${p.code === sel ? "ring-2 ring-primary" : "ring-1 ring-border"}`} style={{ boxShadow: p.code === sel ? "var(--shadow-pop)" : undefined }}>
                {unread > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-7 min-w-7 items-center justify-center rounded-full bg-primary px-2 text-sm font-bold text-primary-foreground animate-bounce" title="Olästa ärenden">{unread}</span>
                )}
                <p className="text-xs font-semibold uppercase tracking-widest text-primary">{p.code}</p>
                <h3 className="mt-1 text-lg">{p.client}</h3>
                <p className="text-sm text-muted-foreground">{p.name}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {STATUSES.map((s) => {
                    const n = p.tickets.filter((t) => t.status === s).length;
                    return <span key={s} className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusStyle[s].badge}`}>{s}: {n}</span>;
                  })}
                </div>
              </button>
            );
          })}
        </div>
        <h2 className="mt-10 text-2xl">{project.client} – ärenden</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {(["Alla", ...STATUSES] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3 py-1 text-xs font-semibold ${filter === f ? "bg-graphite text-graphite-foreground" : "bg-secondary text-secondary-foreground"}`}>{f}</button>
          ))}
        </div>
        <TicketList project={{ ...project, tickets: filter === "Alla" ? project.tickets : project.tickets.filter((t) => t.status === filter) }} admin />
      </div>
    </main>
  );
}
