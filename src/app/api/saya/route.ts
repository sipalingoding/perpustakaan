import { requireBearer } from "@/lib/server/bearer";

/** Akun pemilik token. */
export async function GET(request: Request) {
  const auth = await requireBearer(request);
  if (!auth.ok) return auth.response;
  return Response.json(auth.viewer, { headers: { "Cache-Control": "private, no-store" } });
}
