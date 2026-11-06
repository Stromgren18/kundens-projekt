import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupa, getUserSupa } from "./supa.server";
import { STATUSES, type Project, type Status, type Ticket } from "./types";

const BUCKET = "ticket-images";
import { MAX_FILES, MAX_IMAGE_BYTES, MAX_PDF_BYTES } from "./upload";

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

const token = z.string().min(20);

/** Verifies the bearer belongs to an admin and returns an RLS-scoped client. */
async function adminClient(tok: string) {
  const supa = getUserSupa(tok);
  const { data: u, error } = await supa.auth.getUser(tok);
  if (error || !u.user) throw new Error("Inte inloggad");
  const { data: role } = await supa.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
  if (!role) throw new Error("Saknar adminbehörighet");
  return supa;
}

/** Customer: loads only the project/sub-projects that the code grants. */
export const loadByCode = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ code: z.string().min(1).max(60) }).parse(d))
  .handler(async ({ data }): Promise<Project | null> => {
    const { data: res, error } = await getSupa().rpc("portal_load", { _code: data.code });
    if (error) throw new Error("Kunde inte läsa projektet");
    if (!res) return null;
    const p = res as Row;
    const subs = Array.isArray(p["subs"]) ? (p["subs"] as Row[]) : [];
    return {
      code: str(p["code"]),
      name: str(p["name"]),
      client: str(p["client"]),
      subs: subs.map((s) => ({
        id: str(s["id"]),
        name: str(s["name"]),
        codes: [],
        tickets: (Array.isArray(s["tickets"]) ? (s["tickets"] as Row[]) : []).map(toTicket),
      })),
    };
  });

/** Admin: loads everything. */
export const loadProjects = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token }).parse(d))
  .handler(async ({ data }): Promise<Project[]> => {
    const supa = await adminClient(data.token);
    const [p, s, c, t] = await Promise.all([
      supa.from("projects").select("*").order("created_at", { ascending: true }),
      supa.from("sub_projects").select("*").order("created_at", { ascending: true }),
      supa.from("sub_project_codes").select("*"),
      supa.from("tickets").select("*").order("created_at", { ascending: false }),
    ]);
    if (p.error || s.error || c.error || t.error) throw new Error("Kunde inte läsa projekt");
    const subs = (s.data ?? []) as Row[];
    const codes = (c.data ?? []) as Row[];
    const tickets = (t.data ?? []) as Row[];
    return ((p.data ?? []) as Row[]).map((pr) => ({
      code: str(pr["code"]),
      name: str(pr["name"]),
      client: str(pr["client"]),
      archived: pr["archived"] === true,
      subs: subs
        .filter((sb) => sb["project_id"] === pr["id"])
        .map((sb) => ({
          id: str(sb["id"]),
          name: str(sb["name"]),
          archived: sb["archived"] === true,
          codes: codes.filter((cd) => cd["sub_project_id"] === sb["id"]).map((cd) => str(cd["code"])),
          tickets: tickets.filter((tk) => tk["sub_project_id"] === sb["id"]).map(toTicket),
        })),
    }));
  });

const fileSchema = z.object({ name: z.string().max(200), dataUrl: z.string().max(14_500_000) });

