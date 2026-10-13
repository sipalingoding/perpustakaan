"use client";

import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@/components/Avatar";
import { ArrowRight, Heart, Search } from "@/components/icons";
import { Podium } from "@/components/illustrations/Podium";
import { ui } from "@/components/ui";
import { spineHeight } from "@/lib/books";
import { cn } from "@/lib/cn";
import type { Member, Period, PeriodInfo } from "@/lib/members";

const RANK_BADGE = ["", "bg-[#EBCBAA]", "bg-secondary-200", "bg-[#C8D5C2]"];

function scrollToShelf() {
  document.getElementById("rak")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/** Papan baca anggota dan rak koleksi tiap anggota. */
export function MembersClient({
  members,
  periods,
  viewerId,
}: {
  members: Member[];
  periods: PeriodInfo[];
  viewerId: string;
}) {
  const [period, setPeriod] = useState<Period>("tahun");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [cheered, setCheered] = useState<Record<string, boolean>>({});
  const [round, setRound] = useState(0);
  const [shelfRound, setShelfRound] = useState(0);

  const periodInfo = periods.find((p) => p.key === period)!;
  const sorted = [...members].sort((a, b) => b.counts[period] - a.counts[period] || a.name.localeCompare(b.name, "id"));
  const max = Math.max(sorted[0].counts[period], 1);
  const rankOf = (m: Member) => 1 + members.filter((x) => x.counts[period] > m.counts[period]).length;

  const needle = query.trim().toLowerCase();
  const rows = sorted.filter((m) => !needle || m.name.toLowerCase().includes(needle));

  const self = members.find((m) => m.id === viewerId);
  const myCount = self?.counts[period] ?? 0;
  const ahead = sorted.filter((m) => m.counts[period] > myCount);
  const target = ahead[ahead.length - 1];
  const motivation = target
    ? `Kamu sudah meminjam ${myCount} buku ${periodInfo.phrase}. Pinjam ${target.counts[period] - myCount + 1} buku lagi untuk menyalip ${target.first}.`
    : `Kamu memimpin papan baca ${periodInfo.phrase}. Pertahankan, dan ajak anggota lain menyusul!`;

  const selected = members.find((m) => m.id === selectedId) ?? sorted[0];
  const selectedIsMe = selected.id === viewerId;
  const reading = selected.reading;
  const isCheered = !!cheered[selected.id];

  const openShelf = (id: string) => {
    setSelectedId(id);
    setShelfRound((r) => r + 1);
    scrollToShelf();
  };

  return (
    <div className={ui.wrap}>
      <section className="grid grid-cols-[repeat(auto-fit,minmax(min(440px,100%),1fr))] items-center gap-x-12 gap-y-6 pt-10 pb-7">
        <div className="flex animate-fade-up flex-col gap-[18px]">
          <h1 className="display m-0 text-[clamp(44px,5.6vw,76px)] leading-none">
            Rak para <span className="text-primary-500">anggota</span>.
          </h1>
          <p className="m-0 max-w-[44ch] text-lg leading-relaxed text-ink-3">
            Intip buku yang sedang dibaca anggota lain, temukan bacaan berikutnya dari rak mereka, dan saling
            menyemangati untuk membaca lebih banyak.
          </p>
          <div className="flex flex-wrap gap-2.5">
            <span className={ui.stat}>
              <strong>{members.length}</strong> anggota aktif
            </span>
            <span className={ui.stat}>
              <strong>{members.reduce((sum, m) => sum + m.counts.bulan, 0)}</strong> buku dipinjam bulan ini
            </span>
          </div>
        </div>
        <Podium className="block h-auto w-full animate-fade-up [animation-delay:.15s]" />
      </section>

      {self && (
        <section className="flex animate-fade-up flex-wrap items-center gap-x-6 gap-y-[18px] rounded-[26px] border border-accent-200 bg-accent-50 p-[26px] [animation-delay:.2s]">
          <span className="size-16 shrink-0 overflow-hidden rounded-full shadow-[0_0_0_3px_var(--color-accent-50),0_0_0_4.5px_#D9B898]">
            <Avatar look={self.look} className="block size-full" />
          </span>
          <div aria-live="polite" className="flex min-w-0 flex-[1_1_320px] flex-col gap-1">
            <span className="text-xs font-bold tracking-[0.22em] text-accent-700 uppercase">
              Posisimu · {periodInfo.label}
            </span>
            <p className="display m-0 text-[28px] leading-tight">
              Peringkat #{rankOf(self)} dari {members.length} anggota
            </p>
            <p className="m-0 text-[15px] leading-relaxed text-accent-700">{motivation}</p>
          </div>
          <Link href="/" className={cn(ui.btn, ui.primary)}>
            Cari buku berikutnya
            <ArrowRight />
          </Link>
        </section>
      )}

      <section className="mt-14 flex flex-col gap-[18px]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <h2 className="display m-0 text-[42px] leading-none">Papan baca</h2>
            <p className="m-0 text-[15px] text-ink-3">
              Anggota dengan buku terbanyak, {periodInfo.phrase}. Pilih “Lihat rak” untuk melihat koleksinya.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex flex-wrap gap-1 rounded-full bg-[#DFE6DD] p-1">
              {periods.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  aria-pressed={p.key === period}
                  onClick={() => {
                    setPeriod(p.key);
                    setRound((r) => r + 1);
                  }}
                  className="min-h-11 cursor-pointer rounded-full border-0 bg-transparent px-[18px] text-sm font-semibold text-ink-2 transition-colors hover:bg-[#D2DCD2] aria-pressed:bg-ink aria-pressed:text-cream aria-pressed:hover:bg-ink"
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="flex min-h-[52px] min-w-0 flex-[0_1_300px] items-center gap-2.5 rounded-full border-[1.5px] border-line bg-white px-4 transition focus-within:border-primary-600 focus-within:shadow-[0_0_0_4px_rgba(46,90,82,.14)]">
              <Search size={18} className="shrink-0 text-ink-3" />
              <label className="sr-only" htmlFor="cari-anggota">
                Cari anggota
              </label>
              <input
                id="cari-anggota"
                type="search"
                placeholder="Cari anggota"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="min-h-11 min-w-0 flex-1 border-0 bg-transparent text-[15px] text-ink outline-none"
              />
            </div>
          </div>
        </div>

        <div className="relative overflow-x-auto rounded-3xl border border-line bg-paper">
          <table className="w-full min-w-[940px] border-collapse text-left">
            <caption className="sr-only">
              Peringkat anggota berdasarkan jumlah buku yang dibaca, {periodInfo.title}
            </caption>
            <thead>
              <tr className="text-xs font-bold tracking-[0.08em] text-muted uppercase">
                <th scope="col" className="w-[84px] py-[18px] pr-2 pl-[22px] font-bold">
                  #
                </th>
                <th scope="col" className="px-2 font-bold">
                  Anggota
                </th>
                <th scope="col" className="w-[26%] px-2 font-bold">
                  Buku dibaca
                </th>
                <th scope="col" className="w-[130px] px-2 font-bold">
                  Favorit
                </th>
                <th scope="col" className="px-2 font-bold">
                  Sedang membaca
                </th>
                <th scope="col" className="w-[140px] pr-[22px] pl-2">
                  <span className="sr-only">Rak</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m, i) => {
                const rank = rankOf(m);
                const count = m.counts[period];
                const isMe = m.id === viewerId;
                const isSelected = m.id === selected.id;
                const book = m.reading;
                return (
                  <tr
                    key={`${m.id}-${round}`}
                    className={cn(
                      "animate-row-in border-t border-line-2 transition-colors hover:bg-primary-50",
                      isMe && "bg-primary-50",
                      isSelected && "bg-accent-50 hover:bg-accent-50",
                    )}
                    style={{ animationDelay: `${i * 45}ms` }}
                  >
                    <td className="py-3 pr-2 pl-[22px]">
                      <span
                        className={cn(
                          "inline-flex size-[38px] items-center justify-center rounded-full text-[15px] font-extrabold tabular-nums",
                          count > 0 && RANK_BADGE[rank],
                        )}
                      >
                        {rank}
                      </span>
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="size-11 shrink-0 overflow-hidden rounded-full">
                          <Avatar look={m.look} className="block size-full" />
                        </span>
                        <span className="min-w-0">
                          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] font-bold">
                            {m.name}
                            {isMe && (
                              <span className="inline-flex rounded-full bg-ink px-[9px] py-0.5 text-[11px] font-bold tracking-[0.04em] text-cream">
                                Kamu
                              </span>
                            )}
                          </span>
                          <span className="mt-0.5 block text-[13px] text-ink-3">Anggota sejak {m.since}</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-3.5">
                        <span className="min-w-[30px] text-[19px] font-extrabold text-ink tabular-nums">{count}</span>
                        <span className="block h-2.5 flex-1" aria-hidden="true">
                          <span
                            className="block h-full rounded-r-[5px] bg-primary-500 transition-[width] duration-700"
                            style={{ width: `${Math.round((count / max) * 100)}%` }}
                            title={`${m.first}: ${count} buku ${periodInfo.phrase}`}
                          />
                        </span>
                      </div>
                    </td>
                    <td className="px-2 py-3">
                      <span className="inline-flex min-h-7 items-center rounded-full bg-tint px-3 text-[13px] font-semibold text-ink-2">
                        {m.fav ?? "Belum dipilih"}
                      </span>
                    </td>
                    <td className="px-2 py-3">
                      <span className="flex min-w-0 items-center gap-2.5 text-sm text-ink-2">
                        {book ? (
                          <>
                            <span
                              aria-hidden="true"
                              className="h-7 w-2.5 shrink-0 rounded-sm"
                              style={{ backgroundColor: book.bg }}
                            />
                            {book.title}
                          </>
                        ) : (
                          <span className="text-muted">Belum memilih</span>
                        )}
                      </span>
                    </td>
                    <td className="py-3 pr-[22px] pl-2">
                      <button
                        type="button"
                        aria-pressed={isSelected}
                        aria-label={`Lihat rak ${m.first}`}
                        onClick={() => openShelf(m.id)}
                        className="min-h-11 cursor-pointer rounded-full border-[1.5px] border-field bg-transparent px-4 text-[13px] font-bold text-ink transition-colors hover:bg-tint aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-cream aria-pressed:hover:bg-ink"
                      >
                        Lihat rak
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length === 0 && (
            <p className="m-0 border-t border-line-2 px-[22px] py-7 text-[15px] text-ink-3">
              Tidak ada anggota dengan nama itu.
            </p>
          )}
        </div>
        <p className="m-0 text-[13px] text-ink-3">
          Dihitung dari buku yang dipinjam dengan kartu anggota. Peringkat yang sama berarti jumlah bukunya sama.
        </p>
      </section>

      <section id="rak" className="mt-14 scroll-mt-6 overflow-hidden rounded-[26px] border border-line bg-paper">
        <div className="flex flex-wrap items-center gap-x-7 gap-y-6 p-[30px]">
          <span
            key={`avatar-${selected.id}`}
            className="size-[104px] shrink-0 animate-pop overflow-hidden rounded-full shadow-[0_0_0_4px_var(--color-paper),0_0_0_5.5px_var(--color-primary-300)]"
          >
            <Avatar look={selected.look} className="block size-full" />
          </span>
          <div aria-live="polite" className="flex min-w-0 flex-[1_1_340px] flex-col gap-2">
            <span className={ui.eyebrow}>{selectedIsMe ? "Rak kamu" : `Rak ${selected.first}`}</span>
            <h2 className="display m-0 text-[38px] leading-[1.05]">{selected.name}</h2>
            <p className="m-0 max-w-[56ch] text-[15px] leading-relaxed text-ink-3">
              {selected.bio ||
                (selectedIsMe
                  ? "Kamu belum menulis tentang dirimu. Isi di halaman Profil."
                  : `${selected.first} belum menulis tentang dirinya.`)}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              <span className={ui.stat}>
                <strong>{selected.counts.tahun}</strong> buku tahun ini
              </span>
              <span className={ui.stat}>
                <strong>{selected.counts.semua}</strong> sepanjang waktu
              </span>
              {selected.fav && (
                <span className={ui.stat}>
                  Favorit <strong>{selected.fav}</strong>
                </span>
              )}
            </div>
          </div>
          <div className="flex min-w-0 flex-[0_1_280px] flex-col gap-3">
            <div className="flex items-center gap-3 rounded-[18px] bg-tint-2 px-4 py-3.5">
              {reading && (
                <span
                  aria-hidden="true"
                  className="h-[52px] w-9 shrink-0 rounded-[2px_6px_6px_2px] shadow-[inset_4px_0_0_rgba(0,0,0,.15)]"
                  style={{ backgroundColor: reading.bg }}
                />
              )}
              <span className="min-w-0">
                <span className="block text-xs font-bold tracking-[0.08em] text-muted uppercase">Sedang membaca</span>
                <span className="mt-0.5 block text-[15px] font-bold">
                  {reading ? reading.title : "Belum memilih buku"}
                </span>
              </span>
            </div>
            {selectedIsMe ? (
              <Link href="/profil" className={cn(ui.btn, ui.ghost)}>
                Buka profilku
              </Link>
            ) : (
              <button
                type="button"
                aria-pressed={isCheered}
                onClick={() => setCheered((c) => ({ ...c, [selected.id]: !c[selected.id] }))}
                className={cn(
                  ui.btn,
                  "border-[1.5px]",
                  isCheered ? "border-accent-200 bg-accent-50 text-accent-700" : "border-primary-600 bg-primary-600 text-cream",
                )}
              >
                <Heart filled={isCheered} />
                {isCheered ? `Semangat terkirim ke ${selected.first}` : "Kirim semangat"}
              </button>
            )}
          </div>
        </div>
        <div className="bg-primary-100 px-[clamp(16px,3vw,36px)] pt-2.5 pb-7">
          <div
            className="flex min-h-[330px] items-end gap-2 overflow-x-auto px-1.5 pt-11"
            aria-label={`Koleksi buku ${selectedIsMe ? "kamu" : selected.first}`}
          >
            {selected.books.map((b, i) => (
              <Link
                key={`${b.slug}-${shelfRound}`}
                href={`/buku/${b.slug}`}
                className="spine animate-spine-in"
                style={{
                  height: spineHeight(b.title, i),
                  backgroundColor: b.bg,
                  color: b.ink,
                  animationDelay: `${i * 70}ms`,
                }}
                aria-label={b.title}
              >
                <span className="spine-title" aria-hidden="true">
                  {b.title}
                </span>
              </Link>
            ))}
            {selected.books.length === 0 && (
              <p className="m-0 self-center px-2 text-[15px] text-ink-3">
                {selectedIsMe
                  ? "Rakmu masih kosong. Buku yang kamu pinjam akan berbaris di sini."
                  : `Rak ${selected.first} masih kosong.`}
              </p>
            )}
          </div>
          <div className="h-4 rounded bg-wood shadow-[0_6px_0_var(--color-wood-dark),0_24px_30px_-18px_rgba(29,43,40,.5)]" />
        </div>
      </section>
    </div>
  );
}
