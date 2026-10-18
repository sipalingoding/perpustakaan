import { auth } from "@/lib/server/auth";
import {
  clearLoginFailures,
  clientIp,
  LOGIN_BLOCKED,
  loginBlocked,
  recordLoginFailure,
} from "@/lib/server/login-throttle";

// Meneruskan permintaan klien auth ke Neon Auth.
const handler = auth.handler();

export const { GET, PUT, DELETE, PATCH } = handler;

type Context = Parameters<typeof handler.POST>[1];

/** Seperti handler Neon Auth, tapi masuk dengan email dan kata sandi dibatasi (lihat login-throttle). */
export async function POST(request: Request, context: Context) {
  const { path } = await context.params;
  if (path.join("/") !== "sign-in/email") return handler.POST(request, context);

  const body = (await request
    .clone()
    .json()
    .catch(() => null)) as { email?: unknown } | null;
  const email =
    typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const keys = { ip: clientIp(request.headers), account: email };
  if (await loginBlocked(keys)) {
    return Response.json(
      { code: "TOO_MANY_ATTEMPTS", message: LOGIN_BLOCKED },
      { status: 429 },
    );
  }

  const response = await handler.POST(request, context);
  if (response.status === 401) await recordLoginFailure(keys);
  else if (response.ok) await clearLoginFailures(email);
  return response;
}
