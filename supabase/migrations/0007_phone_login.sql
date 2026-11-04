-- Logowanie rodzica numerem telefonu (kod SMS).
alter table public.users alter column email drop not null;
alter table public.users add column if not exists phone text unique;

-- Kody jednorazowe (tylko HMAC kodu). Dostęp wyłącznie przez service role.
create table if not exists public.phone_otps (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists phone_otps_phone_idx on public.phone_otps (phone, created_at desc);
alter table public.phone_otps enable row level security;
