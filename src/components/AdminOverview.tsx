import { useState } from "react";
import { useDemo, STATUSES, type Status } from "@/lib/demo-store";
import { statusStyle } from "@/routes/index";

const inp = "rounded-xl border-2 border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary";
type SortKey = "kund" | "projekt" | "status" | "datum";

export function Overview({ onOpen }: { onOpen: (code: string, subId: string) => void }) {
  const { projects, setStatus } = useDemo();
  const [sort, setSort] = useState<SortKey>("status");
  const [asc, setAsc] = useState(true);
  const [q, setQ] = useState("");
  const [hideDone, setHideDone] = useState(true);
  const [statusF, setStatusF] = useState<"Alla" | Status>("Alla");
  const today = new Date("2026-11-03").getTime();

  const rows = projects.flatMap((p) => p.subs.filter((s) => !s.archived).flatMap((s) => s.tickets.map((t) => ({ p, s, t }))))
    .filter(({ t }) => !(hideDone && t.status === "Färdigt"))
    .filter(({ t }) => statusF === "Alla" || t.status === statusF)
    .filter(({ p, s, t }) => `${p.client} ${s.name} ${t.title} ${t.body}`.toLowerCase().includes(q.toLowerCase()));

  const val = (r: (typeof rows)[number]) =>
    sort === "kund" ? r.p.client : sort === "projekt" ? r.s.name : sort === "status" ? String(STATUSES.indexOf(r.t.status)) : r.t.createdAt;
  rows.sort((a, b) => val(a).localeCompare(val(b), "sv") * (asc ? 1 : -1));

  const head = (k: SortKey, label: string) => (
    <th className="px-3 py-2 text-left">
      <button onClick={() => { if (sort === k) setAsc(!asc); else { setSort(k); setAsc(true); } }} className={`font-semibold ${sort === k ? "text-primary" : ""}`}>
        {label} {sort === k ? (asc ? "▲" : "▼") : "↕"}
      </button>
    </th>
  );

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-2xl">Att göra – översikt</h2>
        <div className="flex flex-wrap items-center gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Sök ärende, kund…" className={inp} />
          <select value={statusF} onChange={(e) => setStatusF(e.target.value as "Alla" | Status)} className={inp}>
            {(["Alla", ...STATUSES] as const).map((s) => <option key={s}>{s}</option>)}
          </select>
          <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} /> Dölj färdiga</label>
        </div>
      </div>
      <div className="mt-4 overflow-x-auto rounded-2xl bg-card ring-1 ring-border" style={{ boxShadow: "var(--shadow-pop)" }}>
        <table className="w-full text-sm">
          <thead className="bg-graphite text-graphite-foreground">
            <tr>{head("kund", "Kund")}{head("projekt", "Projekt")}<th className="px-3 py-2 text-left">Ärende</th>{head("status", "Status")}{head("datum", "Inkom")}<th /></tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">Inget att göra just nu 🎉</td></tr>}
            {rows.map(({ p, s, t }) => {
              const days = Math.round((today - new Date(t.createdAt).getTime()) / 864e5);
              return (
                <tr key={t.id} className="border-t border-border">
                  <td className="px-3 py-2 font-semibold">{p.client}</td>
                  <td className="px-3 py-2">{s.name}</td>
                  <td className="px-3 py-2">{t.title}{t.notify && <span title="Kunden vill ha mejl" className="ml-1">✉️</span>}</td>
                  <td className="px-3 py-2">
                    <select value={t.status} onChange={(e) => setStatus(p.code, s.id, t.id, e.target.value as Status)} className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusStyle[t.status].badge}`}>
                      {STATUSES.map((st) => <option key={st}>{st}</option>)}
                    </select>
                  </td>
                  <td className={`px-3 py-2 whitespace-nowrap ${days > 7 && t.status !== "Färdigt" ? "font-bold text-primary" : "text-muted-foreground"}`}>{days} dagar sedan</td>
                  <td className="px-3 py-2"><button onClick={() => onOpen(p.code, s.id)} className="text-xs underline">Öppna</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
