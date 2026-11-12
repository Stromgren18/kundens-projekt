import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), send: vi.fn(), from: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({ inputValidator: (validate: (v: unknown) => unknown) => ({ handler: (fn: (args: { data: unknown }) => unknown) => (args: { data: unknown }) => fn({ data: validate(args.data) }) }) }),
}));
vi.mock("@/lib/supa.server", () => ({
  getSupa: () => ({ rpc: mocks.rpc }),
  getUserSupa: () => ({ auth: { getUser: async () => ({ data: { user: { id: "admin" } }, error: null }) }, from: mocks.from }),
}));
vi.mock("@/lib/email.server", () => ({ sendTicketEmail: mocks.send }));
import { createTicket, setTicketStatus } from "@/lib/db.functions";

const subId = "11111111-1111-4111-8111-111111111111";
const ticketId = "22222222-2222-4222-8222-222222222222";
const input = { projectCode: "TEST", subId, title: "Test", body: "Beskrivning", notify: true, urgent: false, email: "customer@example.com", files: [] };

beforeEach(() => { vi.clearAllMocks(); mocks.send.mockResolvedValue(undefined); });
describe("ticket email triggers", () => {
  it("saves the customer ticket before sending the admin notice", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: { name: "Projekt", subs: [{ id: subId, name: "Underprojekt" }] } }).mockResolvedValueOnce({ data: ticketId, error: null });
    const result = await createTicket({ data: input });
    expect(result.emailWarning).toBe("");
    expect(mocks.send.mock.calls[0]?.[0]).toBe("new");
    expect(mocks.send.mock.calls[0]?.[1]?.id).toBe(ticketId);
    const sendOrder = mocks.send.mock.invocationCallOrder[0];
    if (sendOrder === undefined) throw new Error("Expected email send");
    expect(mocks.rpc.mock.invocationCallOrder[1]).toBeLessThan(sendOrder);
  });
  it("keeps the ticket saved when Resend rejects a send", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: { name: "Projekt", subs: [{ id: subId }] } }).mockResolvedValueOnce({ data: ticketId, error: null });
    mocks.send.mockRejectedValueOnce(new Error("Resend rejected"));
    const result = await createTicket({ data: input });
    expect(result.ok).toBe(true);
    expect(result.emailWarning).not.toBe("");
  });
  it("does not send when the project code is invalid", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null });
    await expect(createTicket({ data: input })).rejects.toThrow("Ogiltig kod");
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("does not accept notification opt-in without an email", async () => {
    await expect(Promise.resolve().then(() => createTicket({ data: { ...input, email: undefined } }))).rejects.toThrow();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("sends and records the completion receipt after the admin saves Färdigt", async () => {
    const updates: unknown[] = [];
    mocks.from.mockImplementation((table: string) => {
      const chain: Record<string, unknown> = {};
      chain["select"] = () => chain;
      chain["eq"] = () => chain;
      chain["update"] = (patch: unknown) => { updates.push(patch); return chain; };
      chain["then"] = (resolve: (v: unknown) => unknown) => Promise.resolve({ error: null }).then(resolve);
      chain["maybeSingle"] = async () => ({ data: { role: "admin" } });
      chain["single"] = async () => ({ data: table === "tickets" ? { id: ticketId, sub_project_id: subId, title: "Test", body: "Beskrivning", status: "Påbörjat", notify: true, email: "customer@example.com", images: [], urgent: false, completion_email_sent_at: null } : table === "sub_projects" ? { name: "Underprojekt", project_id: "project" } : { name: "Projekt" }, error: null });
      return chain;
    });
    const result = await setTicketStatus({ data: { token: "test-only-access-token", id: ticketId, status: "Färdigt" } });
    expect(updates[0]).toEqual({ status: "Färdigt" });
    expect(mocks.send.mock.calls[0]?.[0]).toBe("completed");
    expect(mocks.send.mock.calls[0]?.[3]).toBe("customer@example.com");
    expect(updates[1]).toHaveProperty("completion_email_sent_at");
    expect(result.emailWarning).toBe("");
  });
});