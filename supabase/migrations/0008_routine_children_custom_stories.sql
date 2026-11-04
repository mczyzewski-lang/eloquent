-- Rutyna słuchania, aktywne dziecko (kilkoro dzieci w rodzinie), własne bajki z AI, nagroda „sekretna bajka”.
alter table public.families add column if not exists listening_routine text
  check (listening_routine in ('wakeup','to_kindergarten','from_kindergarten','afternoon','evening','bedtime'));
alter table public.families add column if not exists active_child_id uuid references public.child_profiles(id) on delete set null;

create table if not exists public.custom_stories (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  child_id uuid references public.child_profiles(id) on delete set null,
  story_id text not null unique,
  idea text not null,
  title text not null,
  word text not null,
  story jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists custom_stories_family_idx on public.custom_stories (family_id, created_at desc);
alter table public.custom_stories enable row level security;

-- nagrody programu poleceń: nowa „sekretna bajka”
alter table public.referral_rewards drop constraint if exists referral_rewards_reward_check;
alter table public.referral_rewards add constraint referral_rewards_reward_check
  check (reward in ('special_story','bonus_adventure','free_month','secret_story'));
