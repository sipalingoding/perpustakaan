import { Alert } from "@/components/icons";
import { AUTH_PROBLEMS } from "@/lib/auth-problems";
import { getAuthState } from "@/lib/server/session";

/** Pita di bawah header bila sesi bermasalah, supaya anggota tahu kenapa ia tampil sebagai tamu. */
export async function AuthProblemBar() {
  const { problem } = await getAuthState();
  if (!problem) return null;
  return (
    <div role="alert" className="mt-2 rounded-[20px] border border-accent-200 bg-accent-100 shadow-[0_18px_40px_-26px_rgba(29,43,40,.55)]">
      <p className="m-0 flex items-start gap-2.5 px-5 py-3 text-sm leading-snug font-semibold text-accent-700">
        <Alert size={20} className="mt-px shrink-0" />
        {AUTH_PROBLEMS[problem]}
      </p>
    </div>
  );
}
