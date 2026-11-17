import { EMAIL_ADMIN, EMAIL_FROM, ticketEmail, type TicketEmail } from "./email-notifications";

type Credentials = { apiKey: string | undefined; connectionKey: string | undefined };

/** Called only from the feature's server handler, never from an email-send endpoint. */
export async function sendTicketEmail(
  kind: "new" | "completed" | "update",
  ticket: TicketEmail & { message?: string; status?: string },
  credentials: Credentials,
  recipient = EMAIL_ADMIN,
  idempotencyKey = `ticket-${ticket.id}-${kind}`,
) {
  if (!credentials.apiKey || !credentials.connectionKey) throw new Error("Mejltjänsten är inte konfigurerad");
  const response = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${credentials.apiKey}`,
      "X-Connection-Api-Key": credentials.connectionKey,
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({ from: EMAIL_FROM, to: [recipient], reply_to: EMAIL_ADMIN, ...ticketEmail(kind, ticket) }),
  });
  if (!response.ok) {
    // Don't log customer data or provider bodies that might echo credentials.
    console.error(`Resend send failed [${response.status}]`);
    throw new Error(`Mejlet kunde inte skickas (Resend ${response.status})`);
  }
  const result: unknown = await response.json();
  if (!result || typeof result !== "object" || !("id" in result)) throw new Error("Resend bekräftade inte utskicket");
}