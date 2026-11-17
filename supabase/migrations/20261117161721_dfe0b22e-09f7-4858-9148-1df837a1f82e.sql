CREATE TABLE public.ticket_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  body text NOT NULL DEFAULT '',
  internal boolean NOT NULL DEFAULT false,
  status text,
  emailed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ticket_notes_ticket_idx ON public.ticket_notes(ticket_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ticket_notes TO authenticated;
GRANT ALL ON public.ticket_notes TO service_role;
ALTER TABLE public.ticket_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin hanterar noteringar" ON public.ticket_notes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

create or replace function public.portal_load(_code text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c text := upper(trim(_code)); p public.projects; sub_ids uuid[];
begin
  select * into p from public.projects where code = c and not archived;
  if found then
    select coalesce(array_agg(id), '{}') into sub_ids from public.sub_projects where project_id = p.id and not archived;
  else
    select pr.* into p from public.projects pr
      join public.sub_projects s on s.project_id = pr.id
      join public.sub_project_codes sc on sc.sub_project_id = s.id
      where sc.code = c and not s.archived and not pr.archived limit 1;
    if not found then return null; end if;
    select array_agg(sc.sub_project_id) into sub_ids from public.sub_project_codes sc
      join public.sub_projects s on s.id = sc.sub_project_id where sc.code = c and not s.archived;
  end if;
  return jsonb_build_object(
    'code', p.code, 'name', p.name, 'client', p.client,
    'subs', coalesce((select jsonb_agg(jsonb_build_object(
      'id', s.id, 'name', s.name, 'codes', '[]'::jsonb,
      'tickets', coalesce((select jsonb_agg(jsonb_build_object(
          'id', t.id, 'title', t.title, 'body', t.body, 'images', to_jsonb(t.images),
          'notify', t.notify, 'status', t.status, 'urgent', t.urgent, 'created_at', t.created_at,
          'notes', coalesce((select jsonb_agg(jsonb_build_object('id', n.id, 'body', n.body, 'status', n.status, 'created_at', n.created_at) order by n.created_at)
             from public.ticket_notes n where n.ticket_id = t.id and not n.internal), '[]'::jsonb)
        ) order by t.created_at desc)
        from public.tickets t where t.sub_project_id = s.id), '[]'::jsonb)
    ) order by s.created_at) from public.sub_projects s where s.id = any(sub_ids)), '[]'::jsonb)
  );
end $$;