-- =============================================================================
-- Elofik — schemat bazy (Supabase PostgreSQL)
-- Zasada: serwer aplikacji używa service-role i autoryzuje po family_id z sesji.
-- RLS jest drugą linią obrony: klient z kluczem anon/authenticated widzi wyłącznie dane własnej rodziny.
-- =============================================================================

create extension if not exists "pgcrypto";

-- ---------- Użytkownicy i rodziny -------------------------------------------
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null unique references public.users(id) on delete cascade,
  timezone text not null default 'Europe/Warsaw',
  locale text not null default 'pl' check (locale in ('pl','en','es','de','fr')),
  activated_at timestamptz,
  referral_code text not null unique,
  referred_by_code text,
  voice_greeting_enabled boolean not null default true,
  voice_consent_at timestamptz,
  marketing_consent_at timestamptz,
  stripe_customer_id text unique,
  created_at timestamptz not null default now()
);

create table if not exists public.child_profiles (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 30),
  age smallint not null check (age between 3 and 8),
  diminutive text,
  vocative_override text,
  diminutive_vocative_override text,
  gender text check (gender in ('m','f','n')),
  address_style text not null default 'diminutive' check (address_style in ('diminutive','full','name_only')),
  created_at timestamptz not null default now()
);
create index if not exists child_profiles_family_idx on public.child_profiles(family_id);

create table if not exists public.family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  relation text not null check (relation in ('mom','dad','grandma','grandpa','brother','sister','dog','cat','other')),
  name text not null check (char_length(name) between 1 and 30),
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists family_members_family_idx on public.family_members(family_id);

create table if not exists public.interests (
  id text primary key,
  label_pl text not null,
  label_en text not null,
  icon text not null
);

create table if not exists public.child_interests (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.child_profiles(id) on delete cascade,
  interest_id text not null references public.interests(id),
  unique (child_id, interest_id)
);

