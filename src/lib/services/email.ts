/** Wysyłka e-maili transakcyjnych (Resend). Bez klucza — log w konsoli (dev/demo). */
import { config } from "@/lib/config";

export async function sendEmail(to: string, subject: string, text: string) {
  if (!config.email.resendApiKey) {
    console.info(`[email:dev] → ${to} | ${subject}\n${text}`);
    return { simulated: true };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${config.email.resendApiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ from: config.email.from, to, subject, text }),
  });
  if (!res.ok) console.error("[email] send failed", res.status, await res.text());
  return { simulated: false };
}
