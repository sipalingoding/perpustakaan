import "server-only";
import { isInSchedule, visitSchedule, type VisitSchedule } from "@/lib/server/slots";

export type DonationSchedule = VisitSchedule;

/** Antar/jemput sumbangan: hari ini sampai 5 hari ke depan. */
export const donationSchedule = () => visitSchedule(5);

/** Apakah tanggal dan jam ini masih boleh dipilih. Dipakai server saat menyimpan sumbangan. */
export async function isOpenSlot(dateIso: string, hour: number) {
  return isInSchedule(await donationSchedule(), dateIso, hour);
}
