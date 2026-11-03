import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const isProd = process.env.APP_ENV === "production" || SITE.url === "https://elofik.com";
  return {
    rules: isProd
      ? [{ userAgent: "*", allow: "/", disallow: ["/app", "/konto", "/admin", "/api", "/prezent/", "/aktywuj-prezent/", "/onboarding"] }]
      : [{ userAgent: "*", disallow: "/" }],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
