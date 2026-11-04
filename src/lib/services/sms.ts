/**
 * Wysyłka SMS przez SMSAPI.pl (bramka z polskimi numerami nadawcy).
 * Token i nazwa nadawcy: Admin → Ustawienia i klucze API (albo zmienne SMSAPI_TOKEN, SMS_SENDER).
 * Bez tokenu SMS nie jest wysyłany — logowanie działa w trybie testowym (kod pokazywany na ekranie).
 */
import { config } from "@/lib/config";
import { ensureRuntimeSettings } from "@/lib/settings/runtime";

export class SmsError extends Error {}

export async function hasSmsGateway(): Promise<boolean> {
  await ensureRuntimeSettings();
  return Boolean(config.sms.smsapiToken);
}

export async function sendSms(to: string, message: string): Promise<{ provider: "smsapi" }> {
  await ensureRuntimeSettings();
  const token = config.sms.smsapiToken;
  if (!token) throw new SmsError("Bramka SMS nie jest skonfigurowana.");
  const body = new URLSearchParams({ to: to.replace(/^\+/, ""), message, format: "json", encoding: "utf-8" });
  if (config.sms.sender) body.set("from", config.sms.sender);
  const res = await fetch("https://api.smsapi.pl/sms.do", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(10_000),
  });
  const j = (await res.json().catch(() => ({}))) as { error?: number; message?: string };
  if (!res.ok || j.error) throw new SmsError(`SMSAPI ${res.status}${j.error ? ` (kod ${j.error})` : ""}: ${j.message ?? "nie udało się wysłać SMS"}`);
  return { provider: "smsapi" };
}
