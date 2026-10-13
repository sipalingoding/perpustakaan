import Link from "next/link";
import type { ReactNode } from "react";
import { Eye, Pencil } from "@/components/icons";
import { cn } from "@/lib/cn";

/** Bentuk tombol ikon bulat 44 px, dipakai tautan dan tombol aksi di tabel koleksi. */
export const iconAction =
  "inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 text-ink-2 transition-colors hover:bg-hover hover:text-ink";

/** Tautan berupa ikon saja. Labelnya dibaca pembaca layar dan muncul sebagai tooltip. */
function IconLink({ href, label, className, children }: { href: string; label: string; className?: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className={cn(iconAction, className)}
    >
      {children}
    </Link>
  );
}

/** Ke halaman buku di katalog publik. */
export function CatalogLink({ slug, title, className }: { slug: string; title?: string; className?: string }) {
  return (
    <IconLink href={`/buku/${slug}`} label={title ? `Lihat ${title} di katalog` : "Lihat di katalog"} className={className}>
      <Eye size={22} />
    </IconLink>
  );
}

/** Ke formulir ubah buku di admin. */
export function EditLink({ id, title, className }: { id: string; title: string; className?: string }) {
  return (
    <IconLink href={`/admin/buku/${id}`} label={`Ubah ${title}`} className={cn("text-primary-600", className)}>
      <Pencil size={22} />
    </IconLink>
  );
}
