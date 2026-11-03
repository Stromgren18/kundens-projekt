import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client for the user's EXTERNAL Supabase project.
 * Credentials come from the project secrets SUPA_URL / SUPA_KEY (publishable key)
 * and are only ever read inside server function handlers.
 */
export function getSupa() {
  const url = process.env["SUPA_URL"];
  const key = process.env["SUPA_KEY"];
  if (!url || !key) throw new Error("Saknar SUPA_URL / SUPA_KEY – Supabase är inte kopplat");
  return createClient(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}
