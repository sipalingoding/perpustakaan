"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { advanceDonation, rejectDonation } from "@/app/admin/actions";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { MemberPhone } from "@/components/admin/MemberPhone";
import { Check, Parcel, Spinner } from "@/components/icons";
import { ui } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatShort } from "@/lib/dates";
import { formatHour } from "@/lib/library";
import type { AdminDonation, DonationStatus } from "@/lib/server/admin-donations";
import { useToast } from "@/components/Toast";

type Filter = "diajukan" | "dikirim" | "diterima" | "ditolak" | "semua";

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: "diajukan", label: "Perlu disetujui" },
  { key: "dikirim", label: "Dalam pengiriman" },
  { key: "diterima", label: "Diterima" },
  { key: "ditolak", label: "Ditolak" },
  { key: "semua", label: "Semua" },
];

const STATUS: Record<DonationStatus, { label: string; className: string }> = {
  diajukan: { label: "Menunggu persetujuan", className: "bg-accent-100 text-accent-700" },
  dikirim: { label: "Dalam pengiriman", className: "bg-secondary-100 text-secondary-600" },
  diterima: { label: "Diterima", className: "bg-primary-100 text-primary-700" },
  ditolak: { label: "Ditolak", className: "bg-ground-2 text-ink-3" },
};

const CONDITION = { baru: "Baru", baik: "Baik", kurang: "Kurang baik" } as const;

const EMPTY: Record<Filter, string> = {
  diajukan: "Tidak ada sumbangan yang menunggu persetujuan.",
  dikirim: "Tidak ada sumbangan yang sedang dalam pengiriman.",
  diterima: "Belum ada sumbangan yang diterima.",
  ditolak: "Belum ada sumbangan yang ditolak.",
  semua: "Belum ada sumbangan.",
};

const day = (iso: string) => formatShort(Date.parse(iso));

/**
 * Sumbangan dari anggota. Pustakawan menyetujui formulir (status jadi "dalam pengiriman": anggota mengantar atau
 * petugas menjemput), lalu menekan "Konfirmasi diterima" setelah bukunya benar-benar di tangan (status jadi "diterima").
 * Sumbangan yang belum diterima bisa ditolak (mis. buku rusak), dengan alasan yang dikirim ke penyumbang.
 */
