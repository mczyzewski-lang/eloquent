const ITEMS: [string, string][] = [
  ["Dla dzieci w jakim wieku jest Elofik?", "Bajki są pisane dla dzieci w wieku 4–7 lat: krótkie zdania, spokojne tempo, ciepły humor i jedno słowo na przygodę."],
  ["Ile trwa jedna bajka?", "Od 5 do 10 minut. To idealna długość na wieczorny rytuał albo krótką przerwę w ciągu dnia."],
  ["Jak często pojawiają się nowe bajki?", "Każdego dnia o 6:00 rano odblokowuje się dokładnie jedna nowa bajka. Jeśli opuścicie dzień — nic się nie dzieje, bajka czeka w bibliotece."],
  ["Czy dziecko musi patrzeć w ekran?", "Nie. Po krótkim powitaniu „Hej Elofik!” możesz odłożyć telefon. Bajka gra także w tle i przy zablokowanym ekranie."],
  ["Co z mikrofonem i prywatnością?", "Mikrofon włącza się wyłącznie po dotknięciu przycisku, tylko na kilka sekund, a połączenie jest zamykane zaraz po rozpoznaniu powitania. Nie nagrywamy głosu dziecka, nie zapisujemy pełnej transkrypcji i nie tworzymy profili głosowych. Rytuał można w każdej chwili pominąć."],
  ["Czy imię mojego dziecka zostanie poprawnie wymówione?", "Dla popularnych imion Elofik zna poprawne formy (np. „Leonku!”). Dla nietypowych imion używa formy, którą wskażesz w profilu — nigdy nie zgaduje odmiany."],
  ["Czy Elofik rozmawia z dzieckiem jak chatbot?", "Nie. Elofik rozpoznaje tylko powitanie i odpowiada przygotowaną wcześniej, sprawdzoną kwestią. Nie ma swobodnych rozmów z AI."],
  ["Ile kosztuje abonament i jak go anulować?", "39,90 zł brutto miesięcznie. Anulujesz jednym kliknięciem w panelu rodzica — dostęp trwa do końca opłaconego okresu."],
  ["Czy mogę podarować Elofika wnukowi?", "Tak — na stronie „Dla dziadków” stworzysz bezpłatną bajkę-niespodziankę albo kupisz miesiąc dostępu jednorazowo, bez automatycznego odnowienia."],
  ["Czy Elofik podnosi inteligencję?", "Nie składamy takich obietnic. Elofik wspiera rozwój słownictwa, umiejętności językowych, wyobraźni i ciekawości świata — w formie, którą dzieci lubią."],
];

export function Faq() {
  return (
    <div className="mx-auto mt-10 max-w-3xl space-y-3">
      {ITEMS.map(([q, a]) => (
        <details key={q} className="card-soft group p-5 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-lg font-semibold text-navy">
            {q}
            <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-gold/30 transition group-open:rotate-45">+</span>
          </summary>
          <p className="mt-3 leading-relaxed text-muted">{a}</p>
        </details>
      ))}
    </div>
  );
}
