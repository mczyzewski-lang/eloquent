"use client";

import { ROUTINES } from "@/lib/domain/routine";
import { InviteCard } from "./InviteCard";
import { useState } from "react";
import { Bell, BookHeart, Copy, CreditCard, Download, Gift, Loader2, Mic, Plus, Save, ShieldCheck, Trash2, User, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { CheckoutButton } from "@/components/site/CheckoutButton";
import type { RelationType } from "@/lib/domain/templates";
import { validateName } from "@/lib/domain/names";
import { track } from "@/lib/client/analytics";
import { cn } from "@/lib/utils";

const RELS: [RelationType, string][] = [["mom", "Mama"], ["dad", "Tata"], ["grandma", "Babcia"], ["grandpa", "Dziadek"], ["brother", "Brat"], ["sister", "Siostra"], ["dog", "Pies"], ["cat", "Kot"], ["other", "Ktoś bliski"]];
const INTERESTS: [string, string][] = [["zwierzeta", "Zwierzęta"], ["kosmos", "Kosmos"], ["dinozaury", "Dinozaury"], ["przyroda", "Przyroda"], ["pojazdy", "Pojazdy"], ["morza", "Morza i oceany"], ["magia", "Magia"], ["odkrywanie", "Odkrywanie świata"], ["roboty", "Roboty"], ["przygody", "Przygody"], ["sport", "Sport"], ["inne", "Inne"]];
const REWARD_LABEL: Record<string, string> = { special_story: "Specjalna bajka", bonus_adventure: "Dodatkowa przygoda", free_month: "Miesiąc premium gratis" };

async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error ?? "Błąd");
  return j;
}

interface Props {
  child: { name: string; age: number; diminutive: string; vocative: string; gender: "m" | "f" | "n" | null; addressStyle: "diminutive" | "full" | "name_only" };
  members: { relation: RelationType; name: string }[];
  interests: string[];
  access: { hasAccess: boolean; source: string | null; endsAt: string | null; cancelAtPeriodEnd: boolean; autoRenews: boolean };
  stripeEnabled: boolean;
  referral: { link: string; qualified: number; signups: number; rewards: string[]; goal: number };
  settings: { voiceGreetingEnabled: boolean; voiceConsent: boolean; emailDaily: boolean; pushEnabled: boolean; sendHour: number; marketingConsent: boolean; timezone: string; routine: string | null };
  history: { day: number; title: string; word: string; listened: boolean; completed: boolean }[];
}

