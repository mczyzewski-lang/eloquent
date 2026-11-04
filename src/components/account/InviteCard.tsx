"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy, Gift, Lock, Share2, Sparkles, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { track } from "@/lib/client/analytics";
import { cn } from "@/lib/utils";

/** „Zaproś 3 rodziny — odbierz miesiąc za darmo i sekretną bajkę”. */
export function InviteCard({ link, qualified, signups, goal, rewards, childName }: { link: string; qualified: number; signups: number; goal: number; rewards: string[]; childName: string }) {
  const [copied, setCopied] = useState(false);
  const done = Math.min(goal, qualified);
  const unlocked = rewards.includes("secret_story");
  const text = `Słuchamy z ${childName} bajek Elofika — codziennie nowa przygoda i jedno mądre słowo, a w historii pada imię dziecka. Spróbujcie, pierwsza bajka jest za darmo:`;

  async function share() {
    track("referral_link_copied");
    if (navigator.share) {
      try {
        await navigator.share({ title: "Elofik — bajki dla dzieci", text, url: link });
        return;
      } catch {
        // anulowane — spróbujemy skopiować
      }
    }
    await navigator.clipboard.writeText(`${text} ${link}`);
    setCopied(true);
  }

  return (
    <Card id="polecenia" className="relative overflow-hidden">
      <h2 className="flex items-center gap-2 text-xl font-semibold"><Gift className="h-5 w-5 text-gold-deep" /> Zaproś 3 rodziny — odbierz prezent</h2>
      <p className="mt-2 text-muted">Gdy 3 zaproszone rodziny założą konto i wysłuchają swojej pierwszej bajki, dostaniesz:</p>
      <ul className="mt-3 space-y-2">
        <li className="flex items-start gap-2"><Star className="mt-0.5 h-5 w-5 flex-none text-gold-deep" /><span><strong>Miesiąc Elofik Premium za darmo</strong></span></li>
        <li className="flex items-start gap-2"><Sparkles className="mt-0.5 h-5 w-5 flex-none text-gold-deep" /><span><strong>Sekretną bajkę (ok. 15 minut)</strong>, w której występuje cała Wasza rodzina — wszystkie imiona w jednej opowieści.</span></li>
      </ul>

      <div className="mt-5" aria-label={`Zaproszenia: ${done} z ${goal}`}>
        <div className="flex gap-2">
          {Array.from({ length: goal }, (_, i) => (
            <div key={i} className={cn("flex h-12 flex-1 items-center justify-center rounded-2xl border-2 font-display text-lg font-semibold", i < done ? "border-sage-deep bg-sage/20 text-sage-deep" : "border-dashed border-navy/15 text-muted")}>
              {i < done ? <Check className="h-6 w-6" /> : i + 1}
            </div>
          ))}
        </div>
        <p className="mt-2 text-sm text-muted">
          {unlocked ? "Gotowe! Prezent odebrany." : `Zaproszone rodziny: ${done} z ${goal}`}
          {signups > done && !unlocked ? ` · zarejestrowanych z Twojego linku: ${signups} (liczą się po wysłuchaniu pierwszej bajki)` : ""}
        </p>
      </div>

      {unlocked ? (
        <Link href="/app/bajka/sekretna-bajka-rodzinna" className="mt-4 flex items-center gap-3 rounded-2xl bg-navy p-4 text-cream">
          <Sparkles className="h-6 w-6 text-gold" />
          <span className="flex-1 font-semibold">Posłuchaj sekretnej bajki</span>
        </Link>
      ) : (
        <>
          <Button size="lg" className="mt-4 w-full" onClick={share} data-testid="invite-share"><Share2 className="h-5 w-5" /> Zaproś znajomych</Button>
          <div className="mt-3 flex gap-2">
            <Input readOnly value={link} className="h-12 text-sm" aria-label="Twój link zaproszenia" />
            <Button variant="soft" aria-label="Kopiuj link" onClick={async () => { await navigator.clipboard.writeText(link); setCopied(true); track("referral_link_copied"); }}>{copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}</Button>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted"><Lock className="h-3.5 w-3.5" /> Liczą się nowe rodziny z innym numerem telefonu — nie da się zaprosić samego siebie.</p>
        </>
      )}
    </Card>
  );
}
