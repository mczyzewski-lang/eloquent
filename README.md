# Elofik — codziennie jedno mądre słowo

Premium platforma personalizowanych bajek audio dla dzieci 4–7 lat. Każdego dnia jedna nowa przygoda (5–10 min) z małym elfem opowieści, jedno mądre słowo i historia, w której dziecko słyszy własne imię oraz imiona bliskich.

**Produkcja:** https://elofik.com · **Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · komponenty w stylu shadcn/ui · Lucide · Motion · Supabase (Postgres, Auth, Storage, RLS) · Stripe Billing/Checkout · ElevenLabs TTS + Scribe v2 Realtime · OpenAI (scenariusze, ilustracje) · FFmpeg · Railway · PWA

---

## Szybki start (tryb demo — bez żadnych kluczy)

```bash
npm install
```

```bash
npm run dev
```

Otwórz http://localhost:3000 oraz **http://localhost:3000/demo** — rodzina Leona (5 lat; mama Monika, tata Marek, babcia Basia, dziadek Jan, pies Burek), panel admina, prezent od babci.

W trybie demo: dane w `.data/db.json`, TTS generuje dźwięk zastępczy (tekst czyta syntezator przeglądarki), rozpoznawanie mowy jest symulowane, płatności — ekran symulacji Stripe. Tryb demo włącza się automatycznie bez Supabase lub flagą `ELOFIK_DEMO_MODE=1`.

Konfiguracja usług: [`docs/SETUP.md`](docs/SETUP.md) · zmienne: [`.env.example`](.env.example).

## Najważniejsze mechanizmy

| Mechanizm | Gdzie |
|---|---|
| Wspólny CORE + personalizacja (cache deterministyczny sha256, FFmpeg + loudnorm) | `src/lib/domain/story.ts`, `src/lib/services/audio-pipeline.ts`, `src/lib/audio/ffmpeg.ts` |
| Rytuał „Hej Elofik!” (Scribe v2 Realtime, VAD, token jednorazowy, fuzzy matching, fallback dotykiem) | `src/components/story/VoiceGreeting.tsx`, `src/lib/domain/command-matcher.ts`, `src/lib/services/voice.ts` |
| Bank 13 powitań PL (+EN), generowanych raz na imię/wariant/głos, z prefetchem | `src/lib/domain/greetings.ts`, `src/lib/services/greetings.ts` |
| Codzienne odblokowywanie (6:00 w strefie rodziny, czas serwera, DST) | `src/lib/domain/unlock.ts`, `src/lib/services/access.ts` |
| Bezpieczna odmiana imion (słownik + formy od rodzica, nigdy zgadywanie) | `src/lib/domain/names.ts` |
| Stripe: abonament, prezent jednorazowy, portal, webhooki, ochrona przed podwójną subskrypcją | `src/lib/services/billing.ts` |
| Prezenty od dziadków (bezpłatna bajka ~2 min, zakup, aktywacja jednorazowa) | `src/lib/services/gifts.ts`, `src/app/dla-dziadkow`, `src/app/prezent`, `src/app/aktywuj-prezent` |
| Polecenia (1/2/3 skuteczne polecenia → nagrody) | `src/lib/domain/referral.ts`, `src/lib/services/referrals.ts` |
| Budżet i koszty AI (TTS, STT, tekst, obrazy osobno) | `src/lib/services/costs.ts`, `src/lib/services/metrics.ts`, `/admin/koszty` |
| Trwała kolejka zadań (Postgres `FOR UPDATE SKIP LOCKED`) + worker | `src/lib/services/jobs.ts`, `worker/index.ts` |
| Warstwa danych (Supabase service-role / pamięć+plik dla demo i testów) | `src/lib/db/*`, `supabase/migrations/0001_init.sql` |

## Struktura

```
src/app/            strony i API (App Router)
  page.tsx          landing (lejek Meta Ads, próbka z imieniem)
  onboarding/       5 kroków: dziecko, rodzina, zainteresowania, podsumowanie, konto
  app/              biblioteka, kalendarz 30 dni, rytuał + player
  dla-dziadkow/     landing dziadków, kreator, zakup prezentu
  prezent/[token]   bezpłatna bajka-niespodzianka
  aktywuj-prezent/  aktywacja prezentu przez rodzica
  konto/            panel rodzica
  admin/            dashboard, CMS bajek, powitania, koszty
  api/              endpointy (sample, voice, greeting, progress, checkout, webhooks, gift, admin…)
src/components/     UI (elofik/ maskotka i okładki, story/ rytuał i player, …)
src/lib/domain/     czysta logika domenowa (testowalna)
src/lib/services/   logika aplikacji (dane, audio, płatności)
src/content/        bajki startowe, próbka, bajka prezentowa
supabase/           migracje SQL (RLS, funkcje)
worker/             worker kolejki (Railway)
tests/, e2e/        Vitest + Playwright
docs/               dokumentacja
```

## Skrypty

| | |
|---|---|
| `npm run dev` / `build` / `start` | aplikacja |
| `npm run worker` | worker kolejki generacji |
| `npm test` | testy jednostkowe/integracyjne (Vitest) |
| `npm run test:e2e` | testy end-to-end (Playwright, po `build`) |
| `npm run lint` / `typecheck` | jakość |
| `npm run seed:demo` | seed bajek startowych do bazy |
| `npm run assets` | ikony PWA i obraz Open Graph |

## Dokumentacja

