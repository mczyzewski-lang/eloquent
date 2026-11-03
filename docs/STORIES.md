# Tworzenie nowych bajek

## Architektura bajki

Każda bajka (`StoryVersion`, `src/lib/domain/story.ts`) to manifest z segmentami:

| Typ | Opis | Cache |
|---|---|---|
| `CORE` | wspólna narracja, bez zmiennych | generowany **raz** dla wszystkich rodzin |
| `EDUCATIONAL` | krótkie, ciepłe wyjaśnienie słowa dnia | wspólny |
| `PERSONALIZED_CHILD` | zwrot do dziecka (`{child}`) | raz na formę imienia |
| `PERSONALIZED_FAMILY` | bliski w mianowniku (`mama {mom}`) + **obowiązkowy fallback** | raz na kombinację imion |
| `OPTIONAL` | np. zwierzak — pomijany, gdy rodzina go nie podała | raz na imię |

Zalecane 3–5 segmentów personalizowanych. Gdy brakuje osoby, używany jest `fallbackText` (wspólny dla wszystkich) — historia zawsze ma sens.

Klucz cache segmentu = sha256(znormalizowany tekst + voice ID + model + ustawienia głosu + język + wersja szablonu + wersja słownika wymowy). Złożony plik bajki ma własny klucz (lista kluczy segmentów + pauzy + wersja masteringu). Zmiana imienia babci regeneruje wyłącznie segmenty z babcią.

## Zmienne w szablonach

- `{child}` — forma zwrotu (wołacz / zdrobnienie wg ustawień rodzica, np. „Leonku”); `{child.name}` — mianownik.
- `{mom} {dad} {grandma} {grandpa} {brother} {sister} {dog} {cat} {other}` — **zawsze w mianowniku**, poprzedzone relacją: „babcia {grandma} powiedziała”.
- `{g:forma męska|forma żeńska|forma neutralna}` — rodzaj gramatyczny dziecka (forma neutralna musi być poprawna dla każdego dziecka).

## Przepływ w CMS (`/admin/bajki`)

1. **Generuj scenariusz** — podaj dzień, słowo, temat. OpenAI tworzy szkic (`draft`) zgodny z regułami; bez klucza powstaje szkic-szablon.
2. **Edycja i segmentacja** — popraw teksty, typy segmentów, pauzy, fallbacki. „Zapisz wersję” tworzy nową wersję (historia zachowana).
3. **Walidacja redakcyjna** (automatyczna): słowo dnia ≥ 3 razy, 3–5 segmentów personalizowanych, brak zmiennych w CORE, fallback dla segmentów rodzinnych, długość 5–10 min, pytanie dla rodzica, brak motywów świątecznych.
4. **Podgląd** — tekst i audio dla profilu testowego (np. Leon + rodzina) — widać, które segmenty są wspólne, a które personalizowane.
5. **Zatwierdź** — wymagane przed publikacją (logowane w `admin_audit_logs`).
6. **Generuj CORE** — jednorazowe nagranie wspólnych segmentów (koszt widoczny w „Koszty AI”).
7. **Ilustracja** — okładka wg character sheet.
8. **Publikuj** — dzień N staje się dostępny w sekwencji (sekwencja dni nie może mieć luk).

## Zasady edukacyjne

Jedna bajka — jedno główne słowo; znaczenie przez kontekst, przykłady i zachowania bohaterów; powtórki słów z poprzednich dni (`reviewWords`); zero szkolnego tonu; pytanie dla rodzica otwierające rozmowę. Bez obietnic typu „podnosi IQ”.
