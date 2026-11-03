import { absoluteUrl } from "@/lib/config";
import { getDb } from "@/lib/db";
import { localParts } from "@/lib/domain/unlock";
import { getFamilyLibrary } from "./access";
import { sendEmail } from "./email";

/** Łagodne przypomnienie: „Nowa bajka Elofika już czeka! Dziś poznajemy słowo: …”. Tylko za zgodą rodzica. */
export async function sendDailyEmails(now = new Date()) {
  const db = getDb();
  const prefs = await db.find("notification_preferences", { email_daily: true });
  let sent = 0;
  for (const p of prefs) {
    const family = await db.findOne("families", { id: p.family_id });
    if (!family) continue;
    if (localParts(now, family.timezone).hour !== p.send_hour) continue;
    const user = await db.findOne("users", { id: family.owner_user_id });
    const lib = await getFamilyLibrary(family, now);
    if (!user || !lib.today) continue;
    await sendEmail(
      user.email,
      "Nowa bajka Elofika już czeka!",
      `Nowa bajka Elofika już czeka! Dziś poznajemy słowo: ${lib.today.wordOfDay}.\n\n„${lib.today.title}” — ${absoluteUrl("/app")}\n\nWyłącz przypomnienia: ${absoluteUrl("/konto#powiadomienia")}`,
    );
    sent++;
  }
  return sent;
}
