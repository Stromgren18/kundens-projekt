import { describe, it, expect } from "vitest";
import { checkFile, MAX_FILES, MAX_IMAGE_BYTES } from "@/lib/upload";

const MB = 1024 * 1024;
describe("upload limits", () => {
  it("allows max 5 files", () => expect(MAX_FILES).toBe(5));
  it("caps finished images at 700 kB", () => expect(MAX_IMAGE_BYTES).toBe(700 * 1024));
  it("rejects images over 25 MB original", () => {
    expect(checkFile({ name: "a.jpg", type: "image/jpeg", size: 26 * MB })).not.toBeNull();
    expect(checkFile({ name: "a.jpg", type: "image/jpeg", size: 24 * MB })).toBeNull();
  });
  it("accepts PDF up to 10 MB", () => {
    expect(checkFile({ name: "a.pdf", type: "application/pdf", size: 9 * MB })).toBeNull();
    expect(checkFile({ name: "a.pdf", type: "application/pdf", size: 11 * MB })).not.toBeNull();
  });
  it("rejects other file types", () => {
    expect(checkFile({ name: "a.zip", type: "application/zip", size: 1000 })).not.toBeNull();
  });
});
