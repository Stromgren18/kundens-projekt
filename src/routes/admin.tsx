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
  const [sel, setSel] = useState(projects[0].code);
  const project = projects.find((p) => p.code === sel)!;

  if (!in_)
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <form onSubmit={(e) => { e.preventDefault(); setIn(true); }} className="w-full max-w-sm space-y-3">
          <h1 className="text-2xl font-bold">Admininloggning</h1>
          <input placeholder="E-post" className="w-full rounded-md border border-input bg-background px-3 py-2" />
          <input type="password" placeholder="Lösenord" className="w-full rounded-md border border-input bg-background px-3 py-2" />
          <button className="w-full rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground">Logga in (demo)</button>
          <Link to="/" className="block text-center text-sm underline text-muted-foreground">Tillbaka</Link>
        </form>
      </main>
    );

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Admin</h1>
        <button onClick={() => setIn(false)} className="text-sm underline text-muted-foreground">Logga ut</button>
      </div>
      <div className="mt-6 flex gap-2">
        {projects.map((p) => (
          <button key={p.code} onClick={() => setSel(p.code)} className={`rounded-md px-4 py-2 text-sm font-semibold ${p.code === sel ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
            {p.client} ({p.tickets.filter((t) => !t.done).length})
          </button>
        ))}
      </div>
      <TicketList project={project} admin />
    </main>
  );
}
