-- Porównanie modeli TTS dla kandydatów na głos Elofika.
alter table public.voice_candidates add column if not exists model_demos jsonb not null default '[]';
