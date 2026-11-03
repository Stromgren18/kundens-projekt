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

- All Supabase access goes through TanStack server functions (`src/lib/db.functions.ts`, `src/lib/auth.functions.ts`) using `SUPA_URL`/`SUPA_KEY`. Customers reach data only via code-gated SECURITY DEFINER RPCs (`portal_load`, `portal_create_ticket`); admin functions require the admin's access token and RLS checks `has_role(auth.uid(),'admin')`. Why: project codes and customer emails must never be readable anonymously.
- Ticket images are uploaded server-side with the service-role client only after the code is verified, into the public `ticket-images` bucket (no anon storage policies). Why: anonymous clients must not write or list storage.
