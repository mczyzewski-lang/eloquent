# Testy

## Jednostkowe i integracyjne (Vitest)

```bash
npm test
```

Uruchamiane na pamięciowej bazie, pamięciowym storage i mock TTS (bez sieci, bez kosztów). Pokrywają m.in.:

| # | Scenariusz | Plik |
|---|---|---|
| 1 | Próbka z imieniem „Leon” zawiera „Leonku” i wspólny CORE | `tests/services.test.ts` |
| 2 | Ponowne odtworzenie nie wywołuje TTS | `tests/services.test.ts` |
| 3 | Leon i Zosia — identyczny CORE | `tests/domain.test.ts`, `tests/services.test.ts` |
| 4 | Zmiana imienia babci → 1 nowy segment | oba |
| 5–7 | Pierwsze powitanie → wariant powrotu → cache bez nowego TTS (`LEON + RETURNING_GREETING_0x + VOICE_V1`) | `tests/services.test.ts` |
| 8 | Tolerancja błędów i odrzucanie hałasu w „Hej Elofik” | `tests/domain.test.ts` |
| 10 | Sesja głosowa bez transkrypcji, limit prób | `tests/services.test.ts` |
| 11 | Odblokowanie wg czasu serwera, 6:00 lokalnie, DST | `tests/domain.test.ts` |
| 12 | Dostęp po płatności (symulacja), tylko Dzień 1 bez abonamentu | `tests/services.test.ts` |
| 13–16 | Prezenty: bezpieczny link (hash w bazie), aktywacja jednorazowa, brak auto-odnowienia, idempotentny webhook | `tests/services.test.ts` |
| 17 | 100 rodzin → jeden CORE | `tests/services.test.ts` |
| 18 | Koszty rozdzielone: TTS / STT / ilustracje | `tests/services.test.ts` |
| 19 | Rodzina nie może zakończyć cudzej sesji | `tests/services.test.ts` |
| — | FFmpeg: składanie + loudnorm do MP3 | `tests/services.test.ts` |

## End-to-end (Playwright)

```bash
npm run build
```

```bash
npm run test:e2e
```

Serwer startuje automatycznie w trybie demo (`.data-e2e/`). Projekty: `android-chrome` (Pixel 7), `desktop-chromium`; `ios-safari` (iPhone 15, WebKit) — odkomentuj w `playwright.config.ts` po `npx playwright install webkit`.
Jeśli Chromium jest preinstalowany w innej wersji: `PW_CHROMIUM=/ścieżka/do/chrome npm run test:e2e`.

## Testy manualne przed startem (urządzenia)

- **iOS Safari**: autoplay po rytuale (odblokowanie audio w geście dotknięcia mikrofonu), odtwarzanie przy zablokowanym ekranie, kontrolki na ekranie blokady (Media Session), Range requests audio.
- **Android Chrome**: zgoda na mikrofon, odrzucenie zgody → fallback dotykiem, odtwarzanie w tle.
- **PWA**: instalacja z ekranu głównego, start na `/app`, orientacja pionowa.
- **Scribe na żywo** (z kluczem ElevenLabs): dziecko 4–7 lat mówi „Hej Elofik” z różnych odległości, w hałasie; sprawdź czas reakcji i zamknięcie mikrofonu (ikona mikrofonu w pasku przeglądarki znika).
- **Stripe Test Mode**: subskrypcja (4242…), nieudana płatność (4000 0000 0000 0341), anulowanie w Portalu, koniec okresu.
