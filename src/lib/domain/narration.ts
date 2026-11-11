/**
 * Głosy w bajce: NARRATOR (zapowiedź i narracja), ELOFIK (jego kwestie) i POSTAĆ (kwestie innych
 * bohaterów: wiewiórki, jeżyka…). Podział według polskiego zapisu dialogów z pauzą (—):
 *   „— Widziałam! — pisnęła wiewiórka. — Coś malutkiego przemknęło tędy w nocy.”
 *   → postać: „Widziałam!”, narrator: „pisnęła wiewiórka.”, postać: „Coś malutkiego…”
 * Kto mówi, rozpoznajemy po didaskaliach („powiedział Elofik” / „pisnęła wiewiórka”), po zdaniu
 * narracji tuż przed kwestią („Jeżyk pociągnął noskiem. — Moje.”) i po naprzemienności dialogu.
 * Redakcja może wymusić głos znacznikami [narrator] / [elofik] / [postać] w tekście.
 */
export type Speaker = "narrator" | "elofik" | "character";

export interface NarrationPart {
  speaker: Speaker;
  text: string;
}

const LOWER = /^[a-ząćęłńóśźż]/;
/** Słowa, które zaczynają zdanie, ale nie są podmiotem narracji. */
const NOT_SUBJECT = /^(Kto|Ktoś|Co|Coś|To|Ja|Ty|On|Ona|Ono|My|Wy|Oni|Czy|Nie|A|I|Ale|Bo|Gdy|Kiedy|Że|Jak|Tak|Może|Chyba|Tu|Tam|Już|Jeszcze|Wszystko|Nic|Każdy|Ten|Ta|Te|Mój|Moja|Moje|Twój|Nasz)$/;
/** Zdanie narracji: „Elofik zastrzygł uszami.”, „Jeżyk pociągnął noskiem.”, „Nagle…”. */
const NARRATIVE_WORD = /^(Nagle|Wtedy|Potem|Po chwili|Wreszcie|Tymczasem|I wtedy|W końcu)\b/;
/** „Gdy słońce zaczęło…”, „Szukali długo.” — narracja w czasie przeszłym, w 3. osobie. */
const NARRATIVE_PAST = /^(?:(?:Gdy|Kiedy)\s+[\p{Ll}]+\s+(?:się\s+)?[\p{Ll}]+(?:ł|ła|ło|li|ły)|\p{Lu}[\p{Ll}]+(?:li|ły))(?:\s|[.,!?…])/u;
const SUBJECT_VERB = /^(\p{Lu}[\p{Ll}-]+)\s+(?:się\s+)?[\p{Ll}]+(?:ł|ła|ło|li|ły)(?:\s|[.,!?…])/u;
const FAMILY = /\b(mama|tata|babcia|dziadek|brat|siostra|mamusia|tatuś)\b/i;
const ADVERBISH = /^(się|też|już|tylko|tak|jeszcze|wtedy|potem)$|(nie|ie|o|ąc|rze|le)$/i;

