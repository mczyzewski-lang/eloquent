-- Okładki bajek generowane w panelu admina (OpenAI Images z arkuszem referencyjnym Elofika).
alter table public.stories add column if not exists cover_path text;
