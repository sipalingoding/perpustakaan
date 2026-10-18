import "server-only";
import { createRemoteJWKSet, errors, jwtVerify, type JWTPayload } from "jose";
import { memberFor, roleOf, type Viewer } from "@/lib/server/session";

/**
 * Login JWT untuk API (`/api/...`): klien menyimpan token dan mengirimnya di header `Authorization: Bearer <token>`.
 *
 * JWT-nya diterbitkan Neon Auth (EdDSA, berlaku 15 menit) dan diverifikasi dengan JWKS-nya, jadi tidak ada rahasia
 * JWT tambahan. Refresh token adalah token sesi Neon Auth: dengan itu klien meminta JWT baru tanpa kata sandi, dan
 * mencabutnya (keluar) membuat refresh token tidak berlaku lagi. JWT yang sudah terbit tetap berlaku sampai habis.
 */

const SESSION_COOKIE = "__Secure-neon-auth.session_token";

const authUrl = () => process.env.NEON_AUTH_BASE_URL!;

let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;
const getJwks = () =>
  (jwks ??= createRemoteJWKSet(new URL(process.env.NEON_AUTH_JWKS_URL ?? `${authUrl()}/.well-known/jwks.json`)));

export type TokenPair = { accessToken: string; refreshToken: string; expiresIn: number };

export type TokenResult = { ok: true; tokens: TokenPair } | { ok: false; status: number; error: string };

const UNREACHABLE: TokenResult = {
  ok: false,
  status: 503,
  error: "Layanan masuk sedang tidak bisa dihubungi. Coba lagi sebentar lagi.",
};

/** JWT baru dari token sesi Neon Auth, atau null bila sesinya sudah tidak berlaku. */
async function mintJwt(sessionToken: string, origin: string): Promise<{ token: string; expiresIn: number } | null> {
  const res = await fetch(`${authUrl()}/token`, {
    headers: { Cookie: `${SESSION_COOKIE}=${sessionToken}`, Origin: origin },
    cache: "no-store",
  });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`Neon Auth /token ${res.status}`);
  const { token } = (await res.json()) as { token: string };
  const [, payload] = token.split(".");
  const { exp } = JSON.parse(Buffer.from(payload, "base64url").toString()) as JWTPayload;
  return { token, expiresIn: Math.max(0, (exp ?? 0) - Math.floor(Date.now() / 1000)) };
}

/**
 * Masuk dengan email dan kata sandi. `origin` adalah asal permintaan klien; Neon Auth hanya menerima domain yang
 * terdaftar (localhost diizinkan bawaan).
 */
