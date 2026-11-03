"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft, ArrowRight, Baby, Bone, Bot, Car, Cat, Compass, Dog, Heart, HeartHandshake, Leaf, Loader2, Map, PawPrint, Plus, Rocket, Sparkles, Trophy, User, Users, Waves, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Elofik } from "@/components/elofik/Elofik";
import { StoryCover } from "@/components/elofik/StoryCover";
import { AuthForm, type AuthConfig } from "./AuthForm";
import { getNameForms, validateName, type GrammaticalGender } from "@/lib/domain/names";
import type { RelationType } from "@/lib/domain/templates";
import { track } from "@/lib/client/analytics";
import { cn } from "@/lib/utils";

export const DRAFT_KEY = "elofik_onboarding_draft";

type Member = { id: string; relation: RelationType; name: string; label: string };

export interface OnboardingDraft {
  child: { name: string; age: number; diminutive: string; gender: GrammaticalGender | null; address: "diminutive" | "full" | "name_only" | "custom"; customAddress: string };
  members: Member[];
  interests: string[];
}

const TILES: { relation: RelationType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { relation: "mom", label: "Mama", icon: Heart },
  { relation: "dad", label: "Tata", icon: User },
  { relation: "grandma", label: "Babcia", icon: HeartHandshake },
  { relation: "grandma", label: "Druga babcia", icon: HeartHandshake },
  { relation: "grandpa", label: "Dziadek", icon: Users },
  { relation: "grandpa", label: "Drugi dziadek", icon: Users },
  { relation: "brother", label: "Brat", icon: Baby },
  { relation: "sister", label: "Siostra", icon: Baby },
  { relation: "dog", label: "Pies", icon: Dog },
  { relation: "cat", label: "Kot", icon: Cat },
  { relation: "other", label: "Inni bliscy", icon: Plus },
];

const INTERESTS: { id: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "zwierzeta", label: "Zwierzęta", icon: PawPrint },
  { id: "kosmos", label: "Kosmos", icon: Rocket },
  { id: "dinozaury", label: "Dinozaury", icon: Bone },
  { id: "przyroda", label: "Przyroda", icon: Leaf },
  { id: "pojazdy", label: "Pojazdy", icon: Car },
  { id: "morza", label: "Morza i oceany", icon: Waves },
  { id: "magia", label: "Magia", icon: Sparkles },
  { id: "odkrywanie", label: "Odkrywanie świata", icon: Compass },
  { id: "roboty", label: "Roboty", icon: Bot },
  { id: "przygody", label: "Przygody", icon: Map },
  { id: "sport", label: "Sport", icon: Trophy },
  { id: "inne", label: "Inne", icon: Heart },
];

const REL_LABEL: Record<RelationType, string> = { mom: "mama", dad: "tata", grandma: "babcia", grandpa: "dziadek", brother: "brat", sister: "siostra", dog: "pies", cat: "kot", other: "" };

export function summarizeMembers(members: Member[]) {
  const parts = members.filter((m) => m.name.trim()).map((m) => `${REL_LABEL[m.relation]} ${m.name.trim()}`.trim());
  if (parts.length <= 1) return parts.join("");
  return `${parts.slice(0, -1).join(", ")} i ${parts[parts.length - 1]}`;
}

/** Zamienia szkic z UI na payload API. */
export function draftToPayload(d: OnboardingDraft, referralCode: string | null) {
  const forms = getNameForms(d.child.name);
  const custom = d.child.address === "custom" && d.child.customAddress.trim() ? d.child.customAddress.trim() : null;
  return {
    child: {
      name: d.child.name.trim(),
      age: d.child.age,
      diminutive: d.child.diminutive.trim() || null,
      vocative: custom ?? (d.child.address === "full" ? forms.vocative : null),
      diminutiveVocative: custom,
      gender: d.child.gender,
      addressStyle: custom ? "diminutive" : d.child.address === "custom" ? "name_only" : d.child.address,
    },
    members: d.members.filter((m) => m.name.trim()).map((m) => ({ relation: m.relation, name: m.name.trim() })),
    interests: d.interests,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    locale: "pl" as const,
    referralCode,
  };
}

