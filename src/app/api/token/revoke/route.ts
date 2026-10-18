import { readJsonBody, revokeRefreshToken } from "@/lib/server/bearer";

/** Keluar: `{ "refreshToken": "..." }`. Access token yang sudah terbit tetap berlaku sampai kedaluwarsa (15 menit). */
export async function POST(request: Request) {
  const { refreshToken } = await readJsonBody(request);
  if (typeof refreshToken !== "string" || !refreshToken) {
    return Response.json({ error: "Kirim refreshToken yang ingin dicabut." }, { status: 400 });
  }
  if (!(await revokeRefreshToken(refreshToken, new URL(request.url).origin))) {
    return Response.json({ error: "Gagal keluar. Coba lagi sebentar lagi." }, { status: 503 });
  }
  return new Response(null, { status: 204 });
}
