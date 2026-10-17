"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteBook } from "@/app/admin/actions";
import { CatalogLink, EditLink, iconAction } from "@/components/admin/IconLink";
import { Plus, Search, Trash } from "@/components/icons";
import { ui } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { AdminBookRow } from "@/lib/server/admin";
import { useToast } from "@/components/Toast";
import { ConfirmDialog } from "@/components/ConfirmDialog";

/** Dasbor pustakawan: semua judul di koleksi, dengan stok dan jalan pintas untuk mengubahnya. */
export function AdminDashboard({ books }: { books: AdminBookRow[] }) {
  const [query, setQuery] = useState("");
  const setNotice = useToast();
  const needle = query.trim().toLowerCase();
  const shown = needle
    ? books.filter((b) => `${b.title} ${b.author} ${b.shelf} ${b.category}`.toLowerCase().includes(needle))
    : books;
  const copies = books.reduce((n, b) => n + b.copies, 0);
  const out = books.reduce((n, b) => n + b.out, 0);
  const noCover = books.filter((b) => !b.coverImage).length;

  return (
    <div className={cn(ui.wrap, "pt-6")}>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="flex flex-col gap-3">
          <h1 className="display m-0 text-[clamp(44px,5.6vw,68px)] leading-none">Koleksi</h1>
          <div className="flex flex-wrap gap-2.5">
            <span className={ui.stat}>
              <strong>{books.length}</strong> judul
            </span>
            <span className={ui.stat}>
              <strong>{copies}</strong> eksemplar
            </span>
            <span className={ui.stat}>
              <strong>{out}</strong> di luar rak
            </span>
            {noCover > 0 && (
              <span className={ui.stat}>
                <strong>{noCover}</strong> belum punya foto sampul
              </span>
            )}
          </div>
        </div>
        <Link href="/admin/buku/baru" className={cn(ui.btn, ui.primary)}>
          <Plus />
          Tambah buku
        </Link>
      </div>

      <div className="mt-8 flex max-w-md items-center gap-2.5 rounded-[14px] border-[1.5px] border-field bg-white pl-4 transition focus-within:border-primary-600 focus-within:shadow-[0_0_0_4px_rgba(46,90,82,.15)]">
        <Search size={20} className="shrink-0 text-ink-3" />
        <label htmlFor="cari-koleksi" className="sr-only">
          Cari judul, penulis, atau kode rak
        </label>
        <input
          id="cari-koleksi"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari judul, penulis, atau rak"
          className="min-h-12 min-w-0 flex-1 border-0 bg-transparent pr-4 text-[15px] text-ink outline-none"
        />
      </div>


      {books.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-2 rounded-3xl border-[1.5px] border-dashed border-field px-6 py-14 text-center">
          <p className="display m-0 text-[28px] leading-tight">Koleksi masih kosong.</p>
          <p className="m-0 max-w-[44ch] text-[15px] text-ink-3">
            Tambahkan buku pertama. Data dan sampulnya bisa dicari di Open Library.
          </p>
        </div>
      ) : (
        <div className="relative mt-5 overflow-x-auto rounded-[22px] border border-line bg-paper">
          <table className="w-full min-w-[680px] border-collapse text-left text-sm">
            <caption className="sr-only">Daftar buku di koleksi, {shown.length} judul</caption>
            <thead>
              <tr className="border-b border-line text-[13px] text-ink-3">
                <th scope="col" className="py-3 pr-3 pl-5 font-semibold">
                  Buku
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  Kategori
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  Rak
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  Di rak
                </th>
                <th scope="col" className="py-3 pr-5 pl-3">
                  <span className="sr-only">Aksi</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map((b) => {
                const onShelf = b.copies - b.out;
                return (
                  <tr key={b.id} className="border-b border-line-2 last:border-b-0 hover:bg-tint">
                    <td className="py-3 pr-3 pl-5">
                      <div className="flex items-center gap-3.5">
                        <span
                          aria-hidden="true"
                          className="spine-shade relative h-[60px] w-10 shrink-0 overflow-hidden rounded-[2px_6px_6px_2px]"
                          style={{ backgroundColor: b.coverBg }}
                        >
                          {b.coverImage && (
                            // eslint-disable-next-line @next/next/no-img-element -- sampul kecil dari rute sendiri
                            <img
                              src={b.coverImage}
                              alt=""
                              loading="lazy"
                              className="absolute inset-0 size-full object-cover"
                            />
                          )}
                        </span>
                        <span className="flex min-w-0 flex-col">
                          <Link
                            href={`/admin/buku/${b.id}`}
                            className="font-bold text-ink no-underline hover:underline"
                          >
                            {b.title}
                          </Link>
                          <span className="truncate text-[13px] text-ink-3">{b.author}</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-ink-2">{b.category}</td>
                    <td className="px-3 py-3 font-semibold text-ink-2 tabular-nums">{b.shelf}</td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span
                        className={cn(
                          "status",
                          onShelf > 0 ? "bg-primary-100 text-primary-700" : "bg-accent-100 text-accent-700",
                        )}
                      >
                        {onShelf} dari {b.copies}
                      </span>
                    </td>
                    <td className="py-3 pr-5 pl-3 text-right whitespace-nowrap">
                      <EditLink id={b.id} title={b.title} className="align-middle" />
                      <CatalogLink slug={b.slug} title={b.title} className="align-middle" />
                      <DeleteBookButton book={b} onDone={setNotice} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {shown.length === 0 && (
            <p className="m-0 px-5 py-8 text-center text-[15px] text-ink-3">
              Tidak ada buku yang cocok dengan “{query}”.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Hapus buku dari baris tabel. Klik pertama hanya meminta konfirmasi di baris itu; buku yang pernah dipinjam
 * tidak bisa dihapus (riwayat dan denda harus utuh), jadi tombolnya nonaktif dengan alasan di tooltip.
 */
function DeleteBookButton({
  book,
  onDone,
}: {
  book: AdminBookRow;
  onDone: (notice: { kind: "ok" | "error"; text: string }) => void;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    setBusy(true);
    try {
      const result = await deleteBook(book.id);
      if (result.ok) {
        onDone({ kind: "ok", text: `“${book.title}” dihapus dari katalog.` });
        router.refresh();
      } else {
        onDone({ kind: "error", text: `“${book.title}” tidak dihapus. ${result.error}` });
      }
    } catch {
      onDone({ kind: "error", text: `“${book.title}” gagal dihapus. Periksa koneksi lalu coba lagi.` });
    }
    setBusy(false);
    setConfirming(false);
  };

  if (book.everLoaned) {
    const reason = `${book.title} punya riwayat peminjaman, jadi tidak bisa dihapus`;
    return (
      <span title={reason} className="inline-flex align-middle">
        <button type="button" disabled aria-label={reason} className={cn(iconAction, "cursor-not-allowed opacity-35 hover:bg-transparent")}>
          <Trash size={22} />
        </button>
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        aria-label={`Hapus ${book.title}`}
        title={`Hapus ${book.title}`}
        aria-haspopup="dialog"
        onClick={() => setConfirming(true)}
        className={cn(iconAction, "align-middle hover:bg-accent-100 hover:text-accent-700")}
      >
        <Trash size={22} />
      </button>
      {confirming && (
        <ConfirmDialog
          title={`Hapus “${book.title}”?`}
          busy={busy}
          onConfirm={remove}
          onCancel={() => setConfirming(false)}
        >
          Buku ini belum pernah dipinjam, jadi akan dihapus dari katalog beserta sampulnya. Tidak bisa dibatalkan.
        </ConfirmDialog>
      )}
    </>
  );
}
