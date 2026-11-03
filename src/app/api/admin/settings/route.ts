import { z } from "zod";
import { error, handleError, json, readJson, sameOrigin } from "@/lib/api";
import { getSessionUser } from "@/lib/auth/session";
import { auditLog } from "@/lib/auth/guards";
import { config } from "@/lib/config";
import { describeSettings, ensureRuntimeSettings, saveSetting, SETTINGS, validateSetting } from "@/lib/settings/runtime";
import { clientIp, rateLimit } from "@/lib/services/rate-limit";

const keyEnum = z.enum(SETTINGS.map((s) => s.key) as [string, ...string[]]);

const body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("save"), values: z.partialRecord(keyEnum, z.string().max(300)) }),
  z.object({ action: z.literal("test"), provider: z.enum(["elevenlabs", "openai"]) }),
]);

async function admin() {
  const user = await getSessionUser();
  return user?.isAdmin ? user : null;
}

/** Widok ustawień — sekrety wyłącznie zamaskowane. */
export async function GET() {
  if (!(await admin())) return error("Brak uprawnień", 403);
  return json({ settings: await describeSettings() }, { headers: { "cache-control": "no-store" } });
}

async function testElevenLabs() {
  const key = config.elevenlabs.apiKey;
  if (!key) return { ok: false, message: "Brak klucza ElevenLabs." };
  const user = await fetch("https://api.elevenlabs.io/v1/user", { headers: { "xi-api-key": key }, signal: AbortSignal.timeout(8000) });
  if (!user.ok) return { ok: false, message: `ElevenLabs odrzucił klucz (HTTP ${user.status}).` };
  const info = (await user.json()) as { subscription?: { tier?: string; character_count?: number; character_limit?: number } };
  const sub = info.subscription;
  let voice = "Brak Voice ID — TTS nie ruszy, dopóki go nie podasz.";
  if (config.elevenlabs.voiceId) {
    const v = await fetch(`https://api.elevenlabs.io/v1/voices/${encodeURIComponent(config.elevenlabs.voiceId)}`, { headers: { "xi-api-key": key }, signal: AbortSignal.timeout(8000) });
    voice = v.ok ? `Głos: ${((await v.json()) as { name?: string }).name ?? "OK"}` : `Nie znaleziono głosu o tym Voice ID (HTTP ${v.status}).`;
  }
  return { ok: true, message: `Klucz działa${sub?.tier ? ` · plan ${sub.tier}` : ""}${sub?.character_limit ? ` · znaki: ${sub.character_count ?? 0}/${sub.character_limit}` : ""}. ${voice}` };
}

async function testOpenAI() {
  const key = config.openai.apiKey;
  if (!key) return { ok: false, message: "Brak klucza OpenAI." };
  const res = await fetch("https://api.openai.com/v1/models", { headers: { authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(8000) });
  if (!res.ok) return { ok: false, message: `OpenAI odrzucił klucz (HTTP ${res.status}).` };
  const ids = ((await res.json()) as { data?: { id: string }[] }).data?.map((m) => m.id) ?? [];
  const missing = [config.openai.textModel, config.openai.imageModel].filter((m) => !ids.includes(m));
  return { ok: true, message: `Klucz działa · dostępnych modeli: ${ids.length}.${missing.length ? ` Uwaga: brak dostępu do: ${missing.join(", ")}.` : ""}` };
}

export async function POST(req: Request) {
  try {
    if (!sameOrigin(req)) return error("Niedozwolone źródło żądania", 403);
    const user = await admin();
    if (!user) return error("Brak uprawnień", 403);
    const rl = await rateLimit("admin-settings", clientIp(req.headers), 30, 600);
    if (!rl.ok) return error("Za dużo prób", 429);
    const b = body.parse(await readJson(req));
    if (b.action === "test") {
      await ensureRuntimeSettings(true);
      const result = b.provider === "elevenlabs" ? await testElevenLabs() : await testOpenAI();
      return json(result);
    }
    const errors: Record<string, string> = {};
    const entries = Object.entries(b.values).filter((e): e is [string, string] => typeof e[1] === "string");
    if (!entries.length) return error("Brak wartości do zapisania", 422);
    for (const [key, value] of entries) {
      const msg = value.trim() ? validateSetting(key as never, value) : null;
      if (msg) errors[key] = msg;
    }
    if (Object.keys(errors).length) return error("Popraw zaznaczone pola", 422, { fields: errors });
    for (const [key, value] of entries) await saveSetting(key as never, value, user.email);
    // w logu audytu tylko nazwy pól — nigdy wartości
    await auditLog(user, "settings.update", entries.map(([k]) => k).join(","), { cleared: entries.filter(([, v]) => !v.trim()).map(([k]) => k) });
    return json({ ok: true, settings: await describeSettings() });
  } catch (e) {
    return handleError(e);
  }
}
