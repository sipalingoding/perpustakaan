import Link from "next/link";
import { ui } from "@/components/ui";
import { cn } from "@/lib/cn";

export type AdminTab = "koleksi" | "peminjaman" | "sumbangan" | "agenda";

const TABS: Array<{ key: AdminTab; href: string; label: string; badge: string }> = [
  { key: "koleksi", href: "/admin", label: "Koleksi", badge: "" },
  { key: "peminjaman", href: "/admin/peminjaman", label: "Peminjaman", badge: "menunggu diambil atau diterima" },
  { key: "sumbangan", href: "/admin/sumbangan", label: "Sumbangan", badge: "perlu ditindaklanjuti" },
  { key: "agenda", href: "/admin/agenda", label: "Agenda", badge: "" },
];

/** Tab halaman pustakawan. Angka = yang menunggu tindakan (booking yang belum diambil, sumbangan yang belum selesai). */
export function AdminNav({ active, counts }: { active: AdminTab; counts: Partial<Record<AdminTab, number>> }) {
  return (
    <nav aria-label="Halaman pustakawan" className={cn(ui.wrap, "flex flex-wrap gap-1 pt-8")}>
      {TABS.map((t) => {
        const n = counts[t.key] ?? 0;
        return (
          <Link key={t.key} href={t.href} aria-current={active === t.key ? "page" : undefined} className={cn(ui.navlink, "gap-2")}>
            {t.label}
            {n > 0 && (
              <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-accent-600 px-1.5 text-xs leading-6 font-bold text-white">
                {n}
                <span className="sr-only"> {t.badge}</span>
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
