"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setDueReminder } from "@/app/jadwal/actions";
import { Alert, ArrowRight, ChevronLeft, ChevronRight, Clock, ReturnBook } from "@/components/icons";
import { ReturnDialog } from "@/components/schedule/ReturnDialog";
import { useToast } from "@/components/Toast";
import { Hourglass } from "@/components/illustrations/Hourglass";
import { OverdueClock } from "@/components/illustrations/OverdueClock";
import { RoundButton } from "@/components/RoundButton";
import { ui } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatHour } from "@/lib/library";
import { BULAN, DAY, formatDay, formatLong, formatShort, utc } from "@/lib/dates";
import { FINE_PER_DAY, fineFor, overdueDays, rupiah } from "@/lib/fine";
import type { ScheduleData, ScheduleEvent, ScheduleLoan } from "@/lib/server/schedule";

const NOTE: Record<ScheduleLoan["status"], string> = {
  returned: "dikembalikan",
  active: "sedang dipinjam",
  reserved: "terbooking",
};
const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const TAG_STYLE = {
  Kembali: "bg-ink text-paper",
  Telat: "bg-accent-600 text-white",
  Ambil: "bg-accent-100 text-accent-700",
  Pinjam: "bg-primary-100 text-primary-600",
} as const;
const LATE_COLOR = "var(--color-accent-600)";
/** Chip ringkasan saat ada buku terlambat. Ditulis utuh karena cn tidak menyelesaikan bentrokan kelas. */
const LATE_STAT =
  "inline-flex items-baseline gap-1.5 rounded-full border border-accent-200 bg-accent-50 px-[15px] py-[9px] text-sm text-accent-700 [&_strong]:text-[17px] [&_strong]:text-accent-700";

type Cell =
  | { blank: true; key: string }
  | {
      blank: false;
      key: string;
      time: number;
      day: number;
      sunday: boolean;
      lanes: Array<{ id: string; on: boolean; late: boolean; start: boolean; end: boolean; loan: ScheduleLoan }>;
      /** Agenda yang diikuti pada hari ini. */
      agenda: ScheduleEvent[];
      tag?: keyof typeof TAG_STYLE;
      count: number;
    };

