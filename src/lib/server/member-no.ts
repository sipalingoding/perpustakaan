import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles, user } from "@/db/schema";
import { formatMemberNo } from "@/lib/member";

export type MemberNo = { yymm: string; no: number };

/** "lmb 2610 0007", "LMB-2610-0007", atau "LMB26100007" -> { yymm: "2610", no: 7 } */
export function parseMemberNo(input: string): MemberNo | null {
  const m = input
    .toUpperCase()
    .replace(/[\s.]/g, "")
    .match(/^LMB-?(\d{4})-?(\d{1,6})$/);
  return m ? { yymm: m[1], no: Number(m[2]) } : null;
}

/** Email akun pemilik nomor kartu, atau null bila nomor itu tidak ada (termasuk bulan bergabung yang tidak cocok). */
export async function emailForMemberNo({ yymm, no }: MemberNo): Promise<string | null> {
  const [member] = await db
    .select({ email: user.email, createdAt: user.createdAt })
    .from(profiles)
    .innerJoin(user, eq(user.id, profiles.userId))
    .where(eq(profiles.memberNo, no));
  if (!member || formatMemberNo(member.createdAt, no) !== `LMB-${yymm}-${String(no).padStart(4, "0")}`) return null;
  return member.email;
}
