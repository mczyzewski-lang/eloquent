import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  // Mikrofon tylko dla własnej domeny — rytuał „Hej Elofik!”.
  { key: "Permissions-Policy", value: "microphone=(self), camera=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["stripe"],
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  async redirects() {
    // www.elofik.com → elofik.com (kanoniczny host). Działa tylko gdy żądanie trafi na host www.
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.elofik.com" }],
        destination: "https://elofik.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