function sentences(text: string): string[] {
  return text.match(/[^.!?…]+(?:[.!?…]+["”»]?|$)\s*/g)?.map((s) => s.trim()).filter(Boolean) ?? [text.trim()];
}

function isNarrativeSentence(s: string): boolean {
  if (NARRATIVE_WORD.test(s) || NARRATIVE_PAST.test(s)) return true;
  const m = SUBJECT_VERB.exec(s);
  return Boolean(m && !NOT_SUBJECT.test(m[1]));
}

/** Kto mówi według didaskaliów („powiedział łagodnie Elofik”, „pisnęła wiewiórka”, „zapytał”). */
function speakerFromAttribution(attr: string): Speaker | null {
  const first = sentences(attr)[0] ?? "";
  if (/\bElofik/.test(first)) return "elofik";
  if (FAMILY.test(first)) return "narrator"; // kwestie bliskich czyta narrator (nie „zwierzęcym” głosem)
  // podmiot stoi tuż po czasowniku: „pisnęła wiewiórka”, „zapytała mała wydra” (do pierwszego „i”, przecinka, przyimka)
  const clause = first.split(/,|\s(?:i|a|do|z|ze|na|w|po|pod|nad|przy|o|że)\s/)[0];
  const words = clause.replace(/[.,!?…:;]/g, "").split(/\s+/).filter(Boolean);
  const subject = words.slice(1).find((w) => w.length > 2 && !ADVERBISH.test(w));
  if (subject) return "character";
  // sam czasownik: Elofik jest chłopcem, więc „zapytała”, „zawołały” to ktoś inny
  return /(ła|ło|ły|li)$/.test(words[0] ?? "") ? "character" : null;
}

/** Wskazówka z narracji tuż przed kwestią: „Jeżyk pociągnął noskiem.” → mówi postać. */
function speakerFromLeadIn(narration: string): Speaker | null {
  const all = sentences(narration);
  const last = all[all.length - 1] ?? "";
  if (/\bElofik/.test(last)) return "elofik";
  const m = SUBJECT_VERB.exec(last);
  if (m && !NOT_SUBJECT.test(m[1])) return FAMILY.test(m[1]) ? "narrator" : "character";
  return null;
}

interface Turn { speaker: Speaker | null; oppositeOf: Turn | null; attributed: boolean }

export function splitNarration(text: string, defaultSpeaker: Speaker = "narrator"): NarrationPart[] {
  const out: { speaker: Speaker | null; text: string; turn?: Turn }[] = [];
  const push = (speaker: Speaker | null, t: string, turn?: Turn) => {
    const clean = t.replace(/\s+/g, " ").trim();
    if (!clean || !/[\p{L}\d]/u.test(clean)) return;
    const last = out[out.length - 1];
    if (last && last.turn === turn && last.speaker === speaker && (turn || speaker) && out.length > partStart) last.text = `${last.text} ${clean}`;
    else out.push({ speaker, text: clean, turn });
  };

  // jawne znaczniki redakcji
  if (/\[(narrator|elofik|postać|postac)\]/i.test(text)) {
    let speaker: Speaker = defaultSpeaker;
    for (const chunk of text.split(/(\[(?:narrator|elofik|postać|postac)\])/i)) {
      const tag = /^\[(narrator|elofik|postać|postac)\]$/i.exec(chunk);
      if (tag) speaker = tag[1].toLowerCase() === "narrator" ? "narrator" : tag[1].toLowerCase() === "elofik" ? "elofik" : "character";
      else push(speaker, chunk.replace(/—/g, " "));
    }
    return out.map((o) => ({ speaker: o.speaker!, text: o.text }));
  }
  if (!text.includes("—")) {
    push(defaultSpeaker, text);
    return out.map((o) => ({ speaker: o.speaker!, text: o.text }));
  }

  const chunks = text.split("—");
  let last: "narr" | "quote" | "attr" = "narr";
  let turn: Turn | null = null;
  let leadIn = "";
  /** indeks pierwszego fragmentu bieżącej kwestii (od ostatnich didaskaliów) */
  let partStart = 0;
  chunks.forEach((raw, i) => {
    const c = raw.trim();
    if (!c) return;
    if (i === 0) {
      push("narrator", c);
      leadIn = c;
      return;
    }
    if (last === "narr" && LOWER.test(c)) {
      // zwykły myślnik w zdaniu narracji („…— to właśnie jest odwaga.”), nie dialog
      push("narrator", `— ${c}`);
      leadIn = c;
      return;
    }
    if (last === "quote" && LOWER.test(c)) {
      // didaskalia po kwestii
      const sp = speakerFromAttribution(c);
      if (turn) {
        if (sp && turn.attributed && turn.speaker && turn.speaker !== sp) {
          // „— Co się stało? — zapytał Elofik. — Chcę zbudować most — fuknęła wydra.” → druga kwestia to nowa osoba
          const fresh: Turn = { speaker: sp, oppositeOf: turn, attributed: true };
          for (let k = partStart; k < out.length; k++) if (out[k].turn === turn) out[k].turn = fresh;
          turn = fresh;
        } else {
          if (sp) turn.speaker = sp;
          turn.attributed = true;
        }
      }
      push("narrator", c);
      leadIn = sentences(c).length > 1 ? c : "";
      last = "attr";
      return;
    }
    // kwestia
    if (last === "quote") {
      turn = { speaker: null, oppositeOf: turn, attributed: false }; // kolejna osoba w dialogu
    } else if (last === "attr" && turn) {
      // po didaskaliach zwykle mówi dalej ta sama osoba; w szybkiej wymianie zdań — rozmówca
      if (turn.oppositeOf && turn.attributed && /\?["”»]?$/.test(sentences(c)[0] ?? "")) turn = { speaker: null, oppositeOf: turn, attributed: false };
    } else {
      turn = { speaker: speakerFromLeadIn(leadIn), oppositeOf: null, attributed: false };
    }
    last = "quote";
    partStart = out.length;
    let speaking = true;
    sentences(c).forEach((s, k) => {
      if (speaking && k > 0 && isNarrativeSentence(s)) speaking = false;
      if (speaking) push(null, s, turn!);
      else {
        push("narrator", s);
        leadIn = s;
        last = "narr";
      }
    });
  });

  // ustalenie mówców: znani z didaskaliów/narracji; nieznani — przeciwni do rozmówcy; domyślnie Elofik
  const turns = [...new Set(out.map((o) => o.turn).filter(Boolean))] as Turn[];
  const other = (s: Speaker): Speaker => (s === "elofik" ? "character" : "elofik");
  for (let pass = 0; pass < 3; pass++) {
    for (const t of turns) {
      if (!t.speaker && t.oppositeOf?.speaker && t.oppositeOf.speaker !== "narrator") t.speaker = other(t.oppositeOf.speaker);
      if (t.speaker && t.speaker !== "narrator" && t.oppositeOf && !t.oppositeOf.speaker) t.oppositeOf.speaker = other(t.speaker);
    }
  }
  const merged: NarrationPart[] = [];
  for (const o of out) {
    const speaker = o.speaker ?? o.turn?.speaker ?? "elofik";
    const prev = merged[merged.length - 1];
    if (prev && prev.speaker === speaker) prev.text = `${prev.text} ${o.text}`;
    else merged.push({ speaker, text: o.text });
  }
  return merged;
}

/** Zapowiedź bajki czytana przez narratora. */
export function storyAnnouncement(title: string, word: string): string {
  return `${title}. Bajka o słowie: ${word}.`;
}
