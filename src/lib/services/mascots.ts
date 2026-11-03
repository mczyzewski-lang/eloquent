import { unstable_cache } from "next/cache";
import { mascotMapUncached } from "./illustrations";

/** Zatwierdzone pozy maskotki (cache 5 min, odświeżane tagiem „mascots” po akceptacji w panelu). */
export const getMascotMap = unstable_cache(async () => mascotMapUncached().catch(() => ({}) as Record<string, string>), ["elofik-mascots-v1"], { tags: ["mascots"], revalidate: 300 });