export async function submitDraft(d: OnboardingDraft) {
  let ref: string | null = null;
  try {
    ref = localStorage.getItem("elofik_ref");
  } catch {}
  const res = await fetch("/api/onboarding", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(draftToPayload(d, ref)) });
  if (!res.ok) throw new Error((await res.json()).error ?? "Nie udało się zapisać profilu");
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {}
}

export function OnboardingWizard({ initialName, auth, loggedIn }: { initialName: string; auth: AuthConfig; loggedIn: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [draft, setDraft] = useState<OnboardingDraft>({
    child: { name: initialName, age: 5, diminutive: "", gender: null, address: "diminutive", customAddress: "" },
    members: [],
    interests: [],
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as OnboardingDraft;
        // odczyt szkicu po hydratacji (localStorage nie istnieje na serwerze)
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (!initialName || parsed.child.name === initialName) setDraft(parsed);
      }
    } catch {}
    track("onboarding_started");
  }, [initialName]);

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {}
  }, [draft]);


  const nameOk = validateName(draft.child.name).ok;
  const forms = useMemo(() => (nameOk ? getNameForms(draft.child.name) : null), [draft.child.name, nameOk]);
  const gen = forms?.genitive;
  const nom = forms?.nominative ?? draft.child.name;

  const addressOptions = useMemo(() => {
    if (!forms) return [];
    const opts: { value: OnboardingDraft["child"]["address"]; label: string }[] = [];
    if (forms.diminutiveVocative && forms.diminutiveVocative !== forms.vocative) opts.push({ value: "diminutive", label: `${forms.diminutiveVocative}!` });
    if (forms.vocative) opts.push({ value: "full", label: `${forms.vocative}!` });
    opts.push({ value: "name_only", label: `${forms.nominative}!` });
    opts.push({ value: "custom", label: "Inaczej…" });
    return opts;
  }, [forms]);

  // forma zwrotu wynikowa: wybór rodzica, o ile pasuje do aktualnego imienia; inaczej pierwsza dostępna
  const address: OnboardingDraft["child"]["address"] = addressOptions.some((o) => o.value === draft.child.address) ? draft.child.address : (addressOptions[0]?.value ?? "name_only");
  const effectiveDraft: OnboardingDraft = { ...draft, child: { ...draft.child, address } };

  function next() {
    track("onboarding_step_completed", { step });
    setStep((s) => Math.min(5, s + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function finish() {
    setSaving(true);
    setErr(null);
    try {
      await submitDraft(effectiveDraft);
      router.push("/app?witaj=1");
    } catch (e) {
      setErr((e as Error).message);
      setSaving(false);
    }
  }

  function addMember(t: (typeof TILES)[number]) {
    setDraft((d) => ({ ...d, members: [...d.members, { id: crypto.randomUUID(), relation: t.relation, name: "", label: t.label }] }));
  }

  const steps = ["Dziecko", "Rodzina", "Zainteresowania", "Podsumowanie", "Konto"];
  const summary = summarizeMembers(draft.members);

  return (
    <div className="mx-auto w-full max-w-xl">
      <ol className="mb-6 flex items-center justify-between gap-1" aria-label="Postęp">
        {steps.map((s, i) => (
          <li key={s} className="flex flex-1 flex-col items-center gap-1">
            <span className={cn("h-2 w-full rounded-full transition", i + 1 <= step ? "bg-gold" : "bg-navy/10")} />
            <span className={cn("hidden text-xs font-semibold sm:block", i + 1 === step ? "text-navy" : "text-muted")}>{s}</span>
          </li>
        ))}
      </ol>

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.25 }} className="card-soft p-6 sm:p-8">
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 flex-none"><Elofik mood="waving" /></div>
                <h1 className="text-2xl font-semibold">Poznajmy się! Kto będzie słuchał bajek?</h1>
              </div>
              <div>
                <Label htmlFor="cname">Imię dziecka</Label>
                <Input id="cname" value={draft.child.name} maxLength={30} onChange={(e) => setDraft((d) => ({ ...d, child: { ...d.child, name: e.target.value } }))} placeholder="np. Leon" />
              </div>
              <div>
                <Label>Wiek</Label>
                <div className="grid grid-cols-4 gap-2">
                  {[4, 5, 6, 7].map((a) => (
                    <button key={a} type="button" onClick={() => setDraft((d) => ({ ...d, child: { ...d.child, age: a } }))} className={cn("h-14 rounded-2xl border-2 font-display text-xl font-semibold transition", draft.child.age === a ? "border-gold-deep bg-gold/25 text-navy" : "border-navy/10 bg-white text-muted")} aria-pressed={draft.child.age === a}>
                      {a} lat{a === 4 ? "a" : ""}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Jak mówić o dziecku w bajkach?</Label>
                <div className="grid grid-cols-3 gap-2">
                  {([["m", "On"], ["f", "Ona"], [null, "Neutralnie"]] as const).map(([g, l]) => (
                    <button key={l} type="button" onClick={() => setDraft((d) => ({ ...d, child: { ...d.child, gender: g } }))} className={cn("h-12 rounded-2xl border-2 font-semibold transition", draft.child.gender === g ? "border-gold-deep bg-gold/25 text-navy" : "border-navy/10 bg-white text-muted")} aria-pressed={draft.child.gender === g}>
                      {l}
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-xs text-muted">Np. „Gotowy?” / „Gotowa?” / „Lecimy?”. Formy neutralne są zawsze poprawne.</p>
              </div>
              {forms && (
                <div>
                  <Label>Jak Elofik ma się zwracać do dziecka?</Label>
                  <div className="flex flex-wrap gap-2">
                    {addressOptions.map((o) => (
                      <button key={o.value} type="button" onClick={() => setDraft((d) => ({ ...d, child: { ...d.child, address: o.value } }))} className={cn("rounded-full border-2 px-4 py-2 font-display font-semibold transition", address === o.value ? "border-gold-deep bg-gold/25 text-navy" : "border-navy/10 bg-white text-muted")}>
                        {o.value === "custom" ? o.label : `„Hej, ${o.label}”`}
                      </button>
                    ))}
                  </div>
                  {address === "custom" && (
                    <Input className="mt-3" placeholder="np. Leoś" maxLength={30} value={draft.child.customAddress} onChange={(e) => setDraft((d) => ({ ...d, child: { ...d.child, customAddress: e.target.value } }))} />
                  )}
                  {!forms.known && <p className="mt-2 text-xs text-muted">Nie znamy jeszcze odmiany tego imienia — Elofik użyje formy, którą wybierzesz. Nie zgadujemy.</p>}
                </div>
              )}
              <div>
                <Label htmlFor="dim">Zdrobnienie (opcjonalnie)</Label>
                <Input id="dim" value={draft.child.diminutive} maxLength={30} placeholder={forms?.diminutive ?? "np. Leoś"} onChange={(e) => setDraft((d) => ({ ...d, child: { ...d.child, diminutive: e.target.value } }))} />
              </div>
              <Button size="lg" className="w-full" onClick={next} disabled={!nameOk}>
                Dalej <ArrowRight className="h-5 w-5" />
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h1 className="text-2xl font-semibold">Kto jeszcze może występować w bajkach Elofika?</h1>
              <p className="text-muted">Wszystko opcjonalne. Dodaj tylko te osoby, które chcesz — możesz to zmienić później.</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {TILES.map((t) => (
                  <button key={t.label} type="button" onClick={() => addMember(t)} className="flex flex-col items-center gap-1.5 rounded-2xl border-2 border-navy/10 bg-white p-3 text-sm font-semibold text-navy transition hover:border-gold-deep hover:bg-gold/10 active:scale-95">
                    <t.icon className="h-6 w-6 text-sage-deep" />
                    {t.label}
                  </button>
                ))}
              </div>
              {draft.members.length > 0 && (
                <ul className="space-y-2">
                  {draft.members.map((m) => (
                    <li key={m.id} className="flex items-center gap-2">
                      <span className="w-28 flex-none text-sm font-semibold text-muted">{m.label}</span>
                      <Input
                        aria-label={`Imię: ${m.label}`}
                        className="h-12 text-base"
                        maxLength={30}
                        autoFocus={!m.name}
                        placeholder={m.relation === "dog" ? "np. Burek" : m.relation === "cat" ? "np. Mruczek" : "Imię"}
                        value={m.name}
                        onChange={(e) => setDraft((d) => ({ ...d, members: d.members.map((x) => (x.id === m.id ? { ...x, name: e.target.value } : x)) }))}
                      />
                      <button type="button" aria-label="Usuń" onClick={() => setDraft((d) => ({ ...d, members: d.members.filter((x) => x.id !== m.id) }))} className="flex h-10 w-10 flex-none items-center justify-center rounded-full text-muted hover:bg-navy/5">
                        <X className="h-5 w-5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-muted">Imiona bliskich pojawiają się w bajkach w prostej formie, np. „mama Monika powiedziała…”.</p>
              <NavButtons onBack={() => setStep(1)} onNext={next} nextLabel={draft.members.length ? "Dalej" : "Pomiń"} disabled={draft.members.some((m) => m.name && !validateName(m.name).ok)} />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h1 className="text-2xl font-semibold">{gen ? `Co najbardziej ciekawi ${gen}?` : "Co najbardziej ciekawi Twoje dziecko?"}</h1>
              <p className="text-muted">Pomoże nam to polecać przygody. Wybierz dowolnie wiele.</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {INTERESTS.map((i) => {
                  const on = draft.interests.includes(i.id);
                  return (
                    <button key={i.id} type="button" aria-pressed={on} onClick={() => setDraft((d) => ({ ...d, interests: on ? d.interests.filter((x) => x !== i.id) : [...d.interests, i.id] }))} className={cn("flex items-center gap-2 rounded-2xl border-2 px-3 py-3 text-left font-semibold transition", on ? "border-gold-deep bg-gold/20 text-navy" : "border-navy/10 bg-white text-muted")}>
                      <i.icon className="h-5 w-5 flex-none text-sage-deep" />
                      {i.label}
                    </button>
                  );
                })}
              </div>
              <NavButtons onBack={() => setStep(2)} onNext={next} />
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6 text-center">
              <h1 className="text-2xl font-semibold">{gen ? `Świat Elofika dla ${gen} jest gotowy!` : `Świat Elofika jest gotowy, ${nom}!`}</h1>
              <StoryCover day={1} title="Elofik i tajemniczy ślad" word="dociekliwość" childName={nom} className="aspect-[4/3]" />
              {summary && <p className="text-lg text-navy">{gen ? `W przygodach ${gen}` : "W przygodach"} mogą pojawiać się {summary}.</p>}
              <Button size="xl" className="w-full" onClick={next}>
                Rozpocznij przygodę <Sparkles className="h-5 w-5" />
              </Button>
              <button type="button" onClick={() => setStep(3)} className="text-sm font-semibold text-muted hover:text-navy">Wróć</button>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6">
              <h1 className="text-2xl font-semibold">Ostatni krok: konto rodzica</h1>
              <p className="text-muted">Konto zakłada dorosły opiekun. Przechowujemy tylko to, co potrzebne do działania bajek.</p>
              {loggedIn ? (
                <Button size="lg" className="w-full" onClick={finish} disabled={saving}>
                  {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : null} Zapisz i przejdź do bajek
                </Button>
              ) : (
                <AuthForm auth={auth} next="/onboarding/zakoncz" onDemoSignedIn={finish} />
              )}
              {err && <p role="alert" className="text-sm font-semibold text-red-600">{err}</p>}
              <button type="button" onClick={() => setStep(4)} className="text-sm font-semibold text-muted hover:text-navy">Wróć</button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function NavButtons({ onBack, onNext, nextLabel = "Dalej", disabled }: { onBack: () => void; onNext: () => void; nextLabel?: string; disabled?: boolean }) {
  return (
    <div className="flex gap-3">
      <Button variant="soft" size="lg" onClick={onBack} aria-label="Wstecz">
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <Button size="lg" className="flex-1" onClick={onNext} disabled={disabled}>
        {nextLabel} <ArrowRight className="h-5 w-5" />
      </Button>
    </div>
  );
}