export async function signInForTokens(email: string, password: string, origin: string): Promise<TokenResult> {
  try {
    const res = await fetch(`${authUrl()}/sign-in/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: origin },
      body: JSON.stringify({ email, password, rememberMe: true }),
      cache: "no-store",
    });
    if (res.status === 429) {
      return { ok: false, status: 429, error: "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi." };
    }
    if (res.status === 401 || res.status === 400) {
      return { ok: false, status: 401, error: "Email atau kata sandi belum cocok. Periksa lagi, ya." };
    }
    if (res.status === 403) {
      return { ok: false, status: 403, error: "Email akun ini belum diverifikasi. Cek kotak masuk emailmu." };
    }
    if (!res.ok) throw new Error(`Neon Auth /sign-in/email ${res.status}`);

    const cookie = res.headers.getSetCookie().find((c) => c.startsWith(`${SESSION_COOKIE}=`));
    const sessionToken = cookie?.split(";")[0].slice(SESSION_COOKIE.length + 1);
    if (!sessionToken) throw new Error("Neon Auth tidak mengirim token sesi.");
    const jwt = await mintJwt(sessionToken, origin);
    if (!jwt) throw new Error("Sesi baru langsung ditolak Neon Auth.");
    return { ok: true, tokens: { accessToken: jwt.token, refreshToken: sessionToken, expiresIn: jwt.expiresIn } };
  } catch (e) {
    console.warn("[token] Neon Auth tidak bisa dihubungi:", e instanceof Error ? e.message : e);
    return UNREACHABLE;
  }
}

/** JWT baru dari refresh token. */
export async function refreshTokens(refreshToken: string, origin: string): Promise<TokenResult> {
  try {
    const jwt = await mintJwt(refreshToken, origin);
    if (!jwt) return { ok: false, status: 401, error: "Sesi sudah berakhir. Masuk lagi, ya." };
    return { ok: true, tokens: { accessToken: jwt.token, refreshToken, expiresIn: jwt.expiresIn } };
  } catch (e) {
    console.warn("[token] Neon Auth tidak bisa dihubungi:", e instanceof Error ? e.message : e);
    return UNREACHABLE;
  }
}

/** Keluar: refresh token tidak bisa dipakai lagi. */
export async function revokeRefreshToken(refreshToken: string, origin: string): Promise<boolean> {
  try {
    const res = await fetch(`${authUrl()}/sign-out`, {
      method: "POST",
      headers: { Cookie: `${SESSION_COOKIE}=${refreshToken}`, Origin: origin, "Content-Type": "application/json" },
      body: "{}",
      cache: "no-store",
    });
    return res.ok;
  } catch (e) {
    console.warn("[token] Neon Auth tidak bisa dihubungi:", e instanceof Error ? e.message : e);
    return false;
  }
}

export type BearerViewer = Viewer & { role: "anggota" | "pustakawan" };

type BearerResult = { ok: true; viewer: BearerViewer } | { ok: false; response: Response };

const forbidden = (error: string) => ({ ok: false as const, response: Response.json({ error }, { status: 403 }) });

/**
 * Untuk Route Handler yang khusus anggota: baca `Authorization: Bearer <JWT>`. Tanpa token, token rusak, atau token
 * kedaluwarsa dijawab 403. Dengan `role: "pustakawan"`, anggota biasa juga mendapat 403.
 *
 * ```ts
 * const auth = await requireBearer(request);
 * if (!auth.ok) return auth.response;
 * ```
 */
export async function requireBearer(request: Request, options?: { role?: "pustakawan" }): Promise<BearerResult> {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(\S+)$/i);
  if (!match) return forbidden("Butuh token masuk. Kirim header Authorization: Bearer <token>.");

  let payload: JWTPayload & Record<string, unknown>;
  try {
    const issuer = new URL(authUrl()).origin;
    ({ payload } = await jwtVerify(match[1], getJwks(), { issuer, audience: issuer, algorithms: ["EdDSA"] }));
  } catch (e) {
    if (e instanceof errors.JWTExpired) return forbidden("Token sudah kedaluwarsa. Minta token baru lewat /api/token/refresh.");
    if (e instanceof errors.JOSEError) return forbidden("Token tidak sah.");
    console.warn("[token] JWKS Neon Auth tidak bisa dibaca:", e instanceof Error ? e.message : e);
    return {
      ok: false,
      response: Response.json({ error: "Layanan masuk sedang tidak bisa dihubungi. Coba lagi sebentar lagi." }, { status: 503 }),
    };
  }

  const { viewer } = await memberFor({
    id: String(payload.sub ?? payload.id),
    name: String(payload.name ?? ""),
    email: String(payload.email ?? ""),
    emailVerified: Boolean(payload.emailVerified),
    createdAt: String(payload.createdAt ?? new Date().toISOString()),
  });
  // Akun yang sudah dihapus atau bentrok dengan data anggota lain.
  if (!viewer) return forbidden("Akun untuk token ini tidak ditemukan.");

  const role = await roleOf(viewer.id);
  if (options?.role === "pustakawan" && role !== "pustakawan") return forbidden("Hanya pustakawan yang boleh membuka ini.");
  return { ok: true, viewer: { ...viewer, role } };
}

/** Badan JSON permintaan sebagai objek; kosong bila bukan JSON. */
export async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await request.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Bentuk jawaban token, mengikuti OAuth 2.0 supaya mudah dipakai klien HTTP mana pun. */
export function tokenResponse(result: TokenResult): Response {
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  const { accessToken, refreshToken, expiresIn } = result.tokens;
  return Response.json(
    { token_type: "Bearer", access_token: accessToken, expires_in: expiresIn, refresh_token: refreshToken },
    { headers: { "Cache-Control": "no-store" } },
  );
}
