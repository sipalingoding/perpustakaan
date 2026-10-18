import { getAdminLoans } from "@/lib/server/admin-loans";
import { requireBearer } from "@/lib/server/bearer";

/** Semua booking dan pinjaman yang sedang berjalan. Khusus pustakawan. */
export async function GET(request: Request) {
  const auth = await requireBearer(request, { role: "pustakawan" });
  if (!auth.ok) return auth.response;
  return Response.json(await getAdminLoans(), { headers: { "Cache-Control": "private, no-store" } });
}
