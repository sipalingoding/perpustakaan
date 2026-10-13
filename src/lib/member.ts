import { BULAN } from "@/lib/dates";

/** Format kartu: LMB-YYMM-NNNN, dengan YYMM dari bulan bergabung. */
export function formatMemberNo(joined: Date, no: number) {
  const yy = String(joined.getUTCFullYear()).slice(2);
  const mm = String(joined.getUTCMonth() + 1).padStart(2, "0");
  return `LMB-${yy}${mm}-${String(no).padStart(4, "0")}`;
}

/** "Maret 2024" */
export function monthYear(date: Date) {
  return `${BULAN[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/** Kartu berlaku 12 bulan sejak bergabung. */
export function cardValidUntil(joined: Date) {
  return new Date(Date.UTC(joined.getUTCFullYear() + 1, joined.getUTCMonth(), 1));
}