export function AccountPanel(p: Props) {
  const [child, setChild] = useState(p.child);
  const [members, setMembers] = useState(p.members);
  const [interests, setInterests] = useState(p.interests);
  const [settings, setSettings] = useState(p.settings);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState("");

  async function saveProfile() {
    setSaving(true);
    setMsg(null);
    try {
      await post("/api/account/profile", {
        child: { name: child.name, age: child.age, diminutive: child.diminutive || null, vocative: child.vocative || null, diminutiveVocative: child.vocative || null, gender: child.gender, addressStyle: child.vocative ? "diminutive" : child.addressStyle },
        members: members.filter((m) => m.name.trim()),
        interests,
      });
      setMsg("Zapisano! Elofik zapamiętał zmiany.");
    } catch (e) {
      setMsg((e as Error).message);
    }
    setSaving(false);
  }

  async function saveSetting(patch: Partial<Props["settings"]>) {
    setSettings((s) => ({ ...s, ...patch }));
    await post("/api/account/settings", patch).catch(() => undefined);
  }

  async function portal() {
    try {
      const j = await post("/api/portal", {});
      window.location.href = j.url;
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <div className="mt-6 space-y-6">
      <Card>
        <h2 className="flex items-center gap-2 text-xl font-semibold"><User className="h-5 w-5 text-gold-deep" /> Profil dziecka</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div><Label htmlFor="a-name">Imię</Label><Input id="a-name" value={child.name} maxLength={30} onChange={(e) => setChild({ ...child, name: e.target.value })} /></div>
          <div>
            <Label>Wiek</Label>
            <div className="grid grid-cols-4 gap-1.5">
              {[4, 5, 6, 7].map((a) => <button key={a} type="button" aria-pressed={child.age === a} onClick={() => setChild({ ...child, age: a })} className={cn("h-14 rounded-2xl border-2 font-semibold", child.age === a ? "border-gold-deep bg-gold/25" : "border-navy/10 bg-white text-muted")}>{a}</button>)}
            </div>
          </div>
          <div><Label htmlFor="a-dim">Zdrobnienie</Label><Input id="a-dim" value={child.diminutive} maxLength={30} onChange={(e) => setChild({ ...child, diminutive: e.target.value })} /></div>
          <div><Label htmlFor="a-voc">Jak Elofik się zwraca („Hej, …!”)</Label><Input id="a-voc" value={child.vocative} maxLength={30} placeholder="np. Leonku" onChange={(e) => setChild({ ...child, vocative: e.target.value })} /></div>
        </div>
        <div className="mt-4">
          <Label>Forma gramatyczna</Label>
          <div className="grid grid-cols-3 gap-2">
            {([["m", "On"], ["f", "Ona"], [null, "Neutralnie"]] as const).map(([g, l]) => <button key={l} type="button" aria-pressed={child.gender === g} onClick={() => setChild({ ...child, gender: g })} className={cn("h-12 rounded-2xl border-2 font-semibold", child.gender === g ? "border-gold-deep bg-gold/25" : "border-navy/10 bg-white text-muted")}>{l}</button>)}
          </div>
        </div>

        <h3 className="mt-8 flex items-center gap-2 text-lg font-semibold"><Users className="h-5 w-5 text-sage-deep" /> Bliscy i zwierzaki</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {RELS.map(([r, l]) => <button key={r} type="button" onClick={() => setMembers([...members, { relation: r, name: "" }])} className="inline-flex items-center gap-1 rounded-full border-2 border-navy/10 bg-white px-3 py-1.5 text-sm font-semibold text-navy"><Plus className="h-4 w-4" />{l}</button>)}
        </div>
        <ul className="mt-3 space-y-2">
          {members.map((m, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="w-24 text-sm font-semibold text-muted">{RELS.find((x) => x[0] === m.relation)?.[1]}</span>
              <Input className="h-12" aria-label="Imię" value={m.name} maxLength={30} onChange={(e) => setMembers(members.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
              <button type="button" aria-label="Usuń" onClick={() => setMembers(members.filter((_, j) => j !== i))} className="p-2 text-muted"><X className="h-5 w-5" /></button>
            </li>
          ))}
        </ul>

        <h3 className="mt-8 text-lg font-semibold">Zainteresowania</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {INTERESTS.map(([id, l]) => {
            const on = interests.includes(id);
            return <button key={id} type="button" aria-pressed={on} onClick={() => setInterests(on ? interests.filter((x) => x !== id) : [...interests, id])} className={cn("rounded-full border-2 px-3 py-1.5 text-sm font-semibold", on ? "border-gold-deep bg-gold/20" : "border-navy/10 bg-white text-muted")}>{l}</button>;
          })}
        </div>
        <Button className="mt-6 w-full" onClick={saveProfile} disabled={saving || !validateName(child.name).ok || members.some((m) => m.name && !validateName(m.name).ok)}>
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />} Zapisz profil
        </Button>
        {msg && <p className="mt-3 text-center text-sm font-semibold text-navy" role="status">{msg}</p>}
        <p className="mt-2 text-xs text-muted">Po zmianie imienia Elofik nagra tylko fragmenty z tym imieniem — reszta bajki pozostaje bez zmian.</p>
      </Card>

      <Card>
        <h2 className="flex items-center gap-2 text-xl font-semibold"><CreditCard className="h-5 w-5 text-gold-deep" /> Abonament</h2>
        {p.access.hasAccess ? (
          <div className="mt-3 space-y-2">
            <p><Badge tone="sage">aktywny</Badge> <span className="ml-2 text-muted">{p.access.source === "gift" ? "Prezent" : p.access.source === "referral" ? "Nagroda za polecenia" : "Elofik Premium"}</span></p>
            {p.access.endsAt && <p className="text-muted">{p.access.autoRenews ? "Odnowienie" : "Dostęp do"}: {new Date(p.access.endsAt).toLocaleDateString("pl-PL")}</p>}
            {p.access.cancelAtPeriodEnd && p.access.source !== "gift" && <p className="text-sm text-muted">Abonament zakończy się z końcem okresu rozliczeniowego.</p>}
            {p.access.source === "gift" && <p className="text-sm text-muted">Prezent nie odnawia się automatycznie. Po jego zakończeniu możesz kontynuować z abonamentem.</p>}
            {p.stripeEnabled && p.access.source === "stripe" && <Button variant="soft" onClick={portal}>Zarządzaj płatnościami i anulowaniem</Button>}
            {!p.stripeEnabled && p.access.source === "demo" && !p.access.cancelAtPeriodEnd && (
              <Button variant="soft" onClick={async () => { await post("/api/simulate", { kind: "cancel" }); location.reload(); }}>Anuluj z końcem okresu (demo)</Button>
            )}
          </div>
        ) : (
          <div className="mt-3">
            <p className="text-muted">Brak aktywnego abonamentu — dostępna jest pierwsza bajka.</p>
            <CheckoutButton className="mt-3">Wykup Elofik Premium — 39,90 zł/mies.</CheckoutButton>
          </div>
        )}
      </Card>

      <InviteCard link={p.referral.link} qualified={p.referral.qualified} signups={p.referral.signups} goal={p.referral.goal} rewards={p.referral.rewards} childName={p.child.name} />

      <Card id="powiadomienia">
        <h2 className="flex items-center gap-2 text-xl font-semibold"><Bell className="h-5 w-5 text-gold-deep" /> Ustawienia i zgody</h2>
        <div className="mt-2 rounded-2xl bg-cream p-4">
          <Label htmlFor="routine" className="mb-1">Wasza pora na bajkę</Label>
          <select id="routine" value={settings.routine ?? ""} onChange={(e) => e.target.value && saveSetting({ routine: e.target.value })} className="h-11 w-full rounded-xl border border-navy/10 bg-white px-3">
            {!settings.routine && <option value="">Wybierz porę…</option>}
            {ROUTINES.map((r) => <option key={r.id} value={r.id}>{r.emoji} {r.label}</option>)}
          </select>
          <p className="mt-1 text-xs text-muted">Stała pora buduje nawyk — dzieci najlepiej uczą się w rutynie. Przypomnienie przesunie się na tę porę.</p>
        </div>
        <Toggle icon={Mic} label="Rozpoczynaj bajki powitaniem głosowym" desc="Krótki rytuał „Hej Elofik!” z mikrofonem włączanym tylko po dotknięciu. Bez nagrywania głosu." checked={settings.voiceGreetingEnabled} onChange={(v) => saveSetting({ voiceGreetingEnabled: v })} />
        <Toggle icon={Bell} label="Przypomnienie e-mail o nowej bajce" desc={`„Nowa bajka Elofika już czeka!” — codziennie o ${settings.sendHour}:00.`} checked={settings.emailDaily} onChange={(v) => saveSetting({ emailDaily: v })} />
        {settings.emailDaily && (
          <div className="ml-12 mt-2 flex items-center gap-2 text-sm">
            <Label htmlFor="hour" className="mb-0">Godzina</Label>
            <select id="hour" value={settings.sendHour} onChange={(e) => saveSetting({ sendHour: Number(e.target.value) })} className="h-10 rounded-xl border border-navy/10 bg-white px-2">
              {Array.from({ length: 15 }, (_, i) => i + 7).map((h) => <option key={h} value={h}>{h}:00</option>)}
            </select>
          </div>
        )}
        <Toggle icon={BookHeart} label="Wiadomości o nowościach Elofika" desc="Rzadko i konkretnie. Możesz zrezygnować w każdej chwili." checked={settings.marketingConsent} onChange={(v) => saveSetting({ marketingConsent: v })} />
        <p className="mt-4 text-sm text-muted">Strefa czasowa: {settings.timezone} (nowa bajka o 6:00 czasu lokalnego).</p>
      </Card>

      <Card>
        <h2 className="text-xl font-semibold">Historia odblokowanych bajek</h2>
        <ul className="mt-3 divide-y divide-navy/5">
          {p.history.map((h) => (
            <li key={h.day} className="flex items-center justify-between gap-2 py-2 text-sm">
              <span><strong>Dzień {h.day}</strong> · {h.title}</span>
              <span className="text-muted">{h.word} {h.completed ? "✓" : h.listened ? "▶" : ""}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="flex items-center gap-2 text-xl font-semibold"><ShieldCheck className="h-5 w-5 text-sage-deep" /> Twoje dane</h2>
        <p className="mt-2 text-sm text-muted">Przechowujemy wyłącznie dane potrzebne do działania bajek. Nie nagrywamy głosu dziecka i nie zapisujemy transkrypcji.</p>
        <a href="/api/account/export" className="mt-4 inline-flex items-center gap-2 font-semibold text-navy underline"><Download className="h-4 w-4" /> Pobierz eksport danych (JSON)</a>
        <div className="mt-6 rounded-2xl bg-red-50 p-4">
          <p className="font-semibold text-red-700">Usuń konto i wszystkie dane</p>
          <p className="mt-1 text-sm text-red-700/80">Nieodwracalne. Abonament zostanie anulowany. Wpisz USUŃ, aby potwierdzić.</p>
          <div className="mt-3 flex gap-2">
            <Input value={confirmDelete} onChange={(e) => setConfirmDelete(e.target.value)} className="h-12" aria-label="Potwierdzenie usunięcia" />
            <Button variant="danger" disabled={confirmDelete !== "USUŃ"} onClick={async () => { await post("/api/account/delete", { confirm: "USUŃ" }); window.location.href = "/"; }}><Trash2 className="h-5 w-5" /></Button>
          </div>
        </div>
        <form action="/auth/wyloguj" method="post" className="mt-6">
          <Button variant="ghost" type="submit">Wyloguj się</Button>
        </form>
      </Card>
    </div>
  );
}

function Toggle({ icon: Icon, label, desc, checked, onChange }: { icon: React.ComponentType<{ className?: string }>; label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="mt-4 flex cursor-pointer items-start gap-3">
      <Icon className="mt-1 h-5 w-5 flex-none text-navy" />
      <span className="flex-1">
        <span className="block font-semibold text-navy">{label}</span>
        <span className="block text-sm text-muted">{desc}</span>
      </span>
      <span className="relative mt-1 inline-flex">
        <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-7 w-12 rounded-full bg-navy/15 transition peer-checked:bg-sage-deep peer-focus-visible:ring-4 peer-focus-visible:ring-gold/40" />
        <span className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
}
