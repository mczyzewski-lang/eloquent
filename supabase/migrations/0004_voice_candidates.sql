-- Kandydaci na głos Elofika (Admin → Głos Elofika). Tylko backend (service-role).
create table if not exists public.voice_candidates (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('design','library')),
  name text not null,
  description text not null default '',
  generated_voice_id text,
  voice_id text,
  preview_path text,
  demo_text text not null default '',
  created_at timestamptz not null default now()
);
alter table public.voice_candidates enable row level security;