/** Jadwal peminjaman: kalender meja, daftar pinjaman, dan reservasi. Buku yang terlambat dikenai denda per hari. */
export function ScheduleClient({ data }: { data: ScheduleData }) {
  const { today, months, loans, events: agenda } = data;
  const [monthIndex, setMonthIndex] = useState(1);
  const [flips, setFlips] = useState(0);
  const [selected, setSelected] = useState(today);
  const [remind, setRemind] = useState(data.remind);
  const notify = useToast();
  const [, startTransition] = useTransition();
  const router = useRouter();
  const [returning, setReturning] = useState<ScheduleLoan | null>(null);

  /** Buku aktif yang lewat batas kembali. */
  const isLate = (l: ScheduleLoan) => l.status === "active" && l.due < today;
  /** Jalur di kalender berlanjut sampai hari ini bila terlambat. */
  const laneEnd = (l: ScheduleLoan) => (isLate(l) ? today : l.due);

  const [year, month] = months[monthIndex];
  const first = utc(year, month, 1);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const last = utc(year, month, daysInMonth);
  const lead = (new Date(first).getUTCDay() + 6) % 7;
  const inMonth = loans.filter((l) => l.start <= last && laneEnd(l) >= first);

  const cells: Cell[] = [];
  for (let i = 0; i < lead; i++) cells.push({ blank: true, key: `lead-${i}` });
  for (let d = 1; d <= daysInMonth; d++) {
    const t = utc(year, month, d);
    let tag: keyof typeof TAG_STYLE | undefined;
    const lanes = inMonth.map((loan) => {
      const end = laneEnd(loan);
      const on = t >= loan.start && t <= end;
      if (on && t === loan.due && !tag) tag = "Kembali";
      if (on && isLate(loan) && t === today) tag = "Telat";
      return { id: loan.id, on, late: on && t > loan.due, start: t === loan.start, end: t === end, loan };
    });
    if (!tag) {
      const starting = inMonth.find((l) => l.start === t);
      if (starting) tag = starting.status === "reserved" ? "Ambil" : "Pinjam";
    }
    cells.push({
      blank: false,
      key: `d-${d}`,
      time: t,
      day: d,
      sunday: new Date(t).getUTCDay() === 0,
      lanes,
      agenda: agenda.filter((e) => e.date === t),
      tag,
      count: lanes.filter((l) => l.on).length,
    });
  }
  while (cells.length % 7) cells.push({ blank: true, key: `tail-${cells.length}` });

  const selectedEvents = loans
    .filter((l) => selected >= l.start && selected <= laneEnd(l))
    .map((l) => {
      let text = "sedang bersamamu";
      if (selected > l.due) {
        const days = overdueDays(l.due, selected);
        text = `terlambat ${days} hari, denda ${rupiah(fineFor(days))}`;
      } else if (selected === l.due)
        text = l.status === "returned" ? "dikembalikan hari ini" : "batas akhir pengembalian";
      else if (selected === l.start)
        text = l.status === "reserved" ? "mulai bisa diambil di meja sirkulasi" : "mulai dipinjam";
      else if (l.status === "reserved") text = "masa pinjam setelah diambil";
      else if (l.status === "returned") text = "masa pinjam (sudah selesai)";
      return { loan: l, text, late: selected > l.due };
    });

  const selectedAgenda = agenda.filter((e) => e.date === selected);
  const monthAgenda = agenda.filter((e) => e.date >= first && e.date <= last);
  const upcomingAgenda = agenda.filter((e) => e.date >= today);

  const active = loans.filter((l) => l.status === "active");
  const reserved = loans.find((l) => l.status === "reserved");
  const lateLoans = active.filter(isLate);
  const totalFine = lateLoans.reduce((sum, l) => sum + fineFor(overdueDays(l.due, today)), 0);

  const goMonth = (delta: number) => {
    const next = monthIndex + delta;
    if (next < 0 || next >= months.length) return;
    setMonthIndex(next);
    setFlips((f) => f + 1);
  };

  const toggleRemind = () => {
    const next = !remind;
    setRemind(next);
    startTransition(async () => {
      const result = await setDueReminder(next);
      if (!result.ok) {
        setRemind(!next);
        notify({ kind: "error", text: result.error });
        return;
      }
      notify({
        kind: "ok",
        text: next ? "Pengingat menyala: kami kirim email dan WhatsApp sehari sebelum jatuh tempo." : "Pengingat jatuh tempo dimatikan.",
      });
    });
  };

  return (
    <div className={ui.wrap}>
      <section className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6 pt-11 pb-[34px]">
        <div className="flex max-w-[680px] animate-fade-up flex-col gap-3.5">
          <h1 className="display m-0 text-[clamp(44px,5.5vw,72px)] leading-none">Jadwal peminjaman</h1>
          <p className="m-0 text-[17px] leading-relaxed text-ink-3">
            Hari ini {formatLong(today)}.{" "}
            {lateLoans.length === 0
              ? "Semua buku aman, belum ada yang terlambat."
              : `${lateLoans.length} buku melewati batas pengembalian. Denda berjalan ${rupiah(totalFine)}.`}
          </p>
          <div className="flex flex-wrap gap-2.5">
            <span className={ui.stat}>
              <strong>{active.length}</strong> sedang dipinjam
            </span>
            <span className={ui.stat}>
              <strong>{reserved ? 1 : 0}</strong> terbooking
            </span>
            {upcomingAgenda.length > 0 && (
              <span className={ui.stat}>
                <strong>{upcomingAgenda.length}</strong> agenda diikuti
              </span>
            )}
            <span className={lateLoans.length > 0 ? LATE_STAT : ui.stat}>
              <strong>{lateLoans.length}</strong> terlambat
            </span>
          </div>
        </div>
        {lateLoans.length > 0 ? (
          <OverdueClock className="h-[188px] w-[150px] animate-fade-up [animation-delay:.15s]" />
        ) : (
          <Hourglass className="h-[188px] w-[150px] animate-fade-up [animation-delay:.15s]" />
        )}
      </section>

      <div className="flex flex-wrap items-start gap-7">
        <div className="flex min-w-0 flex-[999_1_600px] flex-col gap-5">
          <div className="relative pt-[18px]">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-7 top-0 z-[3] flex justify-between sm:inset-x-14"
            >
              {Array.from({ length: 9 }, (_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-9 w-3 rounded-[7px] border-[3px] border-[#55655F] bg-ground",
                    i >= 6 && "max-sm:hidden",
                  )}
                />
              ))}
            </div>
            <div
              key={flips}
              className="relative origin-top animate-sheet-flip rounded-3xl border border-line bg-paper px-2.5 pt-9 pb-[18px] shadow-[0_2px_0_#E6E9E1,0_4px_0_#FAF9F3,0_5px_0_#D9DED5,0_30px_50px_-36px_rgba(29,43,40,.55)] sm:px-7 sm:pt-[42px] sm:pb-[26px]"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="display m-0 text-[40px] leading-none">
                  {BULAN[month - 1]} <span className="text-muted">{year}</span>
                </h2>
                <div className="flex gap-2">
                  <RoundButton label="Bulan sebelumnya" disabled={monthIndex === 0} onClick={() => goMonth(-1)}>
                    <ChevronLeft />
                  </RoundButton>
                  <RoundButton
                    label="Bulan berikutnya"
                    disabled={monthIndex === months.length - 1}
                    onClick={() => goMonth(1)}
                  >
                    <ChevronRight />
                  </RoundButton>
                </div>
              </div>

              <div
                aria-hidden="true"
                className="grid grid-cols-7 pt-[22px] pb-2 text-[10px] font-bold tracking-[0.08em] text-muted uppercase sm:text-xs"
              >
                {WEEKDAYS.map((d) => (
                  <span key={d} className="pl-1 sm:pl-2.5">
                    {d}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-7 border-t border-l border-line-2">
                {cells.map((cell) =>
                  cell.blank ? (
                    <span
                      key={cell.key}
                      aria-hidden="true"
                      className="min-h-[62px] border-r border-b border-line-2 bg-[repeating-linear-gradient(135deg,transparent_0_7px,rgba(213,220,211,.45)_7px_8px)] sm:min-h-[94px]"
                    />
                  ) : (
                    <button
                      key={cell.key}
                      type="button"
                      aria-pressed={cell.time === selected}
                      aria-label={`${formatLong(cell.time)}${cell.count ? `, ${cell.count} buku` : ""}${cell.tag ? `, ${cell.tag.toLowerCase()}` : ""}${cell.agenda.map((e) => `, agenda ${e.name} pukul ${e.start}`).join("")}`}
                      onClick={() => setSelected(cell.time)}
                      className="relative flex min-h-[62px] cursor-pointer flex-col gap-1.5 border-0 border-r border-b border-solid border-line-2 bg-transparent py-2 text-left text-ink transition-colors hover:bg-primary-50 aria-pressed:bg-primary-50 aria-pressed:shadow-[inset_0_0_0_2px_var(--color-primary-600)] sm:min-h-[94px]"
                    >
                      <span
                        className={cn(
                          "ml-1 inline-flex h-6 min-w-6 items-center justify-center self-start rounded-full px-1.5 text-xs font-semibold sm:ml-2 sm:h-7 sm:min-w-7 sm:text-sm",
                          cell.time === today ? "bg-ink text-paper" : cell.sunday && "text-accent-600",
                        )}
                      >
                        {cell.day}
                      </span>
                      <span className="flex flex-col gap-1">
                        {cell.lanes.map((lane) => (
                          <span
                            key={lane.id}
                            className={cn(
                              "lane",
                              lane.on && lane.loan.status === "reserved" && "striped",
                              lane.on && lane.loan.status === "returned" && "opacity-50",
                            )}
                            data-start={lane.on && lane.start}
                            data-end={lane.on && lane.end}
                            style={{
                              backgroundColor: lane.on ? (lane.late ? LATE_COLOR : lane.loan.color) : "transparent",
                            }}
                          />
                        ))}
                      </span>
                      {cell.agenda.map((e) => (
                        <span
                          key={e.id}
                          className="mx-1 block truncate rounded-md px-1.5 py-[3px] text-[10px] leading-tight font-bold sm:mx-2 sm:text-[11px]"
                          style={{ backgroundColor: e.color, color: e.ink }}
                        >
                          <span className="max-sm:hidden">{e.start} </span>
                          {e.name}
                        </span>
                      ))}
                      {cell.tag && (
                        <span
                          className={cn(
                            "mx-2 mt-auto hidden self-start rounded-full px-2 py-[3px] text-[11px] font-bold tracking-[0.02em] sm:inline-block",
                            TAG_STYLE[cell.tag],
                          )}
                        >
                          {cell.tag}
                        </span>
                      )}
                    </button>
                  ),
                )}
              </div>

              {inMonth.length > 0 || monthAgenda.length > 0 ? (
                <ul className="m-0 mt-5 flex list-none flex-wrap gap-x-6 gap-y-2.5 p-0 text-[13px] text-ink-2">
                  {monthAgenda.map((e) => (
                    <li key={e.id} className="flex items-center gap-2">
                      <AgendaSwatch event={e} />
                      <span>
                        <strong>{e.name}</strong> · {formatShort(e.date)}, {e.start}–{e.end} · agenda
                      </span>
                    </li>
                  ))}
                  {inMonth.map((l) => (
                    <li key={l.id} className="flex items-center gap-2">
                      <Swatch loan={l} />
                      <span>
                        <strong>{l.title}</strong> · {formatShort(l.start)} – {formatShort(l.due)} ·{" "}
                        {isLate(l) ? `terlambat ${overdueDays(l.due, today)} hari` : NOTE[l.status]}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-5 mb-0 text-sm text-ink-3">Belum ada jadwal peminjaman atau agenda di bulan ini.</p>
              )}
            </div>
          </div>

          <section aria-live="polite" className={cn(ui.card, "flex flex-col gap-3")}>
            <span className={ui.eyebrow}>Hari terpilih</span>
            <p className="display m-0 text-[28px] leading-tight">
              {formatLong(selected)}
              {selected === today && " · hari ini"}
            </p>
            {selectedEvents.length > 0 || selectedAgenda.length > 0 ? (
              <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
                {selectedAgenda.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 text-[15px] text-ink-2">
                    <AgendaSwatch event={e} />
                    <span>
                      <strong className="text-ink">{e.name}</strong>: agenda pukul {e.start}–{e.end} WIB di {e.place}.{" "}
                      <Link href={`/agenda#jadwal-${e.id}`}>Lihat agenda</Link>
                    </span>
                  </li>
                ))}
                {selectedEvents.map(({ loan, text, late }) => (
                  <li key={loan.id} className="flex items-center gap-3 text-[15px] text-ink-2">
                    <Swatch loan={loan} late={late} />
                    <span>
                      <strong className="text-ink">{loan.title}</strong>: {text}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="m-0 text-[15px] text-ink-3">
                Tidak ada jadwal pada hari ini. <Link href="/">Cari buku berikutnya di katalog</Link>.
              </p>
            )}
          </section>
        </div>

        <aside className="flex min-w-0 flex-[1_1_340px] flex-col gap-5">
          {lateLoans.length > 0 && (
            <section
              role="alert"
              className={cn(ui.card, "animate-fade-up border-accent-200 bg-accent-50 [animation-delay:.05s]")}
            >
              <div className="flex items-center gap-2.5 text-accent-700">
                <Alert />
                <h2 className="display m-0 text-[26px] leading-none">Ada buku terlambat</h2>
              </div>
              <p className="mt-3 mb-0 text-[15px] leading-relaxed text-accent-700">
                Denda berjalan <strong>{rupiah(totalFine)}</strong>. Setiap hari keterlambatan dikenai{" "}
                {rupiah(FINE_PER_DAY)} dan terus bertambah sampai bukunya dikembalikan ke meja sirkulasi.
              </p>
            </section>
          )}

          <section className={cn(ui.card, "animate-fade-up [animation-delay:.1s]")}>
            <div className="flex items-baseline justify-between gap-3 pb-1.5">
              <h2 className="display m-0 text-[28px] leading-none">Sedang dipinjam</h2>
              <span className="text-[13px] font-bold whitespace-nowrap text-muted">{active.length} buku</span>
            </div>
            {active.length === 0 && (
              <p className="m-0 border-t border-line-2 py-4 text-[15px] leading-relaxed text-ink-3">
                Belum ada buku yang sedang kamu pinjam. <Link href="/">Pilih satu dari katalog</Link>.
              </p>
            )}
            {active.map((l) => {
              const late = isLate(l);
              const days = overdueDays(l.due, today);
              const total = Math.max((l.due - l.start) / DAY, 1);
              const used = Math.min((today - l.start) / DAY, total);
              return (
                <article key={l.id} className="flex items-start gap-4 border-t border-line-2 py-4">
                  <MiniCover color={l.color} src={l.cover} />
                  <div className="flex min-w-0 flex-1 flex-col gap-[9px]">
                    <div>
                      <h3 className="m-0 text-base leading-snug font-bold">{l.title}</h3>
                      <p className="mt-0.5 mb-0 text-[13px] text-ink-3">{l.author}</p>
                    </div>
                    <span className="block h-2 overflow-hidden rounded-full bg-[#E1E6DF]" aria-hidden="true">
                      <span
                        className="block h-full rounded-full transition-[width] duration-700"
                        style={{
                          width: `${Math.round((used / total) * 100)}%`,
                          backgroundColor: late ? LATE_COLOR : l.color,
                        }}
                      />
                    </span>
                    <div className="flex flex-wrap justify-between gap-x-2.5 gap-y-1 text-[13px] text-ink-2">
                      <span>Kembali {formatDay(l.due)}</span>
                      {late ? (
                        <strong className="text-accent-700">Terlambat {days} hari</strong>
                      ) : (
                        <strong>{Math.round((l.due - today) / DAY)} hari lagi</strong>
                      )}
                    </div>
                    {late && (
                      <p className="m-0 rounded-[14px] bg-accent-50 px-3.5 py-2.5 text-[13px] leading-snug text-accent-700">
                        Denda <strong>{rupiah(fineFor(days))}</strong> ({days} hari × {rupiah(FINE_PER_DAY)}).
                        {l.returnRequested
                          ? "Denda berhenti dihitung saat pustakawan menerima bukunya."
                          : "Kembalikan ke meja sirkulasi untuk menghentikannya."}
                      </p>
                    )}
                    {l.returnRequested ? (
                      <p className="m-0 flex items-start gap-2 rounded-[14px] bg-secondary-100 px-3.5 py-2.5 text-[13px] leading-snug text-secondary-600">
                        <Clock size={18} className="mt-px shrink-0" />
                        <span>
                          <strong>Menunggu konfirmasi pustakawan.</strong> Serahkan bukunya ke meja sirkulasi; statusnya
                          berubah jadi dikembalikan setelah petugas menerimanya.
                        </span>
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setReturning(l)}
                        className={cn(ui.btn, ui.ghost, "min-h-11 self-start px-4 text-sm")}
                      >
                        <ReturnBook size={18} />
                        Kembalikan buku
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
            <p className="mt-2 mb-0 border-t border-line-2 pt-3 text-[13px] leading-relaxed text-ink-3">
              Keterlambatan dikenai denda {rupiah(FINE_PER_DAY)} per hari.
            </p>
          </section>

          {reserved && (
            <section className={cn(ui.card, "animate-fade-up border-accent-200 bg-accent-50 [animation-delay:.2s]")}>
              <span className={cn(ui.eyebrow, "text-accent-700")}>Terbooking</span>
              <div className="mt-3.5 flex items-start gap-4">
                <MiniCover color={reserved.color} src={reserved.cover} striped />
                <div className="flex flex-col gap-1.5">
                  <h3 className="m-0 text-base leading-snug font-bold">{reserved.title}</h3>
                  <p className="m-0 text-sm leading-relaxed text-accent-700">
                    Ambil di meja sirkulasi pada {formatDay(reserved.start)}
                    {reserved.pickupHour !== null && `, pukul ${formatHour(reserved.pickupHour)}`}. Masa pinjam{" "}
                    {Math.round((reserved.due - reserved.start) / DAY)} hari, dihitung mulai hari bukunya diserahkan
                    petugas. Kalau tidak diambil sampai akhir hari itu, booking batal otomatis.
                  </p>
                  <Link
                    href={`/buku/${reserved.slug}`}
                    className="inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-accent-700 hover:text-accent-700"
                  >
                    Lihat buku
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            </section>
          )}

          <section className={cn(ui.card, "animate-fade-up [animation-delay:.3s]")}>
            <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4">
              <span>
                <strong className="block text-[15px]">Ingatkan aku</strong>
                <span className="mt-0.5 block text-[13px] text-ink-3">Email dan WhatsApp ke kontak terdaftar, sehari sebelum jatuh tempo.</span>
              </span>
              <input type="checkbox" className="switch" checked={remind} onChange={toggleRemind} />
            </label>
          </section>
        </aside>
      </div>

      {returning && (
        <ReturnDialog
          loan={returning}
          today={today}
          onClose={() => setReturning(null)}
          onReturned={(result) => {
            setReturning(null);
            notify({
              kind: "ok",
              title: "Pengembalian diajukan",
              text: [
                `Serahkan “${result.title}” ke meja sirkulasi; statusnya berubah setelah pustakawan menerimanya.`,
                result.fine > 0 && `Denda sampai hari ini ${rupiah(result.fine)}.`,
                result.reviewed && "Ulasanmu sudah tampil di halaman buku.",
              ]
                .filter(Boolean)
                .join(" "),
              action: result.reviewed ? { href: `/buku/${result.slug}`, label: "Lihat ulasan" } : undefined,
            });
            startTransition(() => router.refresh());
          }}
        />
      )}
    </div>
  );
}

function AgendaSwatch({ event }: { event: ScheduleEvent }) {
  return (
    <span aria-hidden="true" className="inline-block size-3 shrink-0 rounded-[4px]" style={{ backgroundColor: event.color }} />
  );
}

function Swatch({ loan, late }: { loan: ScheduleLoan; late?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block h-2 w-[22px] shrink-0 rounded", loan.status === "reserved" && "striped")}
      style={{ backgroundColor: late ? LATE_COLOR : loan.color }}
    />
  );
}

/** Sampul kecil di kartu pinjaman: gambar sampul asli bila ada, kalau tidak warna sampulnya (bergaris = terbooking). */
function MiniCover({ color, src, striped }: { color: string; src?: string | null; striped?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="relative h-[74px] w-[52px] shrink-0 overflow-hidden rounded-[3px_8px_8px_3px] shadow-[0_10px_16px_-10px_rgba(29,43,40,.6)]"
      style={{
        backgroundColor: color,
        backgroundImage:
          striped && !src
            ? "linear-gradient(90deg,rgba(0,0,0,.25) 0,rgba(255,255,255,.15) 4px,rgba(0,0,0,0) 8px),repeating-linear-gradient(45deg,rgba(255,255,255,.4) 0 3px,rgba(0,0,0,0) 3px 8px)"
            : "linear-gradient(90deg,rgba(0,0,0,.25) 0,rgba(255,255,255,.15) 4px,rgba(0,0,0,0) 8px)",
      }}
    >
      {src && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- sampul kecil dari rute sendiri */}
          <img src={src} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
          <span className="spine-shade absolute inset-0" />
        </>
      )}
    </span>
  );
}
