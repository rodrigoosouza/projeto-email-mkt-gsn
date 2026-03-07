-- =============================================
-- Migration 002: API Keys
-- Chaves de API por organizacao para webhooks
-- =============================================

-- ==================== API_KEYS ====================
create table api_keys (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  key_prefix text not null, -- first 8 chars for identification (sk_org_xx)
  key_hash text not null unique, -- SHA-256 hash of full key
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  last_used_at timestamp with time zone,
  created_by uuid not null references users(id) on delete cascade
);

create index api_keys_org_id_idx on api_keys(org_id);
create index api_keys_key_hash_idx on api_keys(key_hash);

alter table api_keys enable row level security;

create policy "Admins can manage API keys in their org"
  on api_keys for all
  using (
    exists(
      select 1 from organization_members
      where org_id = api_keys.org_id
        and user_id = auth.uid()
        and role = 'admin'
    )
  );

-- ==================== FUNCTION: validate_api_key ====================
-- Used by Edge Functions / API routes to validate incoming API keys
create or replace function validate_api_key(api_key text)
returns uuid as $$
declare
  org uuid;
begin
  select ak.org_id into org
  from api_keys ak
  where ak.key_hash = encode(digest(api_key, 'sha256'), 'hex')
    and ak.is_active = true;

  if org is not null then
    update api_keys
    set last_used_at = now()
    where key_hash = encode(digest(api_key, 'sha256'), 'hex');
  end if;

  return org;
end;
$$ language plpgsql security definer;
