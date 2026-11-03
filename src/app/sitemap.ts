import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return ["/", "/dla-dziadkow", "/subskrypcja", "/polityka-prywatnosci", "/regulamin"].map((p) => ({
    url: `${SITE.url}${p === "/" ? "" : p}`,
    lastModified: now,
    changeFrequency: p === "/" ? "weekly" : "monthly",
    priority: p === "/" ? 1 : 0.7,
  }));
}