- [Marka, character sheet, paleta, reguły ilustracji](docs/BRAND.md)
- [Konfiguracja: Supabase, ElevenLabs TTS, Scribe v2 Realtime, zarządzanie głosem, Stripe, OpenAI, e-mail](docs/SETUP.md)
- [Railway, środowiska, domena elofik.com, SSL, www → apex](docs/RAILWAY.md)
- [Migracje bazy](docs/MIGRATIONS.md)
- [Tworzenie nowych bajek (CMS)](docs/STORIES.md)
- [Testy](docs/TESTING.md)
- [Checklista bezpieczeństwa](docs/SECURITY_CHECKLIST.md)
- [Checklista przed wdrożeniem](docs/PRODUCTION_CHECKLIST.md)

## Ukończone

- Design system (paleta, typografia, komponenty), maskotka-elf w SVG z animacjami uszu (nasłuchiwanie, radość, machanie), okładki z imieniem jako warstwą UI, PWA (manifest, service worker, ikony), SEO (canonical, sitemap, robots, OG).
- Landing z efektem WOW: imię → animacja → próbka ~30 s (personalizacja + wspólny fragment, cache per imię, rate limiting, honeypot, budżet dzienny) → CTA do onboardingu; wszystkie 12 sekcji bez fikcyjnych opinii i statystyk.
- Onboarding 5 kroków (formy zwrotu bez zgadywania odmiany, rodzaj gramatyczny, wiele osób tej samej relacji), konto: magic link / Google / Apple (Supabase) lub demo.
- Aplikacja: karta dzisiejszej bajki, zakładki (Dzisiaj, Moje bajki, Poznane słowa, Ulubione, Mój postęp), kalendarz 30 dni z kłódkami, zapowiedź jutra, paywall po Dniu 1.
- Rytuał „Hej Elofik!”: informacja dla rodzica, Scribe v2 Realtime (token z backendu, VAD, keyterms, echo/noise/AGC), tolerancyjne dopasowanie, limit czasu/prób, zamknięcie WS, retry, fallback dotykiem po 2 próbach, zawsze dostępne pominięcie, odpowiedź z cache + motyw muzyczny → automatyczne przejście do bajki; analityka 7 zdarzeń.
- Player: okładka, play/pause, ±15 s, pasek, prędkość, zapis pozycji, odtwarzanie w tle, Media Session, ulubione, ekran słowa dnia + pytanie dla rodzica + „porozmawialiśmy”.
- Pipeline audio: CORE raz, personalizacja z cache, FFmpeg (resampling, pauzy, loudnorm, MP3), oś czasu napisów, prywatny storage z podpisanymi URL-ami.
- Stripe: Checkout, Billing, Portal, webhooki (idempotentne), retry/past_due, anulowanie z końcem okresu, ochrona przed podwójną subskrypcją; symulacja bez kluczy.
- Dziadkowie: landing, bezpłatna niespodzianka (~2 min, link z tokenem i TTL, WhatsApp/kopiuj/udostępnij), zakup prezentu (jednorazowo, bez odnowienia), aktywacja jednorazowa przez rodzica.
- Polecenia: link, kwalifikacja (opłacona, niezależna rodzina), nagrody 1/2/3.
- Panel rodzica: profil, bliscy, zainteresowania, abonament, polecenia, powiadomienia, zgody (mikrofon, e-mail, marketing), historia, eksport i usunięcie danych.
- Admin: dashboard (MRR, retencja D1/D7/D14/D30, lejki, rytuał, prezenty, polecenia, kolejka, logi), CMS (generowanie OpenAI, edycja segmentów, walidacja redakcyjna, wersje, zatwierdzanie, CORE, ilustracja, publikacja, podgląd tekst/audio), Powitania (edycja, podgląd TTS, wersje głosu, cache, analiza imion), Koszty (TTS/STT/tekst/obrazy, CORE vs personalizacja, cache hit rate, koszt STT na udane powitanie).
- Bezpieczeństwo: RLS, klucze tylko na serwerze, rate limiting, CSRF (Origin), nagłówki, audyt, ochrona przed prompt injection, budżet AI.
- Testy: 61 testów Vitest (scenariusze 1–19 na poziomie logiki/usług) + 10 scenariuszy Playwright (mobile Android + desktop).

## Nieukończone / do zrobienia

- **Treści:** pełne scenariusze 5–10 min mają dni 1–3; dni 4–7 są skróconymi wersjami (2–3 min) do rozbudowy w CMS; dni 8–30 istnieją jako plan (tytuł + słowo) — należy je wygenerować, zredagować i opublikować.
- **Głos i ilustracje:** wybór głosu Elofika w ElevenLabs i wygenerowanie ilustracji okładek (obecnie okładki to wektorowe sceny z maskotką). Nie wykonano żadnych płatnych generacji.
- **Scribe na żywo:** integracja zgodna z SDK `@elevenlabs/client` 1.x, ale nietestowana z prawdziwym kluczem i dziećmi — wymaga testów terenowych (progi VAD, keyterms).
- **Push PWA:** service worker obsługuje `push`, ale brak subskrypcji VAPID i wysyłki (e-mail działa przez Resend).
- **i18n UI:** architektura gotowa (locale w rodzinie, komendy i powitania EN/ES), teksty interfejsu tylko po polsku.
- **iOS Safari / WebKit:** projekt Playwright przygotowany, ale nieuruchomiony w tym środowisku; wymagane testy na urządzeniach.
- **CSP, Sentry, Meta Pixel/CAPI, prawna weryfikacja regulaminu i polityki** — patrz checklisty.
