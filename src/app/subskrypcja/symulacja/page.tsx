import { notFound } from "next/navigation";
import { hasStripe } from "@/lib/config";
import { SimulatedCheckout } from "@/components/site/SimulatedCheckout";

export const metadata = { title: "Płatność (demo)", robots: { index: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ kind?: string; gift?: string }> }) {
  if (hasStripe()) notFound();
  const sp = await searchParams;
  return <SimulatedCheckout kind={sp.kind === "gift" ? "gift" : "subscription"} giftId={sp.gift ?? null} />;
}