-- ---------- Bajki -------------------------------------------------------------
create table if not exists public.stories (
  id text primary key, -- slug, np. dzien-01-tajemniczy-slad
  day_number int not null,
  locale text not null default 'pl',
  current_version int not null default 1,
  status text not null default 'draft' check (status in ('draft','in_review','approved','core_generated','published','archived')),
  scheduled_for date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists stories_day_locale_published_uq on public.stories(locale, day_number) where status = 'published';

create table if not exists public.story_versions (
  id uuid primary key default gen_random_uuid(),
  story_id text not null references public.stories(id) on delete cascade,
  version int not null,
  data jsonb not null, -- pełny manifest (StoryVersion)
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (story_id, version)
);

-- Segmenty w formie relacyjnej (raporty / edycja SQL). Źródłem prawdy dla renderu jest story_versions.data.
create table if not exists public.story_segments (
  id uuid primary key default gen_random_uuid(),
  story_version_id uuid not null references public.story_versions(id) on delete cascade,
  segment_key text not null,
  sort_order int not null,
  type text not null check (type in ('CORE','PERSONALIZED_CHILD','PERSONALIZED_FAMILY','OPTIONAL','EDUCATIONAL')),
  text text not null,
  fallback_text text,
  pause_after_ms int not null default 450,
  unique (story_version_id, segment_key)
);

-- ---------- Audio -------------------------------------------------------------
create table if not exists public.audio_assets (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  kind text not null check (kind in ('segment','assembly','greeting','sample','music')),
  content_type text not null,
  bytes int,
  created_at timestamptz not null default now()
);

create table if not exists public.audio_cache (
  id uuid primary key default gen_random_uuid(),
  cache_key text not null unique, -- sha256(tekst + voice + model + ustawienia + język + wersje)
  storage_path text not null,
  duration_ms int not null default 0,
  chars int not null default 0,
  provider text not null,
  voice_version text not null,
  segment_type text not null,
  shared boolean not null default false,
  hits int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.audio_assemblies (
  id uuid primary key default gen_random_uuid(),
  assembly_key text not null unique,
  story_id text not null,
  story_version int not null,
  storage_path text not null,
  duration_ms int not null,
  segment_keys text[] not null,
  timeline jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table if not exists public.family_assemblies (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  story_id text not null,
  assembly_key text not null references public.audio_assemblies(assembly_key),
  created_at timestamptz not null default now(),
  unique (family_id, story_id)
);

create table if not exists public.greetings (
  id text not null, -- np. RETURNING_GREETING_03
  locale text not null,
  kind text not null check (kind in ('FIRST_MEETING','RETURNING_NEXT_DAY','RETURNING_SAME_DAY','RETURNING_AFTER_BREAK')),
  template text not null,
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (id, locale)
);

create table if not exists public.greeting_audio_cache (
  id uuid primary key default gen_random_uuid(),
  child_name_key text not null,
  variant_id text not null,
  voice_version text not null,
  locale text not null,
  address text not null,
  cache_key text not null references public.audio_cache(cache_key),
  text text not null,
  created_at timestamptz not null default now(),
  unique (child_name_key, variant_id, voice_version, locale, address)
);

-- Sesje rytuału: BEZ nagrań i BEZ pełnych transkrypcji — tylko wynik dopasowania i czas połączenia.
create table if not exists public.voice_greeting_sessions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  story_id text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_ms int,
  outcome text not null default 'pending' check (outcome in ('pending','recognized','failed','timeout','error','skipped')),
  attempt int not null default 1,
  match_confidence real
);
create index if not exists voice_sessions_family_story_idx on public.voice_greeting_sessions(family_id, story_id, started_at desc);

-- ---------- Postęp i odblokowania --------------------------------------------
create table if not exists public.story_unlocks (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  story_id text not null,
  day_number int not null,
  unlocked_at timestamptz not null default now(),
  unique (family_id, story_id)
);

create table if not exists public.listening_progress (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  story_id text not null,
  position_sec real not null default 0,
  duration_sec real not null default 0,
  completed boolean not null default false,
  play_count int not null default 0,
  favorite boolean not null default false,
  word_discussed boolean not null default false,
  first_played_at timestamptz,
  last_played_at timestamptz,
  unique (family_id, story_id)
);

-- ---------- Płatności ---------------------------------------------------------
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  source text not null check (source in ('stripe','gift','referral','demo')),
  stripe_subscription_id text unique,
  status text not null,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- jedna aktywna subskrypcja Stripe na rodzinę (ochrona przed podwójnym abonamentem)
create unique index if not exists one_active_stripe_sub_per_family on public.subscriptions(family_id)
  where source = 'stripe' and status in ('active','trialing','past_due','incomplete');

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.families(id) on delete set null,
  stripe_invoice_id text unique,
  stripe_session_id text,
  kind text not null check (kind in ('subscription','gift')),
  amount_gross int not null,
  currency text not null default 'pln',
  status text not null check (status in ('paid','failed','refunded')),
  created_at timestamptz not null default now()
);

-- ---------- Prezenty ----------------------------------------------------------
create table if not exists public.gift_purchases (
  id uuid primary key default gen_random_uuid(),
  buyer_email text not null,
  giver_name text not null,
  giver_relation text not null check (giver_relation in ('grandma','grandpa','other')),
  child_name text not null,
  child_age smallint not null,
  family_members jsonb not null default '[]',
  interests text[] not null default '{}',
  parent_email text,
  stripe_session_id text unique,
  status text not null default 'pending' check (status in ('pending','paid','redeemed','expired','refunded')),
  token_hash text unique, -- przechowujemy wyłącznie hash tokenu aktywacyjnego
  expires_at timestamptz,
  redeemed_at timestamptz,
  redeemed_family_id uuid references public.families(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.gift_entitlements (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  gift_purchase_id uuid not null unique references public.gift_purchases(id), -- jeden prezent = jedno wykorzystanie
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.gift_redemptions (
  id uuid primary key default gen_random_uuid(),
  gift_purchase_id uuid not null unique references public.gift_purchases(id),
  family_id uuid not null references public.families(id) on delete cascade,
  redeemed_at timestamptz not null default now()
);

create table if not exists public.gift_stories (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  child_name text not null,
  child_age smallint not null,
  giver_relation text not null check (giver_relation in ('grandma','grandpa')),
  giver_name text not null,
  interests text[] not null default '{}',
  assembly_key text references public.audio_assemblies(assembly_key),
  expires_at timestamptz not null,
  play_count int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- Polecenia --------------------------------------------------------
create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_family_id uuid not null references public.families(id) on delete cascade,
  referee_family_id uuid not null unique references public.families(id) on delete cascade,
  status text not null check (status in ('pending','qualified','rejected')),
  reason text,
  qualified_at timestamptz,
  created_at timestamptz not null default now(),
  check (referrer_family_id <> referee_family_id)
);

create table if not exists public.referral_rewards (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  reward text not null check (reward in ('special_story','bonus_adventure','free_month')),
  granted_at timestamptz not null default now(),
  unique (family_id, reward)
);

-- ---------- Kolejka, koszty, analityka ----------------------------------------
create table if not exists public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  payload jsonb not null default '{}',
  status text not null default 'queued' check (status in ('queued','running','done','failed')),
  attempts int not null default 0,
  max_attempts int not null default 3,
  run_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  error text,
  dedupe_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists generation_jobs_claim_idx on public.generation_jobs(status, run_at);
create unique index if not exists generation_jobs_dedupe_uq on public.generation_jobs(dedupe_key) where status in ('queued','running');

create table if not exists public.ai_cost_logs (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('elevenlabs_tts','elevenlabs_stt','openai_text','openai_image')),
  purpose text not null,
  usd numeric(12,6) not null default 0,
  units numeric not null default 0,
  cache_hit boolean not null default false,
  family_id uuid references public.families(id) on delete set null,
  story_id text,
  created_at timestamptz not null default now()
);
create index if not exists ai_cost_logs_created_idx on public.ai_cost_logs(created_at);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  family_id uuid references public.families(id) on delete set null,
  anon_id text,
  props jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists analytics_events_name_created_idx on public.analytics_events(name, created_at);

create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null unique references public.families(id) on delete cascade,
  email_daily boolean not null default false,
  push_enabled boolean not null default false,
  send_hour smallint not null default 17 check (send_hour between 0 and 23),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null,
  action text not null,
  target text,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.rate_limits (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  window_start timestamptz not null,
  count int not null default 0,
  unique (key, window_start)
);

-- ---------- Funkcje -----------------------------------------------------------
create or replace function public.claim_generation_job(p_worker text, p_types text[] default null)
returns setof public.generation_jobs
language plpgsql security definer set search_path = public as $$
begin
  return query
  update public.generation_jobs j
     set status = 'running', locked_at = now(), locked_by = p_worker, attempts = j.attempts + 1, updated_at = now()
   where j.id = (
     select id from public.generation_jobs
      where (status = 'queued' or (status = 'running' and locked_at < now() - interval '10 minutes'))
        and run_at <= now()
        and (p_types is null or type = any(p_types))
      order by run_at
      for update skip locked
      limit 1)
  returning j.*;
end $$;

create or replace function public.increment_rate_limit(p_key text, p_window timestamptz)
returns int language plpgsql security definer set search_path = public as $$
declare v int;
begin
  insert into public.rate_limits(key, window_start, count) values (p_key, p_window, 1)
  on conflict (key, window_start) do update set count = public.rate_limits.count + 1
  returning count into v;
  delete from public.rate_limits where window_start < now() - interval '2 days';
  return v;
end $$;

revoke execute on function public.claim_generation_job(text, text[]) from anon, authenticated;
revoke execute on function public.increment_rate_limit(text, timestamptz) from anon, authenticated;

-- ---------- RLS ---------------------------------------------------------------
create or replace function public.my_family_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.families where owner_user_id = auth.uid()
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'users','families','child_profiles','family_members','interests','child_interests','stories','story_versions','story_segments',
    'audio_assets','audio_cache','audio_assemblies','family_assemblies','greetings','greeting_audio_cache','voice_greeting_sessions',
    'story_unlocks','listening_progress','subscriptions','payments','gift_purchases','gift_entitlements','gift_redemptions','gift_stories',
    'referrals','referral_rewards','generation_jobs','ai_cost_logs','analytics_events','notification_preferences','admin_audit_logs','rate_limits']
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Własne dane rodziny (odczyt). Zapisy wykonuje wyłącznie backend (service-role) po walidacji.
create policy users_self on public.users for select using (id = auth.uid());
create policy families_owner on public.families for select using (owner_user_id = auth.uid());
create policy child_profiles_owner on public.child_profiles for select using (family_id = public.my_family_id());
create policy family_members_owner on public.family_members for select using (family_id = public.my_family_id());
create policy child_interests_owner on public.child_interests for select using (child_id in (select id from public.child_profiles where family_id = public.my_family_id()));
create policy listening_progress_owner on public.listening_progress for select using (family_id = public.my_family_id());
create policy story_unlocks_owner on public.story_unlocks for select using (family_id = public.my_family_id());
create policy subscriptions_owner on public.subscriptions for select using (family_id = public.my_family_id());
create policy payments_owner on public.payments for select using (family_id = public.my_family_id());
create policy notification_prefs_owner on public.notification_preferences for select using (family_id = public.my_family_id());
create policy referral_rewards_owner on public.referral_rewards for select using (family_id = public.my_family_id());
create policy voice_sessions_owner on public.voice_greeting_sessions for select using (family_id = public.my_family_id());
create policy interests_public on public.interests for select using (true);
create policy stories_published on public.stories for select to authenticated using (status = 'published');
-- audio_cache, audio_assemblies, gift_*, generation_jobs, ai_cost_logs, analytics_events, admin_audit_logs, rate_limits:
-- brak polityk = brak dostępu dla anon/authenticated (tylko service-role).

-- ---------- Storage (prywatne buckety) ----------------------------------------
insert into storage.buckets (id, name, public) values ('audio', 'audio', false) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('images', 'images', false) on conflict (id) do nothing;

-- ---------- Słowniki ----------------------------------------------------------
insert into public.interests (id, label_pl, label_en, icon) values
  ('zwierzeta','Zwierzęta','Animals','PawPrint'), ('kosmos','Kosmos','Space','Rocket'), ('dinozaury','Dinozaury','Dinosaurs','Bone'),
  ('przyroda','Przyroda','Nature','Leaf'), ('pojazdy','Pojazdy','Vehicles','Car'), ('morza','Morza i oceany','Seas & oceans','Waves'),
  ('magia','Magia','Magic','Sparkles'), ('odkrywanie','Odkrywanie świata','Exploring','Compass'), ('roboty','Roboty','Robots','Bot'),
  ('przygody','Przygody','Adventures','Map'), ('sport','Sport','Sport','Trophy'), ('inne','Inne','Other','Heart')
on conflict (id) do nothing;
