import { createClient } from "@supabase/supabase-js";

function creds() {
  const url = process.env["SUPA_URL"];
  const key = process.env["SUPA_KEY"];
  if (!url || !key) throw new Error("Saknar SUPA_URL / SUPA_KEY – Supabase är inte kopplat");
  return { url, key };
}

const noSession = { storage: undefined, persistSession: false, autoRefreshToken: false };

/** Anonymous (publishable-key) client; only reaches the code-gated portal_* functions. */
export function getSupa() {
  const { url, key } = creds();
  return createClient(url, key, { auth: noSession });
}

/** Client acting as the signed-in user (RLS applies with their JWT). */
export function getUserSupa(accessToken: string) {
  const { url, key } = creds();
  return createClient(url, key, {
    auth: noSession,
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}
