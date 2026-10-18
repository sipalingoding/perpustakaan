import type { NextConfig } from "next";

/**
 * Header keamanan untuk semua respons. `frame-ancestors 'none'` dan X-Frame-Options mencegah situs lain membingkai
 * halaman (clickjacking pada aksi anggota); nosniff mencegah tebak-menebak tipe berkas; HSTS memaksa HTTPS di
 * produksi (tidak berpengaruh di localhost). CSP sengaja hanya mengatur frame-ancestors supaya tidak memutus skrip
 * bawaan Next.
 */
const securityHeaders = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
];

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
