/**
 * Dwa głosy w bajce: NARRATOR (zapowiada bajkę, czyta narrację) i ELOFIK (mówi kwestie w dialogach).
 * Podział według polskiego zapisu dialogów z pauzą (—):
 *   „Tego ranka Elofik usłyszał… — Dzień dobry, Leonku! — zawołał radośnie. — Jak dobrze, że jesteś.”
 *   → narrator: „Tego ranka Elofik usłyszał…”, elofik: „Dzień dobry, Leonku!”, narrator: „zawołał radośnie.”, elofik: „Jak dobrze…”
 * Gdy kwestia kończy się bez pauzy, a kolejne zdanie zaczyna narrację („Elofik zastrzygł uszami.”), wracamy do narratora.
 * Redakcja może wymusić głos znacznikami [narrator] / [elofik] na początku fragmentu.
 */
export type Speaker = "narrator" | "elofik";

export interface NarrationPart {
  speaker: Speaker;
  text: string;
}

/** Zdanie, które po kwestii oznacza powrót do narracji (3. osoba / didaskalia). */
const NARRATIVE_START = /^(Elofik(?![a-ząćęłńóśźż])|Nagle|Wtedy|Potem|Po chwili|Wreszcie|Tymczasem|I wtedy|Ślady|Strumyk|Wiewiórka|Jeżyk|Sowa)\b/;

function sentences(text: string): string[] {
  return text.match(/[^.!?…]+(?:[.!?…]+["”»]?|$)\s*/g)?.map((s) => s.trim()).filter(Boolean) ?? [text.trim()];
}

function push(parts: NarrationPart[], speaker: Speaker, text: string) {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t || !/[\p{L}\d]/u.test(t)) return;
  const last = parts[parts.length - 1];
  if (last && last.speaker === speaker) last.text = `${last.text} ${t}`;
  else parts.push({ speaker, text: t });
}

export function splitNarration(text: string, defaultSpeaker: Speaker = "narrator"): NarrationPart[] {
  const parts: NarrationPart[] = [];
  // jawne znaczniki redakcji
  if (/\[(narrator|elofik)\]/i.test(text)) {
    let speaker: Speaker = defaultSpeaker;
    for (const chunk of text.split(/(\[(?:narrator|elofik)\])/i)) {
      const tag = /^\[(narrator|elofik)\]$/i.exec(chunk);
      if (tag) speaker = tag[1].toLowerCase() as Speaker;
      else push(parts, speaker, chunk);
    }
    return parts;
  }
  if (!text.includes("—")) {
    push(parts, defaultSpeaker, text);
    return parts;
  }
  const chunks = text.split("—");
  let speaker: Speaker = text.trim().startsWith("—") ? "elofik" : "narrator";
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (i > 0) speaker = parts.length && parts[parts.length - 1].speaker === "elofik" ? "narrator" : "elofik";
    if (!chunk.trim()) continue;
    if (speaker === "narrator") {
      push(parts, "narrator", chunk);
      continue;
    }
    // kwestia: kończy się, gdy zdanie zaczyna się jak narracja
    let inSpeech = true;
    for (const s of sentences(chunk)) {
      if (inSpeech && parts.length && NARRATIVE_START.test(s) && parts[parts.length - 1].speaker === "elofik") inSpeech = false;
      push(parts, inSpeech ? "elofik" : "narrator", s);
    }
  }
  return parts;
}

/** Zapowiedź bajki czytana przez narratora. */
export function storyAnnouncement(title: string, word: string): string {
  return `${title}. Bajka o słowie: ${word}.`;
}
