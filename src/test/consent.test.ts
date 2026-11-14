import { beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  localStorage.clear();
  Object.defineProperty(navigator, "globalPrivacyControl", { configurable: true, value: false });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, text: async () => `h=${location.hostname}\nloc=SE` }));
});

describe("analytics consent", () => {
  it("blocks unanswered analytics in Sweden", async () => {
    const consent = await import("@/lib/consent");
    expect(await consent.needsAnswer(["analytics"])).toBe(true);
    expect(await consent.canTrack("analytics")).toBe(false);
  });
  it("saves acceptance and lets a later refusal override it", async () => {
    const consent = await import("@/lib/consent");
    consent.saveChoices({ analytics: "granted" });
    expect(await consent.canTrack("analytics")).toBe(true);
    consent.saveChoices({ analytics: "denied" });
    expect(await consent.canTrack("analytics")).toBe(false);
    expect(await consent.needsAnswer(["analytics"])).toBe(false);
    expect(consent.readChoice("advertising")).toBeNull();
  });
  it("honours browser privacy control over acceptance", async () => {
    const consent = await import("@/lib/consent");
    consent.saveChoices({ analytics: "granted" });
    Object.defineProperty(navigator, "globalPrivacyControl", { configurable: true, value: true });
    expect(await consent.canTrack("analytics")).toBe(false);
    expect(await consent.needsAnswer(["analytics"])).toBe(false);
  });
});