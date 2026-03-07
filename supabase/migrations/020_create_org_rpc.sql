-- =============================================
-- Migration 020: RPC para criar organizacao + membro
-- =============================================

-- Funcao que cria org e adiciona o usuario como admin
create or replace function create_organization_with_member(
  org_name text,
  org_slug text
)
returns json
language plpgsql
security definer
as $$
declare
  new_org_id uuid;
  current_user_id uuid;
  result json;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'User not authenticated';
  end if;

  -- Criar organizacao
  insert into organizations (name, slug, created_by)
  values (org_name, org_slug, current_user_id)
  returning id into new_org_id;

  -- Adicionar usuario como admin
  insert into organization_members (org_id, user_id, role)
  values (new_org_id, current_user_id, 'admin');

  -- Garantir que usuario existe na tabela users
  insert into users (id, email, name)
  select current_user_id, au.email, au.raw_user_meta_data->>'name'
  from auth.users au
  where au.id = current_user_id
  on conflict (id) do nothing;

  -- Retornar org criada
  select json_build_object(
    'id', o.id,
    'name', o.name,
    'slug', o.slug,
    'created_at', o.created_at
  ) into result
  from organizations o
  where o.id = new_org_id;

  return result;
end;
$$;

-- Auto-confirmar email de novos usuarios (evitar dependencia de SMTP)
create or replace function auto_confirm_user()
returns trigger
language plpgsql
security definer
as $$
begin
  new.email_confirmed_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_auto_confirm on auth.users;

create trigger on_auth_user_auto_confirm
  before insert on auth.users
  for each row
  execute function auto_confirm_user();
