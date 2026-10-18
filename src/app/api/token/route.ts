import { readJsonBody, signInForTokens, tokenResponse } from "@/lib/server/bearer";
import { clearLoginFailures, clientIp, LOGIN_BLOCKED, loginBlocked, recordLoginFailure } from "@/lib/server/login-throttle";
import { emailForMemberNo, parseMemberNo } from "@/lib/server/member-no";

/**
 * Masuk untuk API: `{ "email": "...", "password": "..." }` atau `{ "memberNo": "LMB-2610-0007", "password": "..." }`.
 * Menjawab `access_token` (JWT, kirim sebagai `Authorization: Bearer <token>`) dan `refresh_token`.
 */
export async function POST(request: Request) {
  const body = await readJsonBody(request);
  const password = typeof body.password === "string" ? body.password : "";
  if (!password) return Response.json({ error: "Isi kata sandimu." }, { status: 400 });

  let email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email && typeof body.memberNo === "string") {
    const parsed = parseMemberNo(body.memberNo);
    if (!parsed) {
      return Response.json({ error: "Tulis nomor anggota seperti di kartumu, mis. LMB-2610-0007." }, { status: 400 });
    }
    // Nomor yang tidak ada mendapat pesan yang sama dengan kata sandi salah, supaya tidak bisa ditebak.
    email = (await emailForMemberNo(parsed)) ?? "";
    if (!email) {
      const keys = { ip: clientIp(request.headers), account: `nomor:${parsed.no}` };
      if (await loginBlocked(keys)) return Response.json({ error: LOGIN_BLOCKED }, { status: 429 });
      await recordLoginFailure(keys);
      return Response.json({ error: "Nomor anggota atau kata sandi belum cocok. Periksa lagi, ya." }, { status: 401 });
    }
  }
  if (!email) return Response.json({ error: "Isi email atau nomor anggotamu." }, { status: 400 });

  const keys = { ip: clientIp(request.headers), account: email };
  if (await loginBlocked(keys)) return Response.json({ error: LOGIN_BLOCKED }, { status: 429 });
  const result = await signInForTokens(email, password, new URL(request.url).origin);
  if (result.ok) await clearLoginFailures(email);
  else if (result.status === 401) await recordLoginFailure(keys);
  return tokenResponse(result);
}
