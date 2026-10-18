import { requireBearer } from "@/lib/server/bearer";
import { getMyActiveLoans } from "@/lib/server/loans";

/** Pinjaman aktif pemilik token, yang paling dekat jatuh tempo lebih dulu. */
export async function GET(request: Request) {
  const auth = await requireBearer(request);
  if (!auth.ok) return auth.response;
  return Response.json(await getMyActiveLoans(auth.viewer.id), { headers: { "Cache-Control": "private, no-store" } });
}
