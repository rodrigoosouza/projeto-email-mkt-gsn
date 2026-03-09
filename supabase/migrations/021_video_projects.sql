-- =============================================
-- Migration 021: Video Projects (Ad Director)
-- =============================================

-- Tabela principal de projetos de video
create table video_projects (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  status text not null default 'draft' check (status in ('draft', 'generating', 'ready', 'approved', 'archived')),

  -- Input do usuario
  script_input text, -- roteiro/conceito original
  ad_idea text,
  target_audience text,
  references_notes text,
  hook text,
  cta_text text,
  angle text,

  -- Configuracao
  scene_count integer default 0,
  image_variants_per_scene integer default 2,
  video_variants_per_scene integer default 2,

  -- Personagens (JSON array)
  characters jsonb default '[]'::jsonb,

  -- Metadata
  created_by uuid not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index video_projects_org_id_idx on video_projects(org_id);
alter table video_projects enable row level security;

create policy "Users can manage video projects from their org"
  on video_projects for all
  using (org_id in (select get_user_org_ids()));

create trigger video_projects_updated_at before update on video_projects
  for each row execute function update_updated_at();

-- Tabela de cenas
create table video_scenes (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references video_projects(id) on delete cascade,

  -- Posicao e tipo
  scene_index integer not null,
  title text not null,
  scene_phase text not null check (scene_phase in ('hook', 'development', 'turning_point', 'cta')),
  scene_type text, -- reaction_phone, office_working, thinking_desk, walking_talking, custom

  -- Conteudo
  objective text,
  narration text,
  visual_description text,
  duration_seconds integer default 8,

  -- Prompts gerados pela IA
  image_prompt text,
  video_prompt text,

  -- Status de aprovacao
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'regenerating')),

  -- URLs de assets gerados (futuro - quando APIs estiverem disponiveis)
  image_urls jsonb default '[]'::jsonb,
  video_urls jsonb default '[]'::jsonb,

  -- Metadata
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index video_scenes_project_id_idx on video_scenes(project_id);
create index video_scenes_project_index_idx on video_scenes(project_id, scene_index);
alter table video_scenes enable row level security;

create policy "Users can manage video scenes via project org"
  on video_scenes for all
  using (
    exists(
      select 1 from video_projects vp
      where vp.id = video_scenes.project_id
      and vp.org_id in (select get_user_org_ids())
    )
  );

create trigger video_scenes_updated_at before update on video_scenes
  for each row execute function update_updated_at();
