import { error } from "@/lib/api";
import { apiFamily } from "@/lib/auth/guards";
import { exportFamilyData } from "@/lib/services/families";

export async function GET() {
  const session = await apiFamily();
  if (!session) return error("Zaloguj się", 401);
  const data = await exportFamilyData(session.bundle.family.id);
  return new Response(JSON.stringify({ user: { email: session.user.email }, ...data }, null, 2), {
    headers: { "content-type": "application/json", "content-disposition": `attachment; filename="elofik-dane-${new Date().toISOString().slice(0, 10)}.json"`, "cache-control": "no-store" },
  });
}
