alter table public.sub_projects add column if not exists archived boolean not null default false;

create or replace function public.portal_load(_code text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c text := upper(trim(_code)); p public.projects; sub_ids uuid[];
begin
  select * into p from public.projects where code = c;
  if found then
    select coalesce(array_agg(id), '{}') into sub_ids from public.sub_projects where project_id = p.id and not archived;
  else
    select pr.* into p from public.projects pr
      join public.sub_projects s on s.project_id = pr.id
      join public.sub_project_codes sc on sc.sub_project_id = s.id
      where sc.code = c and not s.archived limit 1;
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
          'notify', t.notify, 'status', t.status, 'created_at', t.created_at) order by t.created_at desc)
        from public.tickets t where t.sub_project_id = s.id), '[]'::jsonb)
    ) order by s.created_at) from public.sub_projects s where s.id = any(sub_ids)), '[]'::jsonb)
  );
end $$;

create or replace function public.portal_can_access(_code text, _sub_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.sub_projects s where s.id = _sub_id and not s.archived) and (
    exists (select 1 from public.projects p join public.sub_projects s on s.project_id = p.id
                 where p.code = upper(trim(_code)) and s.id = _sub_id)
      or exists (select 1 from public.sub_project_codes where code = upper(trim(_code)) and sub_project_id = _sub_id))
$$;
revoke all on function public.portal_can_access(text, uuid) from public, anon, authenticated;