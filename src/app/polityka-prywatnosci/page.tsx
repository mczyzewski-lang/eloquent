import { SiteFooter, SiteHeader } from "@/components/site/Header";

export const metadata = { title: "Polityka prywatności", alternates: { canonical: "/polityka-prywatnosci" } };

export default function PrivacyPage() {
  return (
    <div className="paper min-h-dvh">
      <SiteHeader />
      <main className="container-page max-w-3xl py-10 leading-relaxed">
        <h1 className="text-3xl font-semibold">Polityka prywatności</h1>
        <p className="mt-2 text-sm text-muted">Wersja robocza do weryfikacji prawnej przed startem produkcyjnym.</p>
        <section className="mt-6 space-y-4 text-muted">
          <p><strong className="text-navy">Kto korzysta z Elofika.</strong> Konto zakłada i kontroluje pełnoletni rodzic lub opiekun. Dzieci słuchają bajek pod opieką dorosłych. Nie tworzymy publicznych profili dzieci.</p>
          <p><strong className="text-navy">Jakie dane przetwarzamy.</strong> E-mail rodzica; imię, wiek, opcjonalne zdrobnienie i forma zwrotu dziecka; opcjonalne imiona bliskich i zwierząt; zainteresowania; postęp słuchania; dane rozliczeniowe przetwarzane przez Stripe. Przechowujemy wyłącznie dane niezbędne do działania bajek.</p>
          <p><strong className="text-navy">Mikrofon i rytuał „Hej Elofik!”.</strong> Mikrofon włącza się wyłącznie po dotknięciu przycisku, na maks. kilka sekund. Dźwięk jest strumieniowany do ElevenLabs (Scribe) w celu zamiany na tekst i rozpoznania powitania; połączenie zamykamy natychmiast po rozpoznaniu. Nie zapisujemy nagrań w naszej bazie, nie przechowujemy pełnych transkrypcji, nie tworzymy profili biometrycznych i nie używamy głosu dziecka do klonowania głosu. Zapisujemy jedynie wynik (rozpoznano / nie rozpoznano) i czas trwania połączenia do rozliczeń kosztów.</p>
          <p><strong className="text-navy">Treści generowane przez AI.</strong> Scenariusze bajek powstają z pomocą modeli AI i są sprawdzane przez redakcję przed publikacją. Nie prowadzimy swobodnych rozmów AI z dziećmi.</p>
          <p><strong className="text-navy">Podmioty przetwarzające.</strong> Supabase (baza danych i pliki, UE), Stripe (płatności), ElevenLabs (synteza i rozpoznawanie mowy), OpenAI (scenariusze i ilustracje — bez danych dzieci), Railway (hosting), dostawca e-mail.</p>
          <p><strong className="text-navy">Twoje prawa.</strong> W panelu rodzica możesz pobrać eksport danych, poprawić je, cofnąć zgody (mikrofon, przypomnienia, marketing) oraz trwale usunąć konto. Kontakt: pomoc@elofik.com.</p>
          <p><strong className="text-navy">Linki prezentowe.</strong> Są losowe, nieprzewidywalne i wygasają (bajka-niespodzianka: 30 dni; aktywacja prezentu: 12 miesięcy, jednorazowo). W bazie przechowujemy tylko ich skróty kryptograficzne.</p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
