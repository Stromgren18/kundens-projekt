import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupa } from "./supa.server";
import { STATUSES, type Project, type Status, type Ticket } from "./types";

const BUCKET = "ticket-images";
const MAX_FILE_BYTES = 8 * 1024 * 1024;

const statusOk = (s: unknown): s is Status =>
  typeof s === "string" && (STATUSES as readonly string[]).includes(s);

const str = (v: unknown, fb = "") => (typeof v === "string" ? v : fb);

type Row = Record<string, unknown>;

function toTicket(t: Row): Ticket {
  return {
    id: str(t["id"]),
    title: str(t["title"]),
    body: str(t["body"]),
    images: Array.isArray(t["images"]) ? t["images"].map((s) => str(s)) : [],
    notify: t["notify"] === true,
    email: typeof t["email"] === "string" ? t["email"] : undefined,
    status: statusOk(t["status"]) ? t["status"] : "Ej läst",
    createdAt: str(t["created_at"]).slice(0, 10),
  };
}

export const loadProjects = createServerFn({ method: "GET" })
  .handler(async (): Promise<Project[]> => {
    const supa = getSupa();
    const [p, s, c, t] = await Promise.all([
      supa.from("projects").select("*").order("created_at", { ascending: true }),
      supa.from("sub_projects").select("*").order("created_at", { ascending: true }),
      supa.from("sub_project_codes").select("*"),
      supa.from("tickets").select("*").order("created_at", { ascending: false }),
    ]);
    const err = p.error || s.error || c.error || t.error;
    if (err) throw new Error(`Kunde inte läsa projekt: ${err.message}`);
    const subs = (s.data ?? []) as Row[];
    const codes = (c.data ?? []) as Row[];
    const tickets = (t.data ?? []) as Row[];
    return ((p.data ?? []) as Row[]).map((pr) => ({
      code: str(pr["code"]),
      name: str(pr["name"]),
      client: str(pr["client"]),
      subs: subs
        .filter((sb) => sb["project_id"] === pr["id"])
        .map((sb) => ({
          id: str(sb["id"]),
          name: str(sb["name"]),
          codes: codes.filter((cd) => cd["sub_project_id"] === sb["id"]).map((cd) => str(cd["code"])),
          tickets: tickets.filter((tk) => tk["sub_project_id"] === sb["id"]).map(toTicket),
        })),
    }));
  });

const fileSchema = z.object({ name: z.string().max(200), dataUrl: z.string().max(12_000_000) });

export const createTicket = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        projectCode: z.string().min(1),
        subId: z.string().uuid(),
        title: z.string().min(1).max(200),
        body: z.string().min(1).max(5000),
        notify: z.boolean(),
        email: z.string().email().optional(),
        files: z.array(fileSchema).max(10),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const supa = getSupa();
    const { data: proj, error: pe } = await supa
      .from("projects")
      .select("id")
      .eq("code", data.projectCode)
      .maybeSingle();
    if (pe) throw new Error(pe.message);
    if (!proj) throw new Error("Projektet finns inte");
    const { data: sub, error: se } = await supa
      .from("sub_projects")
      .select("id")
      .eq("id", data.subId)
      .eq("project_id", proj.id)
      .maybeSingle();
    if (se) throw new Error(se.message);
    if (!sub) throw new Error("Underprojektet finns inte");

    const urls: string[] = [];
    for (const f of data.files) {
      const comma = f.dataUrl.indexOf(",");
      if (comma < 0) throw new Error(`Felaktig fildata för ${f.name}`);
      const mime = /data:(.*?);/.exec(f.dataUrl.slice(0, comma))?.[1] ?? "application/octet-stream";
      const bytes = Buffer.from(f.dataUrl.slice(comma + 1), "base64");
      if (bytes.length > MAX_FILE_BYTES) throw new Error(`Filen ${f.name} är för stor (max 8 MB)`);
      const ext = (mime.split("/")[1] ?? "bin").split(";")[0];
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supa.storage.from(BUCKET).upload(path, bytes, { contentType: mime });
      if (error) throw new Error(`Kunde inte ladda upp ${f.name}: ${error.message}`);
      urls.push(supa.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
    }

    const { error } = await supa.from("tickets").insert({
      sub_project_id: data.subId,
      title: data.title,
      body: data.body,
      images: urls,
      notify: data.notify,
      email: data.notify ? (data.email ?? null) : null,
      status: "Ej läst",
    });
    if (error) throw new Error(`Kunde inte spara ärendet: ${error.message}`);
    return { ok: true, images: urls };
  });

export const setTicketStatus = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid(), status: z.string() }).parse(d))
  .handler(async ({ data }) => {
    if (!statusOk(data.status)) throw new Error("Okänd status");
    const supa = getSupa();
    const { error } = await supa.from("tickets").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(`Kunde inte uppdatera status: ${error.message}`);
    return { ok: true };
  });

export const createProject = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ name: z.string().min(1).max(120), code: z.string().min(2).max(40) }).parse(d),
  )
  .handler(async ({ data }) => {
    const supa = getSupa();
    const code = data.code.trim().toUpperCase();
    const name = data.name.trim();
    const { error } = await supa.from("projects").insert({ code, name, client: name });
    if (error)
      throw new Error(
        error.code === "23505" ? `Koden ${code} används redan` : `Kunde inte skapa projekt: ${error.message}`,
      );
    return { ok: true, code };
  });

export const createSub = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        projectCode: z.string().min(1),
        name: z.string().min(1).max(120),
        code: z.string().min(2).max(40),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const supa = getSupa();
    const code = data.code.trim().toUpperCase();
    const { data: proj, error: pe } = await supa
      .from("projects")
      .select("id")
      .eq("code", data.projectCode)
      .maybeSingle();
    if (pe) throw new Error(pe.message);
    if (!proj) throw new Error("Projektet finns inte");
    const { data: sub, error: se } = await supa
      .from("sub_projects")
      .insert({ project_id: proj.id, name: data.name.trim() })
      .select("id")
      .single();
    if (se) throw new Error(`Kunde inte skapa underprojekt: ${se.message}`);
    const { error: ce } = await supa.from("sub_project_codes").insert({ sub_project_id: sub.id, code });
    if (ce)
      throw new Error(
        ce.code === "23505" ? `Koden ${code} används redan` : `Kunde inte spara koden: ${ce.message}`,
      );
    return { ok: true };
  });

export const addSubCode = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ subId: z.string().uuid(), code: z.string().min(2).max(40) }).parse(d))
  .handler(async ({ data }) => {
    const supa = getSupa();
    const code = data.code.trim().toUpperCase();
    const { error } = await supa
      .from("sub_project_codes")
      .insert({ sub_project_id: data.subId, code });
    if (error)
      throw new Error(
        error.code === "23505" ? `Koden ${code} används redan` : `Kunde inte spara koden: ${error.message}`,
      );
    return { ok: true };
  });
