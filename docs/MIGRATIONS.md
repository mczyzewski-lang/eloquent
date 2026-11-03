# Migracje bazy danych

Migracje SQL znajdują się w `supabase/migrations/` i są numerowane (`0001_init.sql`, `0002_…`).

## Zastosowanie

**Supabase CLI (zalecane):**

```bash
npx supabase link --project-ref <ref>
```

```bash
npx supabase db push
```

**Alternatywnie:** wklej zawartość pliku w Supabase → SQL Editor i uruchom.

## Zasady

- Każda zmiana schematu = nowy plik migracji; nie edytuj migracji już wdrożonych na produkcję.
- Kolumny w SQL muszą odpowiadać typom w `src/lib/db/types.ts` (snake_case 1:1).
- Nowa tabela → `enable row level security` + polityki (lub świadomy brak polityk = tylko service-role).
- Ograniczenia unikalności używane przez `upsert(..., conflict)` muszą istnieć w SQL (np. `audio_cache.cache_key`, `family_assemblies(family_id, story_id)`).
- Przed migracją produkcyjną: backup (Supabase → Database → Backups / PITR) i próba na stagingu.

## Tryb demo

W trybie demo (bez Supabase) dane są w `.data/db.json` — schemat wynika z typów TypeScript, migracje nie są potrzebne. Reset: usuń katalog `.data/`.
