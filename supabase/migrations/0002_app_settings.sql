-- Ustawienia z panelu admina (klucze API ElevenLabs / OpenAI, budżet AI).
-- Wartości są szyfrowane w aplikacji (AES-256-GCM, klucz z SESSION_SECRET).
-- Brak polityk RLS = dostęp wyłącznie dla service-role (backend).
create table if not exists public.app_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value_encrypted text not null,
  updated_by text,
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;
