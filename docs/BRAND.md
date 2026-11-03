# Elofik — marka, character sheet i reguły ilustracji

**Marka:** Elofik · **Domena:** https://elofik.com
**Slogan PL:** „Elofik — codziennie jedno mądre słowo” · **EN:** „Elofik — Little stories. Big words.”

**Obietnica:** Każdego dnia Twoje dziecko przeżywa wyjątkową przygodę, poznając nowe słowo i rozwijając swoje słownictwo. A w bajkach może usłyszeć własne imię oraz imiona najbliższych.

Nie pozycjonujemy Elofika jako „generatora bajek AI”. Sprzedajemy codzienny rytuał, przygodę z udziałem dziecka, bliskość rodziny, ograniczenie biernego czasu przed ekranem i proste narzędzie dla rodziców.
Nie obiecujemy „podnoszenia IQ” ani wymiernych efektów — komunikujemy rozwijanie słownictwa, umiejętności językowych, wyobraźni i wspieranie rozwoju poznawczego.

## Character sheet — Elofik (wersja `ELF_V2`)

| Cecha | Opis |
|---|---|
| Gatunek | Mały elf opowieści (nie zwierzę: nie fenek, nie słoń) |
| Znak rozpoznawczy | **Delikatnie spiczaste uszy** — wyraźnie elfie, ale krótkie i szerokie — w kształcie liścia, skierowane w bok i lekko w górę (wystają ok. 1/3 szerokości głowy, nigdy długie); poruszają się przy emocjach (nasłuchiwanie, radość) |
| Twarz | Dziecięca, okrągła; łagodne, inteligentne, duże brązowe oczy; ciepły uśmiech; rumiane policzki |
| Włosy | Miękkie, lekko potargane, karmelowo-kasztanowe (`#B9784A`) |
| Skóra | Ciepła brzoskwiniowo-beżowa (`#F3CBA8`) |
| Strój (całoroczny) | Szałwiowy dziany sweterek (`#9DB89A`), wygodne brązowe buciki, skórzana **torba na słowa** z ciepłym złotym blaskiem |
| Proporcje | Pluszakowe: duża okrągła głowa, miękkie kompaktowe ciało, krótkie kończyny — łatwe do przeniesienia na fizycznego pluszaka |
| Zakazane | Szpiczasta czapka świątecznego elfa, dzwoneczki, renifery, czerwono-zielone kostiumy, motywy bożonarodzeniowe |

Implementacja wektorowa: `src/components/elofik/Elofik.tsx` (nastroje: `idle`, `listening`, `happy`, `waving`, `telling`, `sleepy`; animacje uszu w `globals.css`).
Prompt bazowy ilustracji: `src/lib/ai/character.ts` (`ELOFIK_CHARACTER_SHEET`) — **każdy** prompt obrazu zawiera ten opis, a do każdego generowania dołączany jest **arkusz referencyjny** `public/brand/elofik-reference.png` (pozy: przód, machanie dłonią, radość, nasłuchiwanie), renderowany z kodu maskotki skryptem `scripts/render-reference.tsx`.

Machanie: Elofik unosi rękę i macha **dłonią** (obrót wokół nadgarstka), ramię pozostaje nieruchome.

## Paleta

| Token | Kolor | Użycie |
|---|---|---|
| `cream` | `#FFF9F0` | tło |
| `navy` | `#26344A` | nagłówki, tło nocne (rytuał, player) |
| `gold` | `#F6C76D` | CTA, wyróżnienia, magiczny blask |
| `peach` | `#F8DDD0` | karty ciepłe, tła sekcji |
| `sage` | `#9DB89A` | sweterek Elofika, akcenty sukcesu |
| `teal` | `#6FB7B0` | akcent dodatkowy |

Typografia: **Baloo 2** (nagłówki — miękka, zaokrąglona), **Nunito** (tekst — bardzo czytelna). Oba kroje mają pełny zestaw polskich znaków (ąćęłńóśźż) — każdy nowy krój sprawdzaj na tym zestawie. Fredoka odrzucona: brak polskich znaków.

## Reguły generowania ilustracji

1. Styl: ten sam czysty, miękki, zaokrąglony styl wektorowy co maskotka na stronie (gładkie kształty, delikatne gradienty, bez ostrych konturów), ciepłe złote światło, subtelna magia.
2. Elofik zawsze identyczny (character sheet powyżej). Zmiana wyglądu = nowa wersja `CHARACTER_SHEET_VERSION`.
3. Jedna ilustracja na bajkę — **nigdy** osobna grafika dla imienia dziecka. Imię nakładamy w UI jako warstwę tekstową (`StoryCover`).
4. Bez tekstu, logotypów i znaków wodnych w obrazie. Bez przemocy i scen strasznych.
5. Paleta tła: krem/brzoskwinia z akcentami granatu i złota; sceny nocne — granat z gwiazdami.

## Zasady UX

Mobile-first, duże elementy (min. 48 px), minimalna liczba kliknięć, przyjazne animacje (z poszanowaniem `prefers-reduced-motion`), spójny język wizualny, brak korporacyjnego SaaS i chaosu gier mobilnych.
