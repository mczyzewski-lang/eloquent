# Wdrożenie na Railway (elofik.com)

## Serwisy

| Serwis | Start command | Uwagi |
|---|---|---|
| `web` | `npx next start -p $PORT` (domyślne z `railway.json`) | healthcheck `/api/health` |
| `worker` | `npm run worker` | ten sam obraz (Dockerfile), te same zmienne; skaluj niezależnie |
| `cron` | Railway Cron co godzinę: `curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://elofik.com/api/cron/daily` | przypomnienia e-mail |

Obraz (`Dockerfile`) zawiera **FFmpeg** — wymagany do składania segmentów MP3.

## Trwałość danych (ważne!)

Bez Supabase aplikacja działa w trybie demo i trzyma **wszystkie dane w plikach** (`.data/db.json` — konta, klucze API z panelu, postępy — oraz `.data/storage/` — audio i okładki). System plików kontenera Railway jest **ulotny**: każde wdrożenie go czyści.
Dopóki nie podłączysz Supabase, dodaj w Railway **Volume** zamontowany pod `/app/.data` (Service → Settings → Volumes). Docelowo: Supabase (baza + Storage).

## Środowiska

| | development | staging | production |
|---|---|---|---|
| `APP_ENV` | development | staging | production |
| `APP_URL` | http://localhost:3000 | https://staging.elofik.com | **https://elofik.com** |
| Supabase | lokalny / demo | projekt staging | projekt produkcyjny |
| Stripe | test | test | live |
| `AI_MONTHLY_BUDGET_USD` | 0–5 | 10 | wg planu |

`NEXT_PUBLIC_*` są wstrzykiwane w czasie budowania — ustaw je jako build args/variables w Railway.

## Domena, SSL, przekierowania

1. Railway → web → Settings → Domains: dodaj `elofik.com` i `www.elofik.com`.
2. DNS: `elofik.com` → rekord ALIAS/ANAME (lub CNAME flattening) na domenę Railway; `www` → CNAME.
3. SSL: certyfikaty Let's Encrypt wystawia Railway automatycznie.
4. **www → apex:** `src/proxy.ts` (308) i `next.config.ts` (`redirects`) przekierowują `www.elofik.com/*` → `https://elofik.com/*`.
5. Canonical: `metadataBase` = `NEXT_PUBLIC_APP_URL`; strony mają `alternates.canonical`; `sitemap.xml`, `robots.txt` (na nie-produkcji `Disallow: /`), Open Graph (`/og.png`).
6. Adresy powrotne Stripe i logowania budowane są z `APP_URL` (`absoluteUrl()`), nigdy z twardo zakodowanej domeny.

## Checklista wdrożenia

Patrz [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md).
