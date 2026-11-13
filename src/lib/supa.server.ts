import { createClient } from "@supabase/supabase-js";

function creds() {
  const url = process.env["SUPA_URL"] || process.env["SUPABASE_URL"];
  const key = process.env["SUPA_KEY"] || process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Saknar SUPA_URL / SUPA_KEY – Supabase är inte kopplat");
  return { url, key };
}

// New Supabase API keys (sb_publishable_/sb_secret_) are opaque, not JWTs.
// PostgREST rejects them in the Authorization header, so strip it and rely on apikey.
function isOpaqueApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function supaFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }
    if (isOpaqueApiKey(supabaseKey) && headers.get("Authorization") === `Bearer ${supabaseKey}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

const noSession = { storage: undefined, persistSession: false, autoRefreshToken: false };

/** Anonymous (publishable-key) client; only reaches the code-gated portal_* functions. */
export function getSupa() {
  const { url, key } = creds();
  return createClient(url, key, { auth: noSession, global: { fetch: supaFetch(key) } });
}

/** Client acting as the signed-in user (RLS applies with their JWT). */
export function getUserSupa(accessToken: string) {
  const { url, key } = creds();
  return createClient(url, key, {
    auth: noSession,
    global: { fetch: supaFetch(key), headers: { Authorization: `Bearer ${accessToken}` } },
  });
}
