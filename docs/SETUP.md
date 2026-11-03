# Konfiguracja usług

Aplikacja działa bez żadnych kluczy (tryb demo). Każda integracja włącza się po ustawieniu zmiennych z `.env.example`.

## 0. Panel admina: Ustawienia i klucze API (`/admin/ustawienia`)

Klucze **ElevenLabs** i **OpenAI**, **Voice ID** głosu Elofika oraz **miesięczny budżet AI** można wpisać w panelu zamiast w zmiennych środowiskowych:

- wartości są szyfrowane AES-256-GCM (klucz z `SESSION_SECRET`) w tabeli `app_settings` (migracja `0002_app_settings.sql`), dostęp tylko dla backendu,
- do przeglądarki trafia wyłącznie maska (np. `sk-…abcd`); log audytu zapisuje tylko nazwy pól,
- wartość z panelu ma pierwszeństwo przed zmienną środowiskową; „Wyczyść” wraca do zmiennej,
- zmiany działają bez restartu (cache 30 s); „Test połączenia” sprawdza klucze bez płatnego generowania,
- **ustaw `SESSION_SECRET` przed zapisaniem kluczy** — jego zmiana unieważnia zapisane sekrety.

Dostęp do panelu: e-mail z `ADMIN_EMAILS` + logowanie linkiem (`/logowanie`). W trybie demo: `/demo` → „Wejdź jako admin”.

## 1. Supabase (PostgreSQL, Auth, Storage, RLS)

1. Utwórz projekt (region UE, np. Frankfurt).
2. **Migracje** — patrz [MIGRATIONS.md](./MIGRATIONS.md). Migracja tworzy tabele, indeksy, RLS, funkcje kolejki (`claim_generation_job`, `increment_rate_limit`) i prywatne buckety `audio`, `images`.
3. Ustaw zmienne: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (tylko serwer!).
4. **Auth → URL Configuration:** Site URL `https://elofik.com`; Redirect URLs: `https://elofik.com/auth/callback`, `https://staging.elofik.com/auth/callback`, `http://localhost:3000/auth/callback`.
5. **Auth → Providers:** Email (magic link) włączony; opcjonalnie Google i Apple (redirect `https://<projekt>.supabase.co/auth/v1/callback`).
6. **Auth → Email templates:** przetłumacz na polski, nadawca `bajki@elofik.com` (SMTP własny, np. Resend).
7. Admini: dodaj e-maile do `ADMIN_EMAILS` — flaga `is_admin` ustawia się przy pierwszym logowaniu.
8. Seed bajek startowych: `npm run seed:demo` (z ustawionymi zmiennymi Supabase).

Model bezpieczeństwa: backend używa service-role i autoryzuje każde zapytanie po `family_id` z sesji. RLS blokuje wszelki bezpośredni dostęp kluczem anon/authenticated poza odczytem własnych danych.

## 2. ElevenLabs — TTS (głos Elofika)

