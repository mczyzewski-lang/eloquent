import { unstable_cache } from "next/cache";
import { landingArtUncached, mascotMapUncached } from "./illustrations";

/** Zatwierdzone pozy maskotki (cache 5 min, odświeżane tagiem „mascots” po akceptacji w panelu). */
export const getMascotMap = unstable_cache(async () => mascotMapUncached().catch(() => ({}) as Record<string, string>), ["elofik-mascots-v1"], { tags: ["mascots"], revalidate: 300 });

/** Zatwierdzone grafiki strony głównej (tag „landing”). */
export const getLandingArt = unstable_cache(async () => landingArtUncached().catch(() => ({}) as Record<string, string>), ["elofik-landing-art-v1"], { tags: ["landing"], revalidate: 300 });
