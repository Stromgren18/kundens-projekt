-- Roles
create type public.app_role as enum ('admin');
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "Egen roll kan läsas" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

insert into public.user_roles (user_id, role) values ('8a34260e-17d3-445b-aedb-af31833ad0d5', 'admin');

-- Replace open policies with admin-only
drop policy if exists "Tillåt läsning av projekt" on public.projects;
drop policy if exists "Tillåt skapande av projekt" on public.projects;
drop policy if exists "Tillåt uppdatering av projekt" on public.projects;
drop policy if exists "Tillåt läsning av underprojekt" on public.sub_projects;
drop policy if exists "Tillåt skapande av underprojekt" on public.sub_projects;
drop policy if exists "Tillåt uppdatering av underprojekt" on public.sub_projects;
drop policy if exists "Tillåt läsning av koder" on public.sub_project_codes;
drop policy if exists "Tillåt skapande av koder" on public.sub_project_codes;
drop policy if exists "Tillåt läsning av ärenden" on public.tickets;
drop policy if exists "Tillåt skapande av ärenden" on public.tickets;
drop policy if exists "Tillåt uppdatering av ärenden" on public.tickets;

create policy "Admin hanterar projekt" on public.projects for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Admin hanterar underprojekt" on public.sub_projects for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Admin hanterar koder" on public.sub_project_codes for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Admin hanterar ärenden" on public.tickets for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- Customer access by code (returns only the allowed sub-projects, never emails or codes)
create or replace function public.portal_load(_code text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c text := upper(trim(_code)); p public.projects; sub_ids uuid[];
begin
  select * into p from public.projects where code = c;
  if found then
    select coalesce(array_agg(id), '{}') into sub_ids from public.sub_projects where project_id = p.id;
  else
    select pr.* into p from public.projects pr
      join public.sub_projects s on s.project_id = pr.id
      join public.sub_project_codes sc on sc.sub_project_id = s.id
      where sc.code = c limit 1;
    if not found then return null; end if;
    select array_agg(sc.sub_project_id) into sub_ids from public.sub_project_codes sc where sc.code = c;
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
  select exists (select 1 from public.projects p join public.sub_projects s on s.project_id = p.id
                 where p.code = upper(trim(_code)) and s.id = _sub_id)
      or exists (select 1 from public.sub_project_codes where code = upper(trim(_code)) and sub_project_id = _sub_id)
$$;

create or replace function public.portal_create_ticket(_code text, _sub_id uuid, _title text, _body text,
  _images text[], _notify boolean, _email text)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  if not public.portal_can_access(_code, _sub_id) then raise exception 'Ogiltig kod'; end if;
  if length(_title) < 1 or length(_title) > 200 or length(_body) < 1 or length(_body) > 5000
     or coalesce(array_length(_images, 1), 0) > 10 then raise exception 'Ogiltiga uppgifter'; end if;
  insert into public.tickets (sub_project_id, title, body, images, notify, email, status)
  values (_sub_id, _title, _body, coalesce(_images, '{}'), coalesce(_notify, false),
          case when _notify then _email else null end, 'Ej läst')
  returning id into new_id;
  return new_id;
end $$;

revoke all on function public.portal_load(text), public.portal_can_access(text, uuid),
  public.portal_create_ticket(text, uuid, text, text, text[], boolean, text) from public;
grant execute on function public.portal_load(text), public.portal_can_access(text, uuid),
  public.portal_create_ticket(text, uuid, text, text, text[], boolean, text) to anon, authenticated;

-- Storage: no anonymous uploads or listing; files are still served via public URLs
drop policy if exists "Tillåt bilduppladdning" on storage.objects;
drop policy if exists "Publik bildvisning" on storage.objects;