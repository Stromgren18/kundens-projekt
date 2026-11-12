import { describe, it, expect, vi, afterEach } from "vitest";
import { completionRecipient, EMAIL_ADMIN, ticketEmail } from "@/lib/email-notifications";
import { sendTicketEmail } from "@/lib/email.server";

const ticket = { id: "a-ticket", title: "Ändra rubrik", body: "Ny text", project: "Webb", subProject: "Start", urgent: false, images: [] };
const completed = { status: "Färdigt", notify: true, email: "customer@example.com", completion_email_sent_at: null };
afterEach(() => vi.unstubAllGlobals());

describe("email notification rules", () => {
  it("sends new ticket notices to the selected admin", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: "email" }) });
    vi.stubGlobal("fetch", fetchMock);
    await sendTicketEmail("new", ticket, { apiKey: "test-only", connectionKey: "test-only" });
    expect(EMAIL_ADMIN).toBe("sten@frilansnorr.se");
    expect(JSON.parse(fetchMock.mock.calls[0]?.[1]?.body ?? "{}").to).toEqual(["sten@frilansnorr.se"]);
  });
  it("notifies consenting customers when the status is Färdigt", () => {
    expect(completionRecipient(completed)).toBe("customer@example.com");
    for (const status of ["Ej läst", "Bekräftat", "Påbörjat"]) expect(completionRecipient({ ...completed, status })).toBeNull();
  });
  it("never notifies customers who did not opt in", () => {
    expect(completionRecipient({ ...completed, notify: false })).toBeNull();
  });
  it("requires a valid saved email address", () => {
    expect(completionRecipient({ ...completed, email: null })).toBeNull();
    expect(completionRecipient({ ...completed, email: "invalid" })).toBeNull();
  });
  it("does not send a second completion notice after a successful send", () => {
    expect(completionRecipient({ ...completed, completion_email_sent_at: "2026-11-12T07:25:00Z" })).toBeNull();
  });
  it("uses the same event key on retries to prevent simultaneous duplicates", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: "email" }) });
    vi.stubGlobal("fetch", fetchMock);
    await sendTicketEmail("completed", ticket, { apiKey: "test-only", connectionKey: "test-only" }, "customer@example.com");
    await sendTicketEmail("completed", ticket, { apiKey: "test-only", connectionKey: "test-only" }, "customer@example.com");
    expect(fetchMock.mock.calls.map(([, init]) => init.headers["Idempotency-Key"])).toEqual(["ticket-a-ticket-completed", "ticket-a-ticket-completed"]);
  });
  it("reports a rejected send rather than marking it successful", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403 }));
    await expect(sendTicketEmail("completed", ticket, { apiKey: "test-only", connectionKey: "test-only" })).rejects.toThrow("Resend 403");
  });
  it("escapes customer input and never includes internal time or access codes", () => {
    const mail = ticketEmail("new", { ...ticket, title: "<script>test</script>" });
    expect(mail.html).not.toContain("<script>");
    expect(mail.html).toContain("&lt;script&gt;");
  });
});