export function AdminDonations({ donations }: { donations: AdminDonation[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(donations);
  const counts = {
    diajukan: rows.filter((d) => d.status === "diajukan").length,
    dikirim: rows.filter((d) => d.status === "dikirim").length,
    diterima: rows.filter((d) => d.status === "diterima").length,
    ditolak: rows.filter((d) => d.status === "ditolak").length,
    semua: rows.length,
  };
  const [filter, setFilter] = useState<Filter>(counts.diajukan > 0 ? "diajukan" : counts.dikirim > 0 ? "dikirim" : "semua");
  const [busyId, setBusyId] = useState<string | null>(null);
  // Klik kedua sebelum tombol sempat nonaktif (klik ganda) diabaikan, supaya tidak menimpa pesan klik pertama.
  const inFlight = useRef(new Set<string>());
  const setNotice = useToast();
  const [rejecting, setRejecting] = useState<AdminDonation | null>(null);
  const [reason, setReason] = useState("");

  // Baris yang baru diproses tetap terlihat di saringan ini (dengan status dan tombol berikutnya) sampai saringan diganti,
  // supaya pustakawan tidak kehilangan jejak sumbangan yang baru disetujui.
  const [kept, setKept] = useState<Set<string>>(new Set());
  const shown = filter === "semua" ? rows : rows.filter((d) => d.status === filter || kept.has(d.id));
  const changeFilter = (f: Filter) => {
    setFilter(f);
    setKept(new Set());
  };

  const advance = async (d: AdminDonation) => {
    if ((d.status !== "diajukan" && d.status !== "dikirim") || inFlight.current.has(d.id)) return;
    inFlight.current.add(d.id);
    setBusyId(d.id);
    setNotice(null);
    try {
      const result = await advanceDonation(d.id, d.status);
      if (!result.ok) {
        setNotice({ kind: "error", text: `${d.code}: ${result.error}` });
        return;
      }
      const book = result.book ? { id: result.book.bookId, slug: result.book.slug, title: result.book.title } : null;
      setRows((all) => all.map((r) => (r.id === d.id ? { ...r, status: result.status, book: book ?? r.book } : r)));
      setKept((ids) => new Set(ids).add(d.id));
      if (result.status === "dikirim") {
        setNotice({
          kind: "ok",
          text: `${d.code} disetujui dan sekarang dalam pengiriman. Tekan “Konfirmasi diterima” setelah bukunya tiba di perpustakaan.`,
        });
      } else if (result.book) {
        const b = result.book;
        setNotice({
          kind: "ok",
          text: b.created
            ? `${d.code} diterima. “${b.title}” masuk koleksi sebagai buku baru di rak sementara SB (${b.copies} eksemplar).`
            : `${d.code} diterima. ${b.copies} eksemplar ditambahkan ke “${b.title}” yang sudah ada di koleksi.`,
          action: { href: `/admin/buku/${b.bookId}`, label: b.created ? "Lengkapi data buku" : "Lihat buku" },
        });
      }
      router.refresh();
    } catch {
      setNotice({ kind: "error", text: `${d.code} gagal diperbarui. Periksa koneksi lalu coba lagi.` });
    } finally {
      inFlight.current.delete(d.id);
      setBusyId(null);
    }
  };

  const reject = async (d: AdminDonation) => {
    if ((d.status !== "diajukan" && d.status !== "dikirim") || inFlight.current.has(d.id)) return;
    inFlight.current.add(d.id);
    setBusyId(d.id);
    setNotice(null);
    try {
      const result = await rejectDonation(d.id, d.status, reason);
      if (!result.ok) {
        setNotice({ kind: "error", text: `${d.code}: ${result.error}` });
        return;
      }
      setRows((all) => all.map((r) => (r.id === d.id ? { ...r, status: "ditolak" } : r)));
      setKept((ids) => new Set(ids).add(d.id));
      setNotice({ kind: "ok", text: `${d.code} ditolak. Penyumbang sudah diberi kabar.` });
      setRejecting(null);
      setReason("");
      router.refresh();
    } catch {
      setNotice({ kind: "error", text: `${d.code} gagal ditolak. Periksa koneksi lalu coba lagi.` });
    } finally {
      inFlight.current.delete(d.id);
      setBusyId(null);
    }
  };

  return (
    <div className={cn(ui.wrap, "pt-6")}>
      <h1 className="display m-0 text-[clamp(44px,5.6vw,68px)] leading-none">Sumbangan</h1>
      <p className="mt-3 mb-0 max-w-[60ch] text-[15px] leading-relaxed text-ink-3">
        Setujui formulir yang layak, lalu tekan <strong className="text-ink-2">Konfirmasi diterima</strong> setelah bukunya benar-benar
        sampai di meja sirkulasi.
      </p>

      <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Saring menurut status">
        {FILTERS.map((f) => (
          <button key={f.key} type="button" className={ui.chip} aria-pressed={filter === f.key} onClick={() => changeFilter(f.key)}>
            {f.label}
            <span className="text-[13px] opacity-70">{counts[f.key]}</span>
          </button>
        ))}
      </div>


      <div className="relative mt-5 overflow-x-auto rounded-[22px] border border-line bg-paper">
        <table className="w-full min-w-[860px] border-collapse text-left text-sm">
          <caption className="sr-only">Daftar sumbangan, {shown.length} baris</caption>
          <thead>
            <tr className="border-b border-line text-[13px] text-ink-3">
              <th scope="col" className="py-3 pr-3 pl-5 font-semibold">
                Buku
              </th>
              <th scope="col" className="px-3 py-3 font-semibold">
                Penyumbang
              </th>
              <th scope="col" className="px-3 py-3 font-semibold">
                Pengiriman
              </th>
              <th scope="col" className="px-3 py-3 font-semibold">
                Status
              </th>
              <th scope="col" className="py-3 pr-5 pl-3 text-right font-semibold">
                <span className="sr-only">Aksi</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {shown.map((d) => {
              const busy = busyId === d.id;
              return (
                <tr key={d.id} className="border-b border-line-2 align-top last:border-b-0 hover:bg-tint">
                  <td className="py-3.5 pr-3 pl-5">
                    <span className="block font-bold text-ink">{d.title}</span>
                    <span className="block text-[13px] text-ink-3">{d.author}</span>
                    <span className="mt-1 block text-[13px] text-ink-2">
                      {d.qty} eksemplar · {CONDITION[d.condition]} · {d.category}
                    </span>
                    {d.note && <span className="mt-1 block max-w-[38ch] text-[13px] text-ink-3 italic">“{d.note}”</span>}
                    <span className="mt-1 block font-mono text-xs text-muted">{d.code}</span>
                  </td>
                  <td className="px-3 py-3.5">
                    <span className="block font-semibold text-ink-2">{d.donorName}</span>
                    <span className="block text-[13px] break-all text-ink-3">{d.donorEmail}</span>
                    <MemberPhone phone={d.donorPhone} name={d.donorName} />
                    <span className="mt-1 block text-xs text-muted">Diajukan {day(d.createdOn)}</span>
                  </td>
                  <td className="px-3 py-3.5">
                    <span className="flex items-center gap-1.5 font-semibold text-ink-2">
                      <Parcel size={18} className="shrink-0 text-ink-3" />
                      {d.method === "jemput" ? "Dijemput" : "Diantar"} {day(d.scheduledOn)}
                      {d.scheduledHour !== null && `, ${formatHour(d.scheduledHour)}`}
                    </span>
                    {d.method === "jemput" && d.address && (
                      <span className="mt-1 block max-w-[30ch] text-[13px] text-ink-3">{d.address}</span>
                    )}
                  </td>
                  <td className="px-3 py-3.5 whitespace-nowrap">
                    <span className={cn("status", STATUS[d.status].className)}>{STATUS[d.status].label}</span>
                    {d.status === "dikirim" && (
                      <span className="mt-1.5 block max-w-[22ch] text-xs whitespace-normal text-ink-3">
                        Konfirmasi setelah buku tiba di perpustakaan.
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 pr-5 pl-3 text-right whitespace-nowrap">
                    {d.status === "diajukan" || d.status === "dikirim" ? (
                      <span className="inline-flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setReason("");
                          setRejecting(d);
                        }}
                        disabled={busy}
                        aria-label={`Tolak ${d.title} (${d.code})`}
                        className={cn(ui.btn, ui.ghost, "min-h-11 px-4 text-sm disabled:cursor-wait")}
                      >
                        Tolak
                      </button>
                      <button
                        type="button"
                        onClick={() => advance(d)}
                        disabled={busy}
                        aria-busy={busy}
                        aria-label={`${d.status === "diajukan" ? "Setujui" : "Konfirmasi diterima"} ${d.title} (${d.code})`}
                        className={cn(
                          ui.btn,
                          d.status === "diajukan" ? ui.primary : ui.ghost,
                          "min-h-11 px-4 text-sm disabled:cursor-wait",
                        )}
                      >
                        {busy ? <Spinner size={18} /> : <Check size={18} />}
                        {d.status === "diajukan" ? "Setujui" : "Konfirmasi diterima"}
                      </button>
                      </span>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {shown.length === 0 && <p className="m-0 px-5 py-8 text-center text-[15px] text-ink-3">{EMPTY[filter]}</p>}
      </div>

      {rejecting && (
        <ConfirmDialog
          title={`Tolak sumbangan “${rejecting.title}”?`}
          confirmLabel="Ya, tolak"
          busy={busyId === rejecting.id}
          onConfirm={() => reject(rejecting)}
          onCancel={() => setRejecting(null)}
        >
          <span className="flex flex-col gap-2">
            <span>{rejecting.code} ditandai ditolak dan penyumbang diberi kabar lewat notifikasi.</span>
            <label htmlFor="alasan-tolak" className={ui.label}>
              Alasan untuk penyumbang (boleh kosong)
            </label>
            <textarea
              id="alasan-tolak"
              value={reason}
              maxLength={200}
              rows={3}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Mis. halaman banyak yang sobek."
              className={cn(ui.field, "py-3")}
            />
          </span>
        </ConfirmDialog>
      )}
    </div>
  );
}