export const createTicket = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        projectCode: z.string().min(1).max(60),
        subId: z.string().uuid(),
        title: z.string().min(1).max(200),
        body: z.string().min(1).max(5000),
        notify: z.boolean(),
        email: z.string().email().optional(),
        files: z.array(fileSchema).max(MAX_FILES),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const supa = getSupa();
    // Verify the code grants access to this sub-project before any upload.
    const { data: proj } = await supa.rpc("portal_load", { _code: data.projectCode });
    const subs = proj && Array.isArray((proj as Row)["subs"]) ? ((proj as Row)["subs"] as Row[]) : [];
    if (!subs.some((s) => s["id"] === data.subId)) throw new Error("Ogiltig kod");

    const urls: string[] = [];
    if (data.files.length) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      for (const f of data.files) {
        const comma = f.dataUrl.indexOf(",");
        if (comma < 0) throw new Error(`Felaktig fildata för ${f.name}`);
        const mime = /data:(.*?);/.exec(f.dataUrl.slice(0, comma))?.[1] ?? "";
        const pdf = mime === "application/pdf";
        if (!pdf && !mime.startsWith("image/")) throw new Error(`${f.name} är varken bild eller PDF`);
        const bytes = Buffer.from(f.dataUrl.slice(comma + 1), "base64");
        if (pdf && bytes.length > MAX_PDF_BYTES) throw new Error(`${f.name} är för stor (max 10 MB)`);
        if (!pdf && bytes.length > MAX_IMAGE_BYTES) throw new Error(`Bilden ${f.name} är för stor (max 700 kB)`);
        const ext = pdf ? "pdf" : (mime.split("/")[1] ?? "bin").replace(/[^a-z0-9]/gi, "").slice(0, 8);
        const path = `${data.subId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
        const { error } = await supabaseAdmin.storage.from(BUCKET).upload(path, bytes, { contentType: mime });
        if (error) throw new Error(`Kunde inte ladda upp ${f.name}`);
        urls.push(supabaseAdmin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
      }
    }

    const { error } = await supa.rpc("portal_create_ticket", {
      _code: data.projectCode,
      _sub_id: data.subId,
      _title: data.title,
      _body: data.body,
      _images: urls,
      _notify: data.notify,
      _email: data.notify ? (data.email ?? null) : null,
    } as never);
    if (error) throw new Error("Kunde inte spara ärendet");
    return { ok: true, images: urls };
  });

export const setTicketStatus = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token, id: z.string().uuid(), status: z.string() }).parse(d))
  .handler(async ({ data }) => {
    if (!statusOk(data.status)) throw new Error("Okänd status");
    const supa = await adminClient(data.token);
    const { error } = await supa.from("tickets").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error("Kunde inte uppdatera status");
    return { ok: true };
  });

export const setSubArchived = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token, subId: z.string().uuid(), archived: z.boolean() }).parse(d))
  .handler(async ({ data }) => {
    const supa = await adminClient(data.token);
    const { error } = await supa.from("sub_projects").update({ archived: data.archived } as never).eq("id", data.subId);
    if (error) throw new Error("Kunde inte uppdatera underprojektet");
    return { ok: true };
  });

export const moveTicket = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token, id: z.string().uuid(), subId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const supa = await adminClient(data.token);
    const { error } = await supa.from("tickets").update({ sub_project_id: data.subId }).eq("id", data.id);
    if (error) throw new Error("Kunde inte flytta ärendet");
    return { ok: true };
  });

async function codeInUse(supa: Awaited<ReturnType<typeof adminClient>>, code: string) {
  const [a, b] = await Promise.all([
    supa.from("projects").select("id").eq("code", code).maybeSingle(),
    supa.from("sub_project_codes").select("id").eq("code", code).maybeSingle(),
  ]);
  return !!(a.data || b.data);
}

export const createProject = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ token, name: z.string().min(1).max(120), code: z.string().min(2).max(40) }).parse(d),
  )
  .handler(async ({ data }) => {
    const supa = await adminClient(data.token);
    const code = data.code.trim().toUpperCase();
    const name = data.name.trim();
    if (await codeInUse(supa, code)) throw new Error(`Koden ${code} används redan`);
    const { error } = await supa.from("projects").insert({ code, name, client: name });
    if (error) throw new Error("Kunde inte skapa projekt");
    return { ok: true, code };
  });

export const createSub = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        token,
        projectCode: z.string().min(1),
        name: z.string().min(1).max(120),
        code: z.string().min(2).max(40),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const supa = await adminClient(data.token);
    const code = data.code.trim().toUpperCase();
    if (await codeInUse(supa, code)) throw new Error(`Koden ${code} används redan`);
    const { data: proj } = await supa.from("projects").select("id").eq("code", data.projectCode).maybeSingle();
    if (!proj) throw new Error("Projektet finns inte");
    const { data: sub, error } = await supa
      .from("sub_projects")
      .insert({ project_id: proj.id, name: data.name.trim() })
      .select("id")
      .single();
    if (error || !sub) throw new Error("Kunde inte skapa underprojekt");
    const { error: ce } = await supa.from("sub_project_codes").insert({ sub_project_id: sub.id, code });
    if (ce) throw new Error("Kunde inte spara koden");
    return { ok: true };
  });

export const addSubCode = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ token, subId: z.string().uuid(), code: z.string().min(2).max(40) }).parse(d),
  )
  .handler(async ({ data }) => {
    const supa = await adminClient(data.token);
    const code = data.code.trim().toUpperCase();
    if (await codeInUse(supa, code)) throw new Error(`Koden ${code} används redan`);
    const { error } = await supa.from("sub_project_codes").insert({ sub_project_id: data.subId, code });
    if (error) throw new Error("Kunde inte lägga till koden");
    return { ok: true };
  });

export const updateProject = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ token, code: z.string().min(1), name: z.string().min(1).max(120).optional(), archived: z.boolean().optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    const supa = await adminClient(data.token);
    const patch: Record<string, unknown> = {};
    if (data.name !== undefined) { patch["name"] = data.name.trim(); patch["client"] = data.name.trim(); }
    if (data.archived !== undefined) patch["archived"] = data.archived;
    const { error } = await supa.from("projects").update(patch as never).eq("code", data.code);
    if (error) throw new Error("Kunde inte uppdatera projektet");
    return { ok: true };
  });

export const deleteProject = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token, code: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const supa = await adminClient(data.token);
    const { data: proj } = await supa.from("projects").select("id").eq("code", data.code).maybeSingle();
    if (!proj) throw new Error("Projektet finns inte");
    const { data: subs } = await supa.from("sub_projects").select("id").eq("project_id", proj.id);
    const ids = (subs ?? []).map((s) => s.id);
    if (ids.length) {
      const { data: tks } = await supa.from("tickets").select("images").in("sub_project_id", ids);
      const prefix = `/storage/v1/object/public/${BUCKET}/`;
      const paths = (tks ?? []).flatMap((t) => (t.images ?? []) as string[])
        .map((u) => { const i = u.indexOf(prefix); return i < 0 ? "" : decodeURIComponent(u.slice(i + prefix.length)); })
        .filter(Boolean);
      if (paths.length) {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin.storage.from(BUCKET).remove(paths);
      }
      const a = await supa.from("tickets").delete().in("sub_project_id", ids);
      const b = await supa.from("sub_project_codes").delete().in("sub_project_id", ids);
      const c = await supa.from("sub_projects").delete().in("id", ids);
      if (a.error || b.error || c.error) throw new Error("Kunde inte ta bort projektets innehåll");
    }
    const { error } = await supa.from("projects").delete().eq("id", proj.id);
    if (error) throw new Error("Kunde inte ta bort projektet");
    return { ok: true };
  });
