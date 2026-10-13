import { Alert } from "@/components/icons";
import { ui } from "@/components/ui";
import { AUTH_PROBLEMS } from "@/lib/auth-problems";
import { cn } from "@/lib/cn";
import { getAuthState } from "@/lib/server/session";

/** Pita di bawah header bila sesi bermasalah, supaya anggota tahu kenapa ia tampil sebagai tamu. */
export async function AuthProblemBar() {
  const { problem } = await getAuthState();
  if (!problem) return null;
  return (
    <div role="alert" className="border-t border-accent-200 bg-accent-100">
      <p className={cn(ui.wrap, "m-0 flex items-start gap-2.5 py-3 text-sm leading-snug font-semibold text-accent-700")}>
        <Alert size={20} className="mt-px shrink-0" />
        {AUTH_PROBLEMS[problem]}
      </p>
    </div>
  );
}
