<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules

- All Supabase access goes through TanStack server functions in `src/lib/db.functions.ts` using the publishable-key secrets `SUPA_URL`/`SUPA_KEY`; the service-role key is never used in app code. Why: keeps credentials server-side and RLS intact for the user's external Supabase (Lovable Cloud stays disabled).
- Ticket images are uploaded server-side to the public `ticket-images` storage bucket and stored as public URLs in `tickets.images`. Why: browser has no Supabase key; uploads must pass through the server function.
