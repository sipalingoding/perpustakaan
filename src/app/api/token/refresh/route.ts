import { readJsonBody, refreshTokens, tokenResponse } from "@/lib/server/bearer";

/** JWT baru tanpa kata sandi: `{ "refreshToken": "..." }`. */
export async function POST(request: Request) {
  const { refreshToken } = await readJsonBody(request);
  if (typeof refreshToken !== "string" || !refreshToken) {
    return Response.json({ error: "Kirim refreshToken dari jawaban /api/token." }, { status: 400 });
  }
  return tokenResponse(await refreshTokens(refreshToken, new URL(request.url).origin));
}
