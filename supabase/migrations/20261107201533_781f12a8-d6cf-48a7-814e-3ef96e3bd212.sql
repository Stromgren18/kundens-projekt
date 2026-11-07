alter table public.tickets add column if not exists urgent boolean not null default false;
alter table public.tickets add column if not exists time_spent text;

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
          'notify', t.notify, 'urgent', t.urgent, 'status', t.status, 'created_at', t.created_at) order by t.created_at desc)
        from public.tickets t where t.sub_project_id = s.id), '[]'::jsonb)
    ) order by s.created_at) from public.sub_projects s where s.id = any(sub_ids)), '[]'::jsonb)
  );
end $$;

create or replace function public.portal_create_ticket(_code text, _sub_id uuid, _title text, _body text,
  _images text[], _notify boolean, _email text, _urgent boolean)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  if not public.portal_can_access(_code, _sub_id) then raise exception 'Ogiltig kod'; end if;
  if length(_title) < 1 or length(_title) > 200 or length(_body) < 1 or length(_body) > 5000
     or coalesce(array_length(_images, 1), 0) > 10 then raise exception 'Ogiltiga uppgifter'; end if;
  insert into public.tickets (sub_project_id, title, body, images, notify, email, status, urgent)
  values (_sub_id, _title, _body, coalesce(_images, '{}'), coalesce(_notify, false),
          case when _notify then _email else null end, 'Ej läst', coalesce(_urgent, false))
  returning id into new_id;
  return new_id;
end $$;
revoke all on function public.portal_create_ticket(text, uuid, text, text, text[], boolean, text, boolean) from public;
grant execute on function public.portal_create_ticket(text, uuid, text, text, text[], boolean, text, boolean) to anon, authenticated;
drop function if exists public.portal_create_ticket(text, uuid, text, text, text[], boolean, text);