import Link from "next/link";
import type { NavKey } from "@/components/layout/SiteHeader";
import { NotificationMenu } from "@/components/layout/NotificationMenu";
import { ProfileMenu } from "@/components/layout/ProfileMenu";
import { ui } from "@/components/ui";
import { countDueReminders, getProfile, resolveLook } from "@/lib/server/members";
import { countUnread, getNotifications } from "@/lib/server/notifications";
import { getRole, getViewer } from "@/lib/server/session";

/** Sisi kanan header: tamu melihat "Masuk", anggota melihat lonceng notifikasi, profil, dan tombol keluar. */
export async function HeaderActions({ active }: { active?: NavKey }) {
  const viewer = await getViewer();
  if (!viewer) {
    return (
      <Link href="/masuk" className={ui.navlink}>
        Masuk
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
    </>
  );
}
