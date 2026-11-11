import { AdStage } from "@/components/video/AdStage";
import { AD_FORMATS, type AdFormat } from "@/components/video/AdFilm";

export const metadata = { title: "Render reklamy", robots: { index: false, follow: false } };

/** Strona techniczna: pojedyncza klatka reklamy w skali 1:1 (do generowania pliku MP4). */
export default async function AdRenderPage({ searchParams }: { searchParams: Promise<{ format?: string; t?: string }> }) {
  const sp = await searchParams;
  const format = (sp.format && sp.format in AD_FORMATS ? sp.format : "9x16") as AdFormat;
  const t = Number.isFinite(Number(sp.t)) ? Number(sp.t) : 0;
  return <AdStage format={format} initial={t} />;
}
