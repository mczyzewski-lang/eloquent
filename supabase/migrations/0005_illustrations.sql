-- System ilustracji Elofika: wersjonowane referencje + ilustracje z akceptacją przed publikacją.
create table if not exists public.reference_assets (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('master','sheet')),
  version int not null,
  label text not null,
  storage_path text not null,
  status text not null default 'proposed' check (status in ('proposed','approved','retired')),
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.illustrations (
  id uuid primary key default gen_random_uuid(),
  story_id text not null,
  story_version int not null default 1,
  image_type text not null check (image_type in ('COVER','INTERIOR','CHARACTER_ONLY')),
  slot text,
  version int not null,
  scene jsonb not null default '{}',
  prompt text not null,
  prompt_version text not null,
  reference_id uuid not null references public.reference_assets(id),
  reference_version int not null,
  model text not null,
  size text not null,
  quality text not null,
  cache_key text not null,
  storage_path text,
  status text not null default 'pending' check (status in ('pending','approved','rejected','failed')),
  est_usd numeric(10,4) not null default 0,
  error text,
  created_by text not null,
  created_at timestamptz not null default now(),
  reviewed_by text,
  reviewed_at timestamptz
);
create index if not exists illustrations_story_idx on public.illustrations(story_id, image_type, status);
create index if not exists illustrations_cache_idx on public.illustrations(cache_key);

alter table public.reference_assets enable row level security;
alter table public.illustrations enable row level security;
-- brak polityk: dostęp wyłącznie przez backend (service-role)
