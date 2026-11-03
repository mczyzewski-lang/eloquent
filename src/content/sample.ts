/**
 * Próbka z landing page (20–35 s): krótka personalizacja + wspólne nagranie (CORE).
 * Wspólny fragment generowany jest raz; personalizacja — raz na imię (cache).
 */
import type { StoryVersion } from "@/lib/domain/story";

export const SAMPLE_STORY: StoryVersion = {
  storyId: "probka-landing",
  version: 1,
  dayNumber: 0,
  title: "Elofik i tajemniczy ślad — fragment",
  ageGroup: "4-7",
  locale: "pl",
  wordOfDay: "dociekliwość",
  wordDefinition: "",
  educationalGoal: "",
  summary: "",
  ending: "",
  parentQuestion: "",
  illustrationPrompt: "",
  coverImage: "/covers/day-01.svg",
  reviewWords: [],
  interests: [],
  estimatedMinutes: 1,
  status: "published",
  segments: [
    { id: "hello", order: 0, type: "PERSONALIZED_CHILD", text: "Hej, {child}! Tu Elofik! Ale się cieszę, że możemy się poznać!", fallbackText: "Hej! Tu Elofik! Ale się cieszę, że możemy się poznać!", pauseAfterMs: 500 },
    {
      id: "core",
      order: 1,
      type: "CORE",
      text: "Przygotowałem dla Ciebie coś niezwykłego. Dzisiaj odkryjemy, co oznacza słowo dociekliwość. A wszystko zaczęło się od tajemniczego śladu, który znalazłem w zaczarowanym lesie. Był malutki, srebrzysty i lśnił jak kropla rosy w porannym słońcu. Przykucnąłem, nastawiłem moje wielkie uszy i usłyszałem cichutkie: pssst… Kto to mógł być?",
      pauseAfterMs: 300,
    },
  ],
};

/** Bajka-niespodzianka od babci/dziadka (~2 min). Zmienne: {giver} = „babcia Basia”, {giverfull} = „Babcia Basia” (zawsze mianownik). */
export const GIFT_STORY: StoryVersion = {
  storyId: "prezent-od-dziadkow",
  version: 1,
  dayNumber: 0,
  title: "Elofik i list z zaczarowanego lasu",
  ageGroup: "4-7",
  locale: "pl",
  wordOfDay: "serdeczność",
  wordDefinition: "Serdeczność to ciepło i życzliwość, które okazujemy bliskim.",
  educationalGoal: "",
  summary: "Elofik przynosi dziecku list od kogoś bardzo bliskiego.",
  ending: "",
  parentQuestion: "",
  illustrationPrompt: "",
  coverImage: "/covers/gift.svg",
  reviewWords: [],
  interests: [],
  estimatedMinutes: 2,
  status: "published",
  segments: [
    { id: "hello", order: 0, type: "PERSONALIZED_CHILD", text: "Heeej, {child}! Tu Elofik, mały elf opowieści! Mam dla Ciebie coś wyjątkowego.", pauseAfterMs: 500 },
    { id: "core-1", order: 1, type: "CORE", text: "Dziś rano, gdy słońce dopiero przeciągało się nad zaczarowanym lasem, przyleciała do mnie sroka. W dziobie trzymała kopertę przewiązaną złotą wstążką. Na kopercie było napisane: bardzo ważny list, dostarczyć z serdecznością." },
    { id: "giver", order: 2, type: "PERSONALIZED_FAMILY", text: "Otworzyłem kopertę, a w środku był list od kogoś, kto bardzo Cię kocha. Na samym dole był podpis. Wiesz, jaki? {giverfull}! A w liście była prośba: Elofiku, opowiedz dzisiaj piękną historię komuś, kogo bardzo kocham.", fallbackText: "Otworzyłem kopertę, a w środku był list od kogoś, kto bardzo Cię kocha. Ten ktoś poprosił mnie, żebym opowiedział Ci dzisiaj historię.", pauseAfterMs: 600 },
    { id: "core-2", order: 3, type: "CORE", text: "Usiadłem więc na mchu i zacząłem opowiadać. O wiewiórce, która dzieliła się orzechami z całym lasem. O jeżyku, który ogrzewał zmarznięte żabki. I o tym, że najcenniejsze w świecie nie są złote monety ani błyszczące kamyki, tylko serdeczność. Serdeczność to ciepło, które dajemy bliskim: uśmiech, przytulenie, dobre słowo. Kiedy ktoś myśli o Tobie z serdecznością, w sercu robi się jasno jak w słoneczny poranek." },
    { id: "giver-2", order: 4, type: "PERSONALIZED_FAMILY", text: "I wiesz co, {child}? Właśnie tak myśli o Tobie {giver}. Z ogromną serdecznością.", fallbackText: "I wiesz co? Właśnie tak ktoś bliski myśli o Tobie. Z ogromną serdecznością.", pauseAfterMs: 600 },
    { id: "core-3", order: 5, type: "CORE", text: "Schowałem ten list do mojej torby na słowa, obok najpiękniejszych słów, jakie znam. A teraz mam do Ciebie małą prośbę. Kiedy następnym razem spotkasz tę osobę, przytul ją mocno. To będzie Twoja odpowiedź na list." },
    { id: "bye", order: 6, type: "PERSONALIZED_CHILD", text: "Do zobaczenia, {child}! Mam nadzieję, że niedługo przeżyjemy razem kolejną przygodę!", pauseAfterMs: 300 },
  ],
};
