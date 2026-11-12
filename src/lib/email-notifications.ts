import { z } from "zod";

export const EMAIL_ADMIN = "sten@frilansnorr.se";
export const EMAIL_FROM = "Frilans Norr <aviseringar@projekt.frilansnorr.se>";
export const PORTAL_URL = "https://projekt.frilansnorr.se";

export type TicketEmail = {
  id: string;
  title: string;
  body: string;
  project: string;
  subProject: string;
  urgent: boolean;
  images: string[];
  email?: string | null | undefined;
};

export function completionRecipient(ticket: {
  status: string;
  notify: boolean | null;
  email: string | null;
  completion_email_sent_at?: string | null;
}): string | null {
  if (ticket.status !== "Färdigt" || !ticket.notify || ticket.completion_email_sent_at) return null;
  const parsed = z.string().email().safeParse(ticket.email);
  return parsed.success ? parsed.data : null;
}

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (c) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[c] ?? c));

export function ticketEmail(kind: "new" | "completed", ticket: TicketEmail) {
  const done = kind === "completed";
  const heading = done ? "Ditt ärende är färdigt" : `${ticket.urgent ? "🚩 AKUT – " : ""}Nytt kundärende`;
  const text = `${heading}\n\n${ticket.title}\nProjekt: ${ticket.project}\nUnderprojekt: ${ticket.subProject}\n\n${done ? "Vi har nu slutfört ditt ärende. Tack!" : ticket.body}${!done && ticket.email ? `\n\nKundens e-post: ${ticket.email}` : ""}${!done && ticket.images.length ? `\n\nBifogade filer: ${ticket.images.length}` : ""}\n\n${PORTAL_URL}${done ? "" : "/admin"}`;
  const html = `<html lang="sv"><body><h1>Frilans Norr</h1><h2>${escapeHtml(heading)}</h2><h3>${escapeHtml(ticket.title)}</h3><p>Projekt: ${escapeHtml(ticket.project)}<br>Underprojekt: ${escapeHtml(ticket.subProject)}</p><p>${escapeHtml(done ? "Vi har nu slutfört ditt ärende. Tack!" : ticket.body).replace(/\n/g, "<br>")}</p>${!done && ticket.email ? `<p>Kundens e-post: ${escapeHtml(ticket.email)}</p>` : ""}${!done && ticket.images.length ? `<p>Bifogade filer: ${ticket.images.length} (finns i portalen)</p>` : ""}<p><a href="${PORTAL_URL}${done ? "" : "/admin"}">${done ? "Öppna projektportalen" : "Öppna adminöversikten"}</a></p></body></html>`;
  return {
    subject: `${done ? "[Färdigt]" : ticket.urgent ? "[AKUT – nytt ärende]" : "[Nytt ärende]"} ${ticket.project} – ${ticket.title}`.replace(/[\r\n]/g, " "),
    text,
    html,
  };
}