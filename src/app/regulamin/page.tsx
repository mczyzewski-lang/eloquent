import { SiteFooter, SiteHeader } from "@/components/site/Header";

export const metadata = { title: "Regulamin", alternates: { canonical: "/regulamin" } };

export default function TermsPage() {
  return (
    <div className="paper min-h-dvh">
      <SiteHeader />
      <main className="container-page max-w-3xl py-10 leading-relaxed">
        <h1 className="text-3xl font-semibold">Regulamin</h1>
        <p className="mt-2 text-sm text-muted">Wersja robocza do weryfikacji prawnej przed startem produkcyjnym.</p>
        <ol className="mt-6 list-decimal space-y-3 pl-6 text-muted">
          <li>Elofik (elofik.com) udostępnia personalizowane bajki audio dla dzieci w wieku 4–7 lat. Konto może założyć wyłącznie osoba pełnoletnia.</li>
          <li>Abonament Elofik Premium kosztuje 39,90 zł brutto miesięcznie, odnawia się automatycznie i można go anulować w każdej chwili w panelu rodzica — dostęp trwa do końca opłaconego okresu.</li>
          <li>Każdego dnia o 6:00 (czas strefy rodziny) odblokowuje się jedna nowa bajka. Odblokowane bajki pozostają dostępne przy aktywnym dostępie.</li>
          <li>Prezent „1 miesiąc” to jednorazowa płatność 39,90 zł brutto bez automatycznego odnowienia. Link aktywacyjny działa jeden raz i jest ważny 12 miesięcy.</li>
          <li>Program poleceń: nagrody przysługują za opłacone subskrypcje nowych, niezależnych rodzin. Samopolecenia nie są nagradzane.</li>
          <li>Treści mają charakter edukacyjno-rozrywkowy i wspierają rozwój słownictwa; nie stanowią terapii ani diagnozy.</li>
          <li>Reklamacje: pomoc@elofik.com. Konsumentowi przysługuje prawo odstąpienia od umowy zgodnie z przepisami; rozpoczęcie korzystania z treści cyfrowych za zgodą konsumenta może wpływać na to prawo.</li>
        </ol>
      </main>
      <SiteFooter />
    </div>
  );
}
