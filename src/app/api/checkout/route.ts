import { error, handleError, json, sameOrigin } from "@/lib/api";
import { apiFamily } from "@/lib/auth/guards";
import { AlreadySubscribedError, createPortalUrl, startSubscriptionCheckout } from "@/lib/services/billing";

export async function POST(req: Request) {
  try {
    if (!sameOrigin(req)) return error("Niedozwolone źródło żądania", 403);
    const session = await apiFamily();
    if (!session) return error("Zaloguj się i utwórz profil dziecka", 401);
    const res = await startSubscriptionCheckout(session.bundle.family, session.user.email);
    return json(res);
  } catch (e) {
    if (e instanceof AlreadySubscribedError) {
      const s = await apiFamily();
      const portal = s ? await createPortalUrl(s.bundle.family).catch(() => null) : null;
      return error("Masz już aktywny abonament.", 409, { portal: portal ?? "/konto" });
    }
    return handleError(e);
  }
}
