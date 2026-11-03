import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupa } from "./supa.server";

/** Admin sign-in against the external Supabase Auth. Returns the access token on success. */
export const adminSignIn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ email: z.string().email(), password: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const { data: res, error } = await getSupa().auth.signInWithPassword(data);
    if (error || !res.session) throw new Error("Fel e-post eller lösenord");
    return { token: res.session.access_token };
  });

/** Sets the password using the access token from an invite/recovery link. */
export const adminSetPassword = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ accessToken: z.string().min(10), password: z.string().min(8) }).parse(d))
  .handler(async ({ data }) => {
    const url = process.env["SUPA_URL"];
    const key = process.env["SUPA_KEY"];
    if (!url || !key) throw new Error("Supabase är inte kopplat");
    const r = await fetch(`${url}/auth/v1/user`, {
      method: "PUT",
      headers: { apikey: key, Authorization: `Bearer ${data.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ password: data.password }),
    });
    if (!r.ok) throw new Error("Länken är ogiltig eller har gått ut");
    return { token: data.accessToken };
  });
