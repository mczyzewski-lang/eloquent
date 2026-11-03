/**
 * Krótkie sesje rozpoznawania mowy dla rytuału „Hej Elofik!”.
 * - jednorazowy token Scribe generowany na serwerze (klucz główny nie opuszcza backendu),
 * - limity: czas sesji, liczba prób na bajkę, liczba sesji dziennie,
 * - nie zapisujemy nagrań ani transkrypcji — tylko wynik i pewność dopasowania.
 */
import { config, hasElevenLabs } from "@/lib/config";
import { getDb, nowIso, type VoiceGreetingSessionRow } from "@/lib/db";
import { estimateSttUsd } from "@/lib/domain/budget";
import { scribeKeyterms, type Locale } from "@/lib/domain/command-matcher";
import { assertBudget, recordCost } from "./costs";
import { rateLimit } from "./rate-limit";
import { ensureRuntimeSettings } from "@/lib/settings/runtime";

export class VoiceLimitError extends Error {
  constructor(public code: "daily_limit" | "attempts_limit" | "budget") {
    super(code);
  }
}

export interface VoiceSessionStart {
  sessionId: string;
  mode: "scribe" | "simulated";
  token: string | null;
  modelId: string;
  languageCode: string;
  keyterms: string[];
  maxSeconds: number;
  attempt: number;
}

async function fetchScribeToken(): Promise<string> {
  const res = await fetch("https://api.elevenlabs.io/v1/single-use-token/realtime_scribe", {
    method: "POST",
    headers: { "xi-api-key": config.elevenlabs.apiKey },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Scribe token ${res.status}`);
  const json = (await res.json()) as { token?: string };
  if (!json.token) throw new Error("Brak tokenu Scribe");
  return json.token;
}

export async function startVoiceSession(familyId: string, storyId: string, locale: Locale): Promise<VoiceSessionStart> {
  await ensureRuntimeSettings();
  const db = getDb();
  const daily = await rateLimit("voice-daily", familyId, config.voice.maxSessionsPerFamilyPerDay, 86_400);
  if (!daily.ok) throw new VoiceLimitError("daily_limit");
  const since = new Date(Date.now() - 6 * 3600_000).toISOString();
  const attempts = await db.count("voice_greeting_sessions", { family_id: familyId, story_id: storyId, started_at: { gte: since }, outcome: { neq: "skipped" } });
  if (attempts >= config.voice.maxAttemptsPerStory) throw new VoiceLimitError("attempts_limit");

  const simulated = !hasElevenLabs();
  if (!simulated) {
    try {
      await assertBudget("voice_greeting", estimateSttUsd(config.voice.sessionMaxSeconds, config.elevenlabs.sttUsdPerMinute));
    } catch {
      throw new VoiceLimitError("budget");
    }
  }
  const token = simulated ? null : await fetchScribeToken();
  const session = await db.insert("voice_greeting_sessions", {
    family_id: familyId,
    story_id: storyId,
    started_at: nowIso(),
    ended_at: null,
    duration_ms: null,
    outcome: "pending",
    attempt: attempts + 1,
    match_confidence: null,
  });
  return {
    sessionId: session.id,
    mode: simulated ? "simulated" : "scribe",
    token,
    modelId: config.elevenlabs.sttModel,
    languageCode: locale,
    keyterms: scribeKeyterms(locale),
    maxSeconds: config.voice.sessionMaxSeconds,
    attempt: attempts + 1,
  };
}

export async function finishVoiceSession(familyId: string, sessionId: string, outcome: Exclude<VoiceGreetingSessionRow["outcome"], "pending">, durationMs: number, confidence: number | null) {
  await ensureRuntimeSettings();
  const db = getDb();
  const session = await db.findOne("voice_greeting_sessions", { id: sessionId, family_id: familyId });
  if (!session || session.outcome !== "pending") return null;
  // czas połączenia liczymy po stronie serwera (od startu) z limitem — klient może zaniżać, nie zawyżać
  const serverMs = Date.now() - new Date(session.started_at).getTime();
  const billedMs = Math.min(Math.max(durationMs, 0) || serverMs, serverMs, (config.voice.sessionMaxSeconds + 2) * 1000);
  const [updated] = await db.update("voice_greeting_sessions", { id: sessionId }, { outcome, ended_at: nowIso(), duration_ms: billedMs, match_confidence: confidence });
  if (outcome !== "skipped") {
    await recordCost({
      provider: "elevenlabs_stt",
      purpose: "voice_greeting",
      usd: hasElevenLabs() ? estimateSttUsd(billedMs / 1000, config.elevenlabs.sttUsdPerMinute) : 0,
      units: billedMs / 1000,
      familyId,
      storyId: session.story_id,
    });
  }
  return updated;
}

/** Pominięcie rytuału przez rodzica (brak mikrofonu / trudności mowy) — też liczy się jako spotkanie. */
export async function recordSkip(familyId: string, storyId: string) {
  return getDb().insert("voice_greeting_sessions", {
    family_id: familyId,
    story_id: storyId,
    started_at: nowIso(),
    ended_at: nowIso(),
    duration_ms: 0,
    outcome: "skipped",
    attempt: 0,
    match_confidence: null,
  });
}
