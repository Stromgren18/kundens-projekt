import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useDemo } from "@/lib/demo-store";
import { TicketList } from "./index";

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
      <div className="mt-6 flex gap-2">
        {projects.map((p) => (
          <button key={p.code} onClick={() => setSel(p.code)} className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${p.code === sel ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
            {p.client} ({p.tickets.filter((t) => !t.done).length})
          </button>
        ))}
      </div>
      <TicketList project={project} admin />
      </div>
    </main>
  );
}
