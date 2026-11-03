# Checklista przed wdrożeniem produkcyjnym (https://elofik.com)

## Infrastruktura
- [ ] Railway: serwisy `web` + `worker` z Dockerfile (FFmpeg), cron `/api/cron/daily` co godzinę.
- [ ] Domeny `elofik.com` + `www.elofik.com`, SSL aktywny, `www` → apex (308) zweryfikowane.
- [ ] `APP_ENV=production`, `APP_URL=NEXT_PUBLIC_APP_URL=https://elofik.com`, `SESSION_SECRET` (≥ 32 znaki), `CRON_SECRET`, `ADMIN_EMAILS`.
- [ ] `ELOFIK_DEMO_MODE` **nieustawione**; `/api/health` zwraca `mode: production`, `ffmpeg: true`.

## Supabase
- [ ] Migracje zastosowane na produkcji; RLS włączone (Advisor bez ostrzeżeń).
- [ ] Buckety `audio`, `images` prywatne.
- [ ] Auth: Site URL i Redirect URLs na `https://elofik.com/auth/callback`; szablony e-mail PL; własny SMTP.
- [ ] Backupy / PITR włączone.
- [ ] Seed katalogu bajek (`npm run seed:demo`) lub publikacja w CMS.

## Treści i audio
- [ ] Głos Elofika wybrany i zatwierdzony; `ELEVENLABS_VOICE_VERSION` ustalone.
- [ ] `AI_MONTHLY_BUDGET_USD` i `AI_SAMPLE_DAILY_BUDGET_USD` ustawione.
- [ ] Opublikowane min. 30 dni bajek (pełne 5–10 min; dni 4–7 w seedzie są skrócone — do rozbudowy).
- [ ] CORE wygenerowany dla wszystkich opublikowanych bajek; odsłuch kontrolny całości.
- [ ] Próbka z landing page: wspólny fragment wygenerowany, odsłuch dla 10 najpopularniejszych imion.
- [ ] Ilustracje okładek wygenerowane i zaakceptowane (spójność z character sheet).

## Płatności
- [ ] Stripe live: produkt, cena 39,90 PLN brutto, cena prezentu, kupon nagrody, Customer Portal, webhook (live secret).
- [ ] Smart Retries i e-maile Stripe o nieudanych płatnościach włączone.
- [ ] Test end-to-end live małą kwotą + zwrot.
- [ ] Faktury/paragony (dane sprzedawcy, VAT 23%).

## Prawne i analityka
- [ ] Polityka prywatności i regulamin zatwierdzone prawnie; link w stopce.
- [ ] Meta Pixel / CAPI (jeśli używane) — tylko po zgodzie cookies; zdarzenia lejka zmapowane.
- [ ] Panel `/admin` dostępny wyłącznie dla adminów (test z kontem nie-admina).

## Mobilnie
- [ ] iOS Safari, Android Chrome, PWA — patrz [TESTING.md](./TESTING.md).