1. Utwórz/wybierz głos Elofika (Voice Library lub Voice Design — ciepły, dziecięco-przyjazny, polski). **Nigdy nie klonuj głosu dziecka.**
2. Ustaw `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `ELEVENLABS_TTS_MODEL` (domyślnie `eleven_multilingual_v2`).
3. Ustaw budżet `AI_MONTHLY_BUDGET_USD` (> 0), inaczej płatne generowanie jest zablokowane.
4. **Zarządzanie głosem:** zmiana głosu lub jego ustawień (`DEFAULT_VOICE_SETTINGS` w `src/lib/audio/tts.ts`) → podbij `ELEVENLABS_VOICE_VERSION` (np. `VOICE_V2`). Klucze cache zawierają voice ID, model, ustawienia i wersję, więc nowe nagrania powstaną automatycznie, a stare pozostaną do sprzątnięcia. Po zmianie: w CMS uruchom „Generuj CORE” dla opublikowanych bajek (lub zakolejkuj `generate_core`), w „Powitania Elofika” wygeneruj zestaw testowy i odsłuchaj.
5. Słownik wymowy: `src/lib/domain/pronunciation.ts` (podbij `PRONUNCIATION_VERSION`).

## 3. ElevenLabs — Scribe v2 Realtime (rytuał „Hej Elofik!”)

- Przeglądarka łączy się przez WebSocket SDK `@elevenlabs/client` (`Scribe.connect`) z modelem `scribe_v2_realtime`, językiem profilu, strategią commit **VAD**, `keyterms` z imieniem bohatera i mikrofonem z `echoCancellation`, `noiseSuppression`, `autoGainControl`.
- Token jednorazowy generuje backend: `POST /api/voice/start` → `POST https://api.elevenlabs.io/v1/single-use-token/realtime_scribe` (klucz główny nie trafia do przeglądarki).
- Limity: `VOICE_SESSION_MAX_SECONDS` (timeout i automatyczne zamknięcie), `VOICE_MAX_ATTEMPTS_PER_STORY`, `VOICE_MAX_SESSIONS_PER_DAY`, budżet STT. Czas połączenia jest liczony po stronie serwera (od wydania tokenu) i logowany w `ai_cost_logs`.
- Prywatność: dopasowanie komendy odbywa się na urządzeniu (`src/lib/domain/command-matcher.ts`); na serwer trafia tylko wynik i pewność. Brak nagrań i transkrypcji w bazie.
- Bez klucza ElevenLabs rytuał działa w trybie symulacji (przyciski „Hej, Elofik!” / „Hałas w tle”).
- CSP: jeśli wprowadzisz restrykcyjne CSP, hostuj worklet `@elevenlabs/client/worklets/scribeAudioProcessor.js` lokalnie (`microphone.workletPaths`) i zezwól na `wss://api.elevenlabs.io`.

## 4. Stripe (Billing, Checkout, Portal, webhooki)

1. Produkt **ELOFIK PREMIUM**: cena 39,90 PLN brutto, recurring monthly (Tax behavior: inclusive) → `STRIPE_PRICE_PREMIUM_MONTHLY`.
2. Produkt **Prezent — 1 miesiąc**: 39,90 PLN, one-time → `STRIPE_PRICE_GIFT_MONTH` (opcjonalne — inaczej cena inline).
3. Kupon 100% `duration=once` (nagroda za 3 polecenia) → `STRIPE_COUPON_REFERRAL_MONTH`.
4. Customer Portal: włącz anulowanie z końcem okresu, zmianę karty, faktury; return URL `https://elofik.com/konto`.
5. Webhook `https://elofik.com/api/webhooks/stripe` ze zdarzeniami: `checkout.session.completed`, `customer.subscription.created|updated|deleted`, `invoice.paid`, `invoice.payment_failed` → `STRIPE_WEBHOOK_SECRET`.
6. Retry płatności: Billing → Revenue recovery → Smart Retries (status `past_due` utrzymuje dostęp w okresie karencji).
7. Test: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`, karta `4242 4242 4242 4242`.

Ochrona przed podwójną subskrypcją: sprawdzenie w aplikacji + w Stripe (`subscriptions.list`) + częściowy indeks unikalny w bazie (`one_active_stripe_sub_per_family`) + klucz idempotencji Checkout.

## 5. OpenAI (scenariusze i ilustracje)

- `OPENAI_API_KEY`, `OPENAI_TEXT_MODEL`, `OPENAI_IMAGE_MODEL`.
- Generator scenariuszy (`src/lib/ai/story-generator.ts`): dane admina trafiają do modelu jako JSON-dane (ochrona przed prompt injection), wynik walidowany schematem zod i regułami redakcyjnymi, status zawsze `draft`.
- Ilustracje (`src/lib/ai/images.ts`): prompt = character sheet + scena; cache po hashu promptu; jedna grafika na bajkę.
- OpenAI nigdy nie otrzymuje danych dzieci (imion, wieku).

## 6. E-mail

`RESEND_API_KEY`, `EMAIL_FROM`. Bez klucza e-maile są logowane w konsoli (dev). Przypomnienia wysyła worker po wywołaniu `POST /api/cron/daily` (Railway Cron co godzinę, nagłówek `Authorization: Bearer $CRON_SECRET`).
