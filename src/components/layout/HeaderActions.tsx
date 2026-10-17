import Link from "next/link";
import type { NavKey } from "@/components/layout/SiteHeader";
import { IdleSignOut } from "@/components/layout/IdleSignOut";
import { NotificationMenu } from "@/components/layout/NotificationMenu";
import { ProfileMenu } from "@/components/layout/ProfileMenu";
import { ArrowRight } from "@/components/icons";
import { ui } from "@/components/ui";
import { cn } from "@/lib/cn";
import { idleMinutes } from "@/lib/idle";
import { countDueReminders, getProfile, resolveLook } from "@/lib/server/members";
import { countUnread, getNotifications } from "@/lib/server/notifications";
import { getRole, getViewer } from "@/lib/server/session";

/** Sisi kanan header: tamu melihat "Masuk", anggota melihat lonceng notifikasi, profil, dan tombol keluar. */
export async function HeaderActions({ active }: { active?: NavKey }) {
  const viewer = await getViewer();
  if (!viewer) {
    return (
      <Link
        href="/masuk"
        className={cn(
          ui.primary,
          "group inline-flex min-h-11 items-center gap-1.5 rounded-full pr-4 pl-5 text-sm font-semibold no-underline transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600",
        )}
      >
        Masuk
        <ArrowRight size={18} className="transition-transform duration-200 group-hover:translate-x-0.5" />
      </Link>
    );
  }

  const [profile, due, role, items, unread] = await Promise.all([
    getProfile(viewer.id),
    countDueReminders(viewer.id),
    getRole(),
    getNotifications(viewer.id),
    countUnread(viewer.id),
  ]);
  const look = resolveLook(viewer.id, profile ?? { gender: "perempuan", avatarLook: null, usePhoto: false, photoKey: null });

  return (
    <>
      <NotificationMenu items={items} unread={unread} due={due} />
      <ProfileMenu name={viewer.name} email={viewer.email} look={look} onProfile={active === "profil"} librarian={role === "pustakawan"} />
      <IdleSignOut minutes={idleMinutes(process.env.IDLE_TIMEOUT_MINUTES)} />
    </>
  );
}
