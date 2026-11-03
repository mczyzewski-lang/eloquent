import Link from "next/link";
import { notFound } from "next/navigation";
import { Gift } from "lucide-react";
import { SiteHeader } from "@/components/site/Header";
import { StoryCover } from "@/components/elofik/StoryCover";
import { GiftPlayer } from "@/components/gifts/GiftPlayer";
import { ShareButtons } from "@/components/gifts/ShareButtons";
import { buttonVariants } from "@/components/ui/button";
import { getFreeGiftStory } from "@/lib/services/gifts";
import { getNameForms } from "@/lib/domain/names";
import { absoluteUrl } from "@/lib/config";
import { GIFT_STORY } from "@/content/sample";

export const metadata = { title: "Bajka-niespodzianka od Elofika", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function GiftStoryPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ nowa?: string }> }) {
  const { token } = await params;
  const sp = await searchParams;
  const data = await getFreeGiftStory(token);
  if (!data) notFound();
  const forms = getNameForms(data.gift.child_name);
  const giverCap = data.giver.charAt(0).toUpperCase() + data.giver.slice(1);
  const url = absoluteUrl(`/prezent/${token}`);
  const creator = Boolean(sp.nowa);
  const verb = data.gift.giver_relation === "grandma" ? "przygotowała" : "przygotował";
  return (
    <div className="paper min-h-dvh">
      <SiteHeader variant="grandparents" />
      <main className="container-page max-w-xl py-8">
        <h1 className="text-center text-3xl font-semibold">
          {creator
            ? forms.genitive ? `Twoja bajka dla ${forms.genitive} jest gotowa!` : `Twoja bajka jest gotowa, ${forms.nominative} już czeka!`
            : forms.genitive ? `${giverCap} ${verb} bajkę dla ${forms.genitive}!` : `${giverCap} ${verb} bajkę — ${forms.nominative}, posłuchaj!`}
        </h1>
        <StoryCover day={1} title={GIFT_STORY.title} childName={forms.nominative} className="mt-6 aspect-[4/3]" />
        <p className="mt-4 text-center text-muted">W tej przygodzie występuje również {data.giver}.</p>
        <div className="mt-4"><GiftPlayer audioUrl={data.audioUrl} provider={data.provider} timeline={data.assembly.timeline} /></div>
        {creator && (
          <div className="mt-6">
            <p className="mb-2 text-center font-semibold text-navy">Wyślij link rodzicom</p>
            <ShareButtons url={url} text={`Mam dla ${forms.genitive ?? forms.nominative} bajkę od Elofika, w której występuję! Posłuchajcie:`} />
          </div>
        )}
        <div className="card-soft mt-8 p-6 text-center">
          <Gift className="mx-auto h-8 w-8 text-gold-deep" />
          <p className="mt-2 font-display text-xl font-semibold text-navy">{creator ? "Chcesz podarować coś więcej?" : "Spodobało się?"}</p>
          <p className="mt-1 text-muted">{creator ? "Miesiąc codziennych bajek z Elofikiem — każdego dnia nowe słowo i nowa przygoda." : "Elofik może opowiadać nową bajkę każdego dnia — z imieniem dziecka i bliskich."}</p>
          <Link href={creator ? "/dla-dziadkow/kup" : "/?utm_source=gift"} className={buttonVariants({ size: "lg", className: "mt-4 w-full" })}>{creator ? "Podaruj pełny dostęp" : "Poznaj Elofika"}</Link>
        </div>
      </main>
    </div>
  );
}
