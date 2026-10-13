import "server-only";
import { countDonationsToReview } from "@/lib/server/admin-donations";
import { countPickupsWaiting } from "@/lib/server/admin-loans";

/** Angka di tab admin. */
export async function getAdminCounts() {
  const [peminjaman, sumbangan] = await Promise.all([countPickupsWaiting(), countDonationsToReview()]);
  return { peminjaman, sumbangan };
}
