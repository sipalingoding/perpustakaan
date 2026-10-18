"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { approvePickup, approveReturn, cancelPickup } from "@/app/admin/actions";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { MemberPhone } from "@/components/admin/MemberPhone";
import { Check, ReturnBook, Spinner } from "@/components/icons";
import { ui } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatShort } from "@/lib/dates";
import { rupiah } from "@/lib/fine";
import { formatHour } from "@/lib/library";
import type { AdminLoan } from "@/lib/server/admin-loans";
import { useToast } from "@/components/Toast";

type Filter = "kembali" | "reserved" | "active" | "semua";

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: "kembali", label: "Pengembalian" },
  { key: "reserved", label: "Terbooking" },
  { key: "active", label: "Dipinjam" },
  { key: "semua", label: "Semua" },
];

const EMPTY: Record<Filter, string> = {
  kembali: "Tidak ada pengembalian yang menunggu diterima.",
  reserved: "Tidak ada booking yang menunggu diambil.",
  active: "Tidak ada buku yang sedang dipinjam.",
  semua: "Belum ada peminjaman yang berjalan.",
};

const day = (iso: string) => formatShort(Date.parse(iso));

/** `returned` = baru saja diterima pustakawan di halaman ini (sebelum data dimuat ulang). */
type Row = AdminLoan & { returned?: boolean };

/**
 * Peminjaman yang berjalan. Booking anggota berstatus "terbooking"; saat anggota datang dan menerima bukunya,
 * pustakawan menekan Approve sehingga statusnya jadi "dipinjam" dan masa pinjam mulai dihitung hari itu.
 * Anggota yang mengembalikan buku mengajukannya dari Jadwal; pustakawan menekan "Terima pengembalian" setelah bukunya
 * benar-benar di meja sirkulasi, baru statusnya jadi dikembalikan dan eksemplarnya tersedia lagi. Anggota yang langsung
 * datang membawa buku tanpa mengajukan juga bisa diterima ("Terima buku"), dan booking bisa dibatalkan.
 */
