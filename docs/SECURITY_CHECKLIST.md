# Checklista bezpieczeństwa i prywatności

## Dzieci i prywatność
- [x] Konto zakłada wyłącznie dorosły (checkbox pełnoletności przy rejestracji).
- [x] Minimalizacja danych: imię, wiek, opcjonalne imiona bliskich, zainteresowania. Bez nazwisk, zdjęć, lokalizacji.
- [x] Brak publicznych profili dzieci; linki prezentowe nieindeksowane (`robots: noindex`).
- [x] Brak czatu AI z dzieckiem — Elofik rozpoznaje tylko powitanie i odtwarza przygotowane, sprawdzone kwestie.
- [x] Mikrofon tylko po dotknięciu, sesja ≤ `VOICE_SESSION_MAX_SECONDS`, zamknięcie WebSocket i mikrofonu po rozpoznaniu/timeout/unmount.
- [x] Brak nagrań i transkrypcji w bazie; brak profili biometrycznych; brak klonowania głosu dziecka.
- [x] Informacja dla rodzica przed pierwszym użyciem mikrofonu + możliwość cofnięcia zgody w `/konto`.
- [x] Eksport (`/api/account/export`) i trwałe usunięcie danych (`/api/account/delete`, anuluje Stripe, usuwa użytkownika Auth).
- [x] Zgody: mikrofon, przypomnienia, marketing — osobno, odwoływalne.

## Aplikacja
- [x] Klucze API wyłącznie po stronie serwera (`src/lib/config.ts` z `server-only`); do przeglądarki trafia tylko jednorazowy token Scribe.
- [x] Supabase RLS na wszystkich tabelach; backend autoryzuje po `family_id` z sesji.
- [x] Odblokowanie bajek liczone na serwerze — czas klienta ignorowany.
- [x] Audio w prywatnych bucketach, podpisane URL-e z TTL; lokalnie `/api/media` z HMAC i wygaśnięciem.
- [x] Tokeny prezentów: 192-bit losowe (darmowa bajka) / HMAC (aktywacja), w bazie wyłącznie sha256, z terminem ważności; aktywacja jednorazowa (warunkowy UPDATE + unikalność w SQL).
- [x] Rate limiting: próbka (IP: 10/h, 30/d), prezenty, logowanie demo, analityka, sesje głosowe (rodzina/dzień, próby/bajkę).
- [x] Honeypot w formularzach publicznych; walidacja imion (litery, długość, blocklista) — chroni TTS przed nadużyciem.
- [x] Ochrona przed prompt injection: dane admina przekazywane jako JSON-dane, wynik walidowany schematem i regułami redakcyjnymi, publikacja tylko po zatwierdzeniu.
- [x] CSRF: mutacje wymagają nagłówka `Origin` zgodnego z hostem; cookies `SameSite=Lax`, `HttpOnly`, `Secure` na produkcji.
- [x] Webhook Stripe z weryfikacją podpisu i idempotencją.
- [x] Nagłówki: HSTS, `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy: microphone=(self)`.
- [x] Logi administracyjne (`admin_audit_logs`) dla akcji CMS i powitań.
- [x] Budżet AI: bez limitu > 0 płatne wywołania są zablokowane; dzienny limit kosztów próbek.
- [x] `SESSION_SECRET` wymagany na produkcji (aplikacja odmawia działania bez niego).

## Do zrobienia przed startem
- [ ] Przegląd prawny polityki prywatności i regulaminu (RODO, prawa konsumenta, treści cyfrowe).
- [ ] DPA z dostawcami (Supabase, ElevenLabs — w tym retencja po ich stronie, OpenAI, Stripe, Resend).
- [ ] Content-Security-Policy (z hostowanym lokalnie workletem Scribe i `connect-src wss://api.elevenlabs.io`).
- [ ] Monitoring błędów (np. Sentry) bez PII.
- [ ] Testy penetracyjne podstawowe (IDOR na `/api/*`, enumeracja tokenów).
