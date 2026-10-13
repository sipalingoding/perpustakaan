import type { NextRequest } from "next/server";
import { auth } from "@/lib/server/auth";

const neonAuth = auth.middleware({ loginUrl: "/masuk" });

/**
 * Halaman khusus anggota. Middleware Neon Auth memeriksa sesi dan memperbarui cookie-nya; tamu dialihkan ke
 * /masuk dengan ?lanjut= supaya kembali ke halaman ini setelah masuk. Halaman tetap memeriksa lewat requireViewer().
 */
export async function proxy(request: NextRequest) {
  const response = await neonAuth(request);
  const location = response.headers.get("location");
  if (location && response.status >= 300 && response.status < 400 && new URL(location, request.url).pathname === "/masuk") {
    const to = new URL("/masuk", request.url);
    to.searchParams.set("lanjut", request.nextUrl.pathname + request.nextUrl.search);
    response.headers.set("location", to.toString());
  }
  return response;
}

export const config = {
  matcher: ["/jadwal/:path*", "/profil/:path*", "/sumbang/:path*", "/anggota/:path*", "/admin/:path*"],
};
