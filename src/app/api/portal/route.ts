import { error, handleError, json, sameOrigin } from "@/lib/api";
import { apiFamily } from "@/lib/auth/guards";
import { createPortalUrl } from "@/lib/services/billing";

export async function POST(req: Request) {
  try {
    if (!sameOrigin(req)) return error("Niedozwolone źródło żądania", 403);
    const session = await apiFamily();
    if (!session) return error("Zaloguj się", 401);
    const url = await createPortalUrl(session.bundle.family);
    if (!url) return error("Brak abonamentu Stripe do zarządzania", 404);
    return json({ url });
  } catch (e) {
    return handleError(e);
  }
}