export function AdminLoans({ loans }: { loans: AdminLoan[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(loans);
  /** Pengembalian yang sudah diajukan anggota (saringan "Pengembalian"). */
  const isReturn = (l: Row) => l.status === "active" && l.returnRequestedOn !== null && !l.returned;
  /** Semua buku yang sedang dipinjam bisa diterima, diajukan atau tidak. */
  const canReceive = (l: Row) => l.status === "active" && !l.returned;
  const [cancelling, setCancelling] = useState<Row | null>(null);
  const counts = {
    kembali: rows.filter(isReturn).length,
    reserved: rows.filter((l) => l.status === "reserved").length,
    active: rows.filter((l) => l.status === "active").length,
    semua: rows.length,
  };
  const [filter, setFilter] = useState<Filter>(
    counts.kembali > 0 ? "kembali" : counts.reserved > 0 ? "reserved" : "semua",
  );
  // Baris yang baru di-approve tetap terlihat di saringan ini sampai saringan diganti.
  const [kept, setKept] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const inFlight = useRef(new Set<string>());
  const setNotice = useToast();

  const shown =
    filter === "semua"
      ? rows
      : rows.filter((l) => kept.has(l.id) || (filter === "kembali" ? isReturn(l) : l.status === filter));

  const changeFilter = (f: Filter) => {
    setFilter(f);
    setKept(new Set());
  };

  const approve = async (l: AdminLoan) => {
    if (l.status !== "reserved" || inFlight.current.has(l.id)) return;
    inFlight.current.add(l.id);
    setBusyId(l.id);
    setNotice(null);
    try {
      const result = await approvePickup(l.id);
      if (!result.ok) {
        setNotice({ kind: "error", text: `“${l.title}” (${l.memberName}): ${result.error}` });
        return;
      }
      setRows((all) =>
        all.map((r) => (r.id === l.id ? { ...r, status: "active", dueOn: result.dueOn, missedPickup: false } : r)),
      );
      setKept((ids) => new Set(ids).add(l.id));
      setNotice({
        kind: "ok",
        text: `“${l.title}” sekarang dipinjam ${l.memberName}. Kembali paling lambat ${day(result.dueOn)}.`,
      });
      router.refresh();
    } catch {
      setNotice({ kind: "error", text: `“${l.title}” gagal diperbarui. Periksa koneksi lalu coba lagi.` });
    } finally {
      inFlight.current.delete(l.id);
      setBusyId(null);
    }
  };

  const receive = async (l: Row) => {
    if (!canReceive(l) || inFlight.current.has(l.id)) return;
    inFlight.current.add(l.id);
    setBusyId(l.id);
    setNotice(null);
    try {
      const result = await approveReturn(l.id);
      if (!result.ok) {
        setNotice({ kind: "error", text: `“${l.title}” (${l.memberName}): ${result.error}` });
        return;
      }
      // Sudah kembali: tidak lagi termasuk peminjaman yang berjalan, tapi tetap terlihat sampai saringan diganti.
      setRows((all) => all.map((r) => (r.id === l.id ? { ...r, returned: true } : r)));
      setKept((ids) => new Set(ids).add(l.id));
      setNotice({
        kind: "ok",
        text:
          `“${l.title}” dari ${l.memberName} diterima dan tersedia lagi di rak.` +
          (result.fine > 0 ? ` Terlambat ${result.lateDays} hari: tagih denda ${rupiah(result.fine)}.` : ""),
      });
      router.refresh();
    } catch {
      setNotice({ kind: "error", text: `“${l.title}” gagal diperbarui. Periksa koneksi lalu coba lagi.` });
    } finally {
      inFlight.current.delete(l.id);
      setBusyId(null);
    }
  };

  const cancel = async (l: Row) => {
    if (l.status !== "reserved" || inFlight.current.has(l.id)) return;
    inFlight.current.add(l.id);
    setBusyId(l.id);
    setNotice(null);
    try {
      const result = await cancelPickup(l.id);
      if (!result.ok) {
        setNotice({ kind: "error", text: `“${l.title}” (${l.memberName}): ${result.error}` });
        return;
      }
      setRows((all) => all.filter((r) => r.id !== l.id));
      setNotice({ kind: "ok", text: `Booking “${l.title}” untuk ${l.memberName} dibatalkan. Anggota sudah diberi kabar.` });
      router.refresh();
    } catch {
      setNotice({ kind: "error", text: `Booking “${l.title}” gagal dibatalkan. Periksa koneksi lalu coba lagi.` });
    } finally {
      inFlight.current.delete(l.id);
      setBusyId(null);
      setCancelling(null);
    }
  };

  return (
    <div className={cn(ui.wrap, "pt-6")}>
      <h1 className="display m-0 text-[clamp(44px,5.6vw,68px)] leading-none">Peminjaman</h1>
      <p className="mt-3 mb-0 max-w-[60ch] text-[15px] leading-relaxed text-ink-3">
        Saat anggota datang mengambil buku yang dibookingnya, periksa kartu anggotanya lalu tekan{" "}
        <strong className="text-ink-2">Approve</strong>. Status buku jadi dipinjam dan masa pinjam mulai dihitung hari
        ini. Saat anggota menyerahkan buku, periksa bukunya lalu tekan{" "}
        <strong className="text-ink-2">Terima pengembalian</strong> (sudah diajukan dari aplikasi) atau{" "}
        <strong className="text-ink-2">Terima buku</strong> (langsung dibawa ke meja).
      </p>

      <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Saring menurut status">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={ui.chip}
            aria-pressed={filter === f.key}
            onClick={() => changeFilter(f.key)}
          >
            {f.label}
            <span className="text-[13px] opacity-70">{counts[f.key]}</span>
          </button>
        ))}
      </div>


      <div className="relative mt-5 overflow-x-auto rounded-[22px] border border-line bg-paper">
        <table className="w-full min-w-[820px] border-collapse text-left text-sm">
          <caption className="sr-only">Daftar peminjaman, {shown.length} baris</caption>
          <thead>
            <tr className="border-b border-line text-[13px] text-ink-3">
              <th scope="col" className="py-3 pr-3 pl-5 font-semibold">
                Buku
              </th>
              <th scope="col" className="px-3 py-3 font-semibold">
                Anggota
              </th>
              <th scope="col" className="px-3 py-3 font-semibold">
                Jadwal
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
            {shown.map((l) => {
              const busy = busyId === l.id;
              const reserved = l.status === "reserved";
              return (
                <tr key={l.id} className="border-b border-line-2 align-top last:border-b-0 hover:bg-tint">
                  <td className="py-3.5 pr-3 pl-5">
                    <Link href={`/buku/${l.slug}`} className="block font-bold text-ink no-underline hover:underline">
                      {l.title}
                    </Link>
                    <span className="mt-1 block font-mono text-xs text-muted">Eksemplar {l.copyCode}</span>
                  </td>
                  <td className="px-3 py-3.5">
                    <span className="block font-semibold text-ink-2">{l.memberName}</span>
                    <span className="block text-[13px] break-all text-ink-3">{l.memberEmail}</span>
                    <MemberPhone phone={l.memberPhone} name={l.memberName} />
                  </td>
                  <td className="px-3 py-3.5">
                    {reserved ? (
                      <>
                        <span className="block font-semibold text-ink-2">
                          Ambil {day(l.startOn)}
                          {l.pickupHour !== null && `, ${formatHour(l.pickupHour)}`}
                        </span>
                        <span className="block text-[13px] text-ink-3">Pinjam {l.days} hari</span>
                      </>
                    ) : (
                      <>
                        <span className="block font-semibold text-ink-2">Kembali {day(l.dueOn)}</span>
                        <span className="block text-[13px] text-ink-3">Diambil {day(l.startOn)}</span>
                      </>
                    )}
                  </td>
                  <td className="px-3 py-3.5 whitespace-nowrap">
                    {l.returned ? (
                      <span className="status bg-primary-100 text-primary-700">Dikembalikan</span>
                    ) : isReturn(l) ? (
                      <>
                        <span className="status bg-accent-100 text-accent-700">Menunggu diterima</span>
                        <span className="mt-1.5 block max-w-[24ch] text-xs whitespace-normal text-ink-3">
                          Diajukan {day(l.returnRequestedOn!)}
                          {l.overdue && ", sudah lewat jatuh tempo"}
                        </span>
                      </>
                    ) : (
                      <span
                        className={cn(
                          "status",
                          reserved || l.overdue
                            ? "bg-accent-100 text-accent-700"
                            : "bg-secondary-100 text-secondary-600",
                        )}
                      >
                        {reserved ? "Terbooking" : l.overdue ? "Telat dikembalikan" : "Dipinjam"}
                      </span>
                    )}
                    {l.missedPickup && (
                      <span className="mt-1.5 block max-w-[22ch] text-xs whitespace-normal text-accent-700">
                        Belum datang di jam ambilnya. Batal otomatis bila tidak diambil hari ini.
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 pr-5 pl-3 text-right whitespace-nowrap">
                    {reserved && (
                      <span className="inline-flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setCancelling(l)}
                          disabled={busy}
                          aria-label={`Batalkan booking: ${l.title} untuk ${l.memberName}`}
                          className={cn(ui.btn, ui.ghost, "min-h-11 px-4 text-sm disabled:cursor-wait")}
                        >
                          Batalkan
                        </button>
                        <button
                          type="button"
                          onClick={() => approve(l)}
                          disabled={busy}
                          aria-busy={busy}
                          aria-label={`Approve: ${l.title} diambil ${l.memberName}`}
                          className={cn(ui.btn, ui.primary, "min-h-11 px-4 text-sm disabled:cursor-wait")}
                        >
                          {busy ? <Spinner size={18} /> : <Check size={18} />}
                          Approve
                        </button>
                      </span>
                    )}
                    {canReceive(l) && (
                      <button
                        type="button"
                        onClick={() => receive(l)}
                        disabled={busy}
                        aria-busy={busy}
                        aria-label={`${isReturn(l) ? "Terima pengembalian" : "Terima buku"}: ${l.title} dari ${l.memberName}`}
                        className={cn(ui.btn, isReturn(l) ? ui.primary : ui.ghost, "min-h-11 px-4 text-sm disabled:cursor-wait")}
                      >
                        {busy ? <Spinner size={18} /> : <ReturnBook size={18} />}
                        {isReturn(l) ? "Terima pengembalian" : "Terima buku"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {shown.length === 0 && <p className="m-0 px-5 py-8 text-center text-[15px] text-ink-3">{EMPTY[filter]}</p>}
      </div>

      {cancelling && (
        <ConfirmDialog
          title={`Batalkan booking “${cancelling.title}”?`}
          confirmLabel="Ya, batalkan"
          busy={busyId === cancelling.id}
          onConfirm={() => cancel(cancelling)}
          onCancel={() => setCancelling(null)}
        >
          Booking {cancelling.memberName} dibatalkan dan eksemplar {cancelling.copyCode} terbuka lagi untuk anggota lain.
          Anggota diberi kabar lewat notifikasi.
        </ConfirmDialog>
      )}
    </div>
  );
}
