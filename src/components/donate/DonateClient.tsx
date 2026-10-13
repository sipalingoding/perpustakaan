"use client";

import Link from "next/link";
import { useState, useTransition, type ReactNode } from "react";
import { createDonation, searchDonationBooks } from "@/app/sumbang/actions";
import { DateChip } from "@/components/DateChip";
import { HourPicker, hoursForDate } from "@/components/HourPicker";
import { Alert, ArrowLeft, ArrowRight, Check, Clipboard, Heart, OpenBook, Parcel, Shelf, Spinner } from "@/components/icons";
import { DonationScene } from "@/components/illustrations/DonationScene";
import { ShelfSuccess } from "@/components/illustrations/ShelfSuccess";
import { SourceSearch } from "@/components/SourceSearch";
import { ui } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatHour, LIBRARY, VISIT_HOURS } from "@/lib/library";
import { BULAN, formatLong } from "@/lib/dates";
import type { SourceBook } from "@/lib/server/book-sources";
import type { DonationSchedule } from "@/lib/server/donations";

const COVERS = {
  Fiksi: ["#4F6F66", "#F3F1E7"],
  Sains: ["#5C7395", "#F6F4EC"],
  Sejarah: ["#B9C7B0", "#23332D"],
  Puisi: ["#74678F", "#FBF7EF"],
  Anak: ["#E3BE9C", "#3A2E26"],
  Lainnya: ["#C9D3D9", "#22323A"],
} as const;
type DonationCategory = keyof typeof COVERS;

const CONDITIONS = [
  { key: "baru", title: "Baru", desc: "Masih bersegel atau belum pernah dibaca." },
  { key: "sangat", title: "Sangat baik", desc: "Seperti baru, tanpa coretan atau lipatan." },
  { key: "baik", title: "Baik", desc: "Ada tanda pernah dibaca, halaman lengkap." },
] as const;
const METHODS = [
  { key: "antar", title: "Antar ke meja sirkulasi", desc: `Bawa bukunya pada jam layanan, ${LIBRARY.hours}.` },
  { key: "jemput", title: "Dijemput petugas", desc: "Petugas datang ke alamatmu di area [AREA LAYANAN]." },
] as const;
/** "Oktober 2026", atau "Oktober–November 2026" bila pilihan tanggal melewati akhir bulan. */
function monthLabel(times: number[]) {
  const first = new Date(times[0]);
  const last = new Date(times[times.length - 1]);
  const a = BULAN[first.getUTCMonth()];
  const b = BULAN[last.getUTCMonth()];
  return a === b ? `${a} ${last.getUTCFullYear()}` : `${a}–${b} ${last.getUTCFullYear()}`;
}


const STEPS = ["Data buku", "Pengiriman", "Periksa & kirim"];
const NOTE_MAX = 120;

type Form = {
  title: string;
  author: string;
  category: DonationCategory;
  condition: (typeof CONDITIONS)[number]["key"];
  qty: number;
  note: string;
  method: (typeof METHODS)[number]["key"];
  address: string;
  date: number;
  /** Jam antar/jemput, awal slot satu jam. */
  hour: number;
  showName: boolean;
};
const BLANK: Form = {
  title: "",
  author: "",
  category: "Fiksi",
  condition: "sangat",
  qty: 1,
  note: "",
  method: "antar",
  address: "",
  date: 0,
  hour: VISIT_HOURS[0],
  showName: true,
};

/** Formulir sumbang buku 3 langkah dengan pratinjau sampul dan plakat ex libris. */
export function DonateClient({
  donor,
  schedule,
}: {
  donor: string;
  schedule: DonationSchedule;
}) {
  const { dates, todayFirstHour } = schedule;
  /** Jam yang bisa dipilih untuk tanggal ke-i: hari ini hanya jam yang belum lewat. */
  const hoursFor = (i: number) => hoursForDate(i, todayFirstHour);
  const first = donor;
  const DATES = dates.map((d) => Date.parse(d));
  const [pending, startTransition] = useTransition();
  const [code, setCode] = useState("");
  const [step, setStep] = useState(1);
  const [maxStep, setMaxStep] = useState(1);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [peek, setPeek] = useState(false);
  const [form, setForm] = useState<Form>(() => ({ ...BLANK, hour: hoursFor(0)[0] }));
  // Sampul dari hasil pencarian, hanya untuk pratinjau. Hilang bila judul diubah manual (bisa jadi buku lain).
  const [pickedCover, setPickedCover] = useState<string | null>(null);
  // Data lengkap dari pencarian (ISBN, tahun, sampul besar, …), ikut disimpan supaya buku masuk koleksi dengan rapi.
  const [source, setSource] = useState<SourceBook | null>(null);

  const patch = (p: Partial<Form>) => {
    setForm((f) => ({ ...f, ...p }));
    setError("");
  };
  const goStep = (n: number) => {
    setStep(n);
    setMaxStep((m) => Math.max(m, n));
    setError("");
    if (n === 3) setPeek(true);
  };
  const restart = (p: Partial<Form> = {}) => {
    setStep(1);
    setMaxStep(1);
    setDone(false);
    setError("");
    setPeek(false);
    setForm({ ...BLANK, hour: hoursFor(0)[0], ...p });
    setPickedCover(null);
    setSource(null);
  };

  const pickSource = (r: SourceBook) => {
    patch({ title: r.title.slice(0, 120), author: r.author ? r.author.slice(0, 80) : form.author });
    // Sampul kecil sudah termuat di daftar hasil dan cukup tajam untuk pratinjau; yang besar lambat dari archive.org.
    setPickedCover(r.thumb ?? r.cover);
    setSource(r);
  };

  const next1 = () => {
    if (!form.title.trim() || !form.author.trim()) return setError("Isi judul dan penulis dulu, ya.");
    goStep(2);
  };
  const next2 = () => {
    if (form.method === "jemput" && !form.address.trim()) {
      return setError("Tulis alamat penjemputan supaya petugas tahu harus ke mana.");
    }
    goStep(3);
  };
  const submit = () =>
    startTransition(async () => {
      const result = await createDonation({
        title: form.title,
        author: form.author,
        category: form.category,
        condition: form.condition,
        qty: form.qty,
        note: form.note,
        method: form.method,
        address: form.address,
        scheduledOn: dates[form.date],
        scheduledHour: form.hour,
        source: source && {
          isbn: source.isbn,
          publisher: source.publisher,
          year: source.year,
          pages: source.pages,
          language: source.language,
          coverUrl: source.cover,
          sourceRef: source.source === "openlibrary" ? source.ref : null,
        },
        showName: form.showName,
      });
      if (!result.ok) return setError(result.error);
      setCode(result.code);
      setDone(true);
      setPeek(true);
    });

  const [coverBg, coverInk] = COVERS[form.category];
  const dateT = DATES[form.date];
  const condition = CONDITIONS.find((c) => c.key === form.condition)!;
  const method = METHODS.find((m) => m.key === form.method)!;

  return (
    <div className={ui.wrap}>
      <section className="grid grid-cols-[repeat(auto-fit,minmax(min(440px,100%),1fr))] items-center gap-x-12 gap-y-6 pt-10 pb-8">
        <div className="flex animate-fade-up flex-col gap-[18px]">
          <span className={ui.eyebrow}>Sumbang buku</span>
          <h1 className="display m-0 text-[clamp(42px,5.4vw,72px)] leading-[1.02]">
            Satu buku darimu, banyak cerita untuk <span className="text-primary-500">yang lain</span>.
          </h1>
          <p className="m-0 max-w-[46ch] text-lg leading-relaxed text-ink-3">
            Punya buku yang sudah selesai kamu baca? Sumbangkan ke Lembar supaya rak kita makin penuh dan anggota lain bisa
            ikut menikmatinya. Namamu akan tercatat di plakat ex libris di sampul dalam buku itu.
          </p>
          <div className="flex flex-wrap gap-2.5">
            <a href="#formulir" className={cn(ui.btn, ui.primary)}>
              Mulai menyumbang
              <ArrowRight />
            </a>
          </div>
        </div>
        <DonationScene className="block h-auto w-full animate-fade-up [animation-delay:.15s]" />
      </section>

      <section aria-labelledby="cara-h" className="flex flex-col gap-[18px]">
        <h2 id="cara-h" className="display m-0 text-[32px] leading-none">
          Cara menyumbang
        </h2>
        <div className="flex flex-wrap gap-4">
          <HowStep n={1} icon={<Clipboard />} title="Isi formulir" delay=".05s">
            Ceritakan judul, penulis, dan kondisi bukunya. Kamu juga bisa menulis catatan singkat untuk pembaca berikutnya.
          </HowStep>
          <HowStep n={2} icon={<Parcel />} title="Antar atau dijemput" delay=".15s">
            Bawa bukunya ke meja sirkulasi pada tanggal yang kamu pilih, atau minta petugas menjemputnya.
          </HowStep>
          <HowStep n={3} icon={<Shelf />} title="Masuk ke rak" delay=".25s">
            Setelah diperiksa, buku diberi plakat ex libris bernama kamu dan siap dipinjam anggota lain.
          </HowStep>
        </div>
      </section>

      <div id="formulir" className="mt-14 flex scroll-mt-6 flex-wrap items-start gap-6">
        <section aria-labelledby="form-h" className={cn(ui.card, "flex min-w-0 flex-[999_1_560px] flex-col gap-5")}>
          <div className="flex flex-col gap-3.5">
            <h2 id="form-h" className="display m-0 text-[32px] leading-none">
              Formulir sumbangan
            </h2>
            <ol aria-label="Langkah formulir" className="m-0 flex list-none flex-wrap gap-2 p-0">
              {STEPS.map((label, i) => {
                const n = i + 1;
                const current = !done && step === n;
                const visited = done || n <= maxStep;
                return (
                  <li key={label}>
                    <button
                      type="button"
                      disabled={done || n > maxStep}
                      aria-current={current ? "step" : undefined}
                      onClick={() => goStep(n)}
                      className={cn(
                        "inline-flex min-h-11 cursor-pointer items-center gap-2.5 rounded-full border-0 py-0 pr-4 pl-1.5 text-sm font-semibold transition-colors disabled:cursor-default",
                        current ? "bg-ink text-cream" : visited ? "bg-[#D3E2D6] text-ink" : "bg-ground-2 text-muted",
                      )}
                    >
                      <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-paper text-[13px] font-extrabold text-ink">
                        {visited && !current ? <Check size={16} /> : n}
                      </span>
                      {label}
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>

          {!done && step === 1 && (
            <div className="flex origin-left animate-turn-in flex-col gap-5">
              <SourceSearch
                search={searchDonationBooks}
                onPick={pickSource}
                initialVisible={6}
                heading="Cari bukumu di Open Library"
                description="Ketik judul atau ISBN-nya, lalu pilih hasilnya untuk mengisi judul dan penulis. Tidak ketemu? Isi manual di bawah."
              />
              <div className="grid grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-4">
                <Field id="s-judul" label="Judul buku">
                  <input
                    id="s-judul"
                    className={ui.field}
                    placeholder="Contoh: Kebun di Ujung Hujan"
                    value={form.title}
                    onChange={(e) => {
                      patch({ title: e.target.value });
                      setPickedCover(null);
                      setSource(null);
                    }}
                  />
                </Field>
                <Field id="s-penulis" label="Penulis">
                  <input
                    id="s-penulis"
                    className={ui.field}
                    placeholder="Nama penulis"
                    value={form.author}
                    onChange={(e) => patch({ author: e.target.value })}
                  />
                </Field>
              </div>
              <div className="flex flex-col gap-2.5">
                <span className={ui.label}>Kategori</span>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(COVERS) as DonationCategory[]).map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={ui.chip}
                      aria-pressed={c === form.category}
                      onClick={() => patch({ category: c })}
                    >
                      <span
                        aria-hidden="true"
                        className="size-3 rounded-[3px] shadow-[0_0_0_1.5px_var(--color-paper)]"
                        style={{ backgroundColor: COVERS[c][0] }}
                      />
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2.5">
                <span className={ui.label}>Kondisi buku</span>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(min(190px,100%),1fr))] gap-2.5">
                  {CONDITIONS.map((c) => (
                    <OptionCard
                      key={c.key}
                      title={c.title}
                      desc={c.desc}
                      selected={c.key === form.condition}
                      onSelect={() => patch({ condition: c.key })}
                    />
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className={ui.label}>Jumlah eksemplar</span>
                <button
                  type="button"
                  className={ui.stepper}
                  aria-label="Kurangi jumlah"
                  disabled={form.qty <= 1}
                  onClick={() => patch({ qty: Math.max(1, form.qty - 1) })}
                >
                  −
                </button>
                <span aria-live="polite" className="min-w-7 text-center text-lg font-extrabold">
                  {form.qty}
                </span>
                <button
                  type="button"
                  className={ui.stepper}
                  aria-label="Tambah jumlah"
                  disabled={form.qty >= 20}
                  onClick={() => patch({ qty: Math.min(20, form.qty + 1) })}
                >
                  +
                </button>
              </div>
              <Field
                id="s-catatan"
                label={
                  <>
                    Catatan untuk pembaca berikutnya <span className="font-medium text-ink-3">(opsional)</span>
                  </>
                }
                hint={`Dicetak di plakat ex libris. ${NOTE_MAX - form.note.length} karakter tersisa.`}
              >
                <textarea
                  id="s-catatan"
                  maxLength={NOTE_MAX}
                  className={cn(ui.field, "min-h-[92px] resize-y py-3.5 leading-normal")}
                  placeholder="Contoh: Semoga buku ini menemanimu di hari hujan."
                  value={form.note}
                  onChange={(e) => patch({ note: e.target.value })}
                />
              </Field>
              <ErrorNote message={error} />
              <div className="flex justify-end">
                <button type="button" className={cn(ui.btn, ui.primary)} onClick={next1}>
                  Lanjut ke pengiriman
                  <ArrowRight />
                </button>
              </div>
            </div>
          )}

          {!done && step === 2 && (
            <div className="flex origin-left animate-turn-in flex-col gap-5">
              <div className="flex flex-col gap-2.5">
                <span className={ui.label}>Cara pengiriman</span>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-2.5">
                  {METHODS.map((m) => (
                    <OptionCard
                      key={m.key}
                      title={m.title}
                      desc={m.desc}
                      selected={m.key === form.method}
                      onSelect={() => patch({ method: m.key })}
                    />
                  ))}
                </div>
              </div>
              {form.method === "jemput" && (
                <div className="animate-pop">
                  <Field id="s-alamat" label="Alamat penjemputan">
                    <textarea
                      id="s-alamat"
                      className={cn(ui.field, "min-h-[92px] resize-y py-3.5 leading-normal")}
                      placeholder="Nama jalan, nomor rumah, RT/RW, kelurahan"
                      value={form.address}
                      onChange={(e) => patch({ address: e.target.value })}
                    />
                  </Field>
                </div>
              )}
              <div className="flex flex-col gap-2.5">
                <span className={ui.label}>
                  {form.method === "jemput" ? "Tanggal penjemputan" : "Tanggal mengantar"} · {monthLabel(DATES)}
                </span>
                <div className="flex flex-wrap gap-2">
                  {DATES.map((t, i) => (
                    <DateChip
                      key={t}
                      time={t}
                      selected={i === form.date}
                      // Jam yang dipilih tetap, kecuali sudah lewat di tanggal baru (mis. pindah ke hari ini).
                      onSelect={() => patch({ date: i, hour: hoursFor(i).includes(form.hour) ? form.hour : hoursFor(i)[0] })}
                    />
                  ))}
                </div>
              </div>
              <HourPicker
                label={form.method === "jemput" ? "Jam penjemputan" : "Jam mengantar"}
                available={hoursFor(form.date)}
                value={form.hour}
                onChange={(h) => patch({ hour: h })}
              />
              <ErrorNote message={error} />
              <div className="flex flex-wrap justify-between gap-2.5">
                <button type="button" className={cn(ui.btn, ui.ghost)} onClick={() => goStep(1)}>
                  <ArrowLeft />
                  Kembali
                </button>
                <button type="button" className={cn(ui.btn, ui.primary)} onClick={next2}>
                  Periksa sumbangan
                  <ArrowRight />
                </button>
              </div>
            </div>
          )}

          {!done && step === 3 && (
            <div className="flex origin-left animate-turn-in flex-col gap-5">
              <dl className="m-0 grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-px overflow-hidden rounded-[18px] border border-line bg-line">
                {[
                  ["Buku", form.title],
                  ["Penulis", form.author],
                  ["Kategori · kondisi", `${form.category} · ${condition.title}`],
                  ["Jumlah", `${form.qty} eksemplar`],
                  [
                    "Pengiriman",
                    form.method === "jemput" && form.address.trim() ? `${method.title}, ${form.address.trim()}` : method.title,
                  ],
                  ["Tanggal & jam", `${formatLong(dateT)}, pukul ${formatHour(form.hour)}`],
                ].map(([label, value]) => (
                  <div key={label} className="bg-[#F4F6F1] px-4 py-3">
                    <dt className="text-xs font-semibold text-muted">{label}</dt>
                    <dd className="mt-[3px] mb-0 text-[15px] font-bold [overflow-wrap:anywhere] text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
              <label className="flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-2xl bg-tint-2 px-4 py-3">
                <span>
                  <strong className="block text-[15px]">Tampilkan namaku di plakat ex libris</strong>
                  <span className="mt-0.5 block text-[13px] text-ink-3">
                    Kalau dimatikan, plakat hanya menulis “anggota Lembar”.
                  </span>
                </span>
                <input
                  type="checkbox"
                  className="switch"
                  checked={form.showName}
                  onChange={() => patch({ showName: !form.showName })}
                />
              </label>
              <div className="flex flex-wrap justify-between gap-2.5">
                <button type="button" className={cn(ui.btn, ui.ghost)} onClick={() => goStep(2)}>
                  <ArrowLeft />
                  Ubah pengiriman
                </button>
                <button type="button" className={cn(ui.btn, ui.primary)} onClick={submit} disabled={pending} aria-busy={pending}>
                  {pending ? <Spinner /> : <Heart />}
                  Kirim sumbangan
                </button>
              </div>
            </div>
          )}

          {done && (
            <div role="status" className="flex origin-left animate-turn-in flex-col items-center gap-3.5 pt-3 pb-1.5 text-center">
              <ShelfSuccess coverBg={coverBg} coverInk={coverInk} className="h-[150px] w-[260px]" />
              <h3 className="display m-0 text-[30px] leading-tight">Terima kasih, {first}!</h3>
              <p className="m-0 max-w-[48ch] text-base leading-relaxed text-ink-2">
                Sumbangan <strong>{form.title}</strong> sudah tercatat dengan kode <strong>{code}</strong>.{" "}
                {form.method === "jemput"
                  ? `Petugas akan menjemputnya pada ${formatLong(dateT)}, pukul ${formatHour(form.hour)}.`
                  : `Bawa bukunya ke meja sirkulasi pada ${formatLong(dateT)}, pukul ${formatHour(form.hour)}, dan sebutkan kode itu.`}
              </p>
              <div className="mt-1 flex flex-wrap justify-center gap-2.5">
                <button type="button" className={cn(ui.btn, ui.primary)} onClick={() => restart()}>
                  Sumbang buku lain
                </button>
                <Link href="/" className={cn(ui.btn, ui.ghost)}>
                  Kembali ke katalog
                </Link>
              </div>
            </div>
          )}
        </section>

        <aside aria-labelledby="pv-h" className={cn(ui.card, "flex min-w-0 flex-[1_1_420px] flex-col gap-4")}>
          <div>
            <span className={ui.eyebrow}>Pratinjau</span>
            <h2 id="pv-h" className="display mt-1.5 mb-0 text-[26px] leading-tight">
              Begini bukumu nanti di rak
            </h2>
          </div>
          <div className="flex justify-center overflow-hidden rounded-[22px] bg-primary-100 px-3 pt-[30px] pb-[26px]">
            <div className="reader aspect-[44/30] w-[min(440px,100%)]" data-open={peek}>
              <div className="page-block" aria-hidden="true" />
              <div className="page page-r gutter-r flex items-center justify-center p-[4cqw]">
                <div className="flex w-[88%] flex-col items-center gap-[1.4cqw] rounded-lg border-[1.5px] border-primary-400 bg-white px-[3cqw] py-[4cqw] text-center shadow-[0_0_0_4px_#fff,0_0_0_5.5px_var(--color-primary-400)]">
                  <span className="text-[2.4cqw] font-bold tracking-[0.28em] text-primary-500 uppercase">Ex libris</span>
                  <span className="display text-[3.8cqw] text-ink">Perpustakaan Lembar</span>
                  <span className="text-[2.8cqw] text-ink-2">
                    {form.showName ? `Disumbangkan oleh ${first}` : "Disumbangkan oleh anggota Lembar"}
                  </span>
                  {form.note.trim() && (
                    <p className="m-0 text-[2.7cqw] leading-[1.45] [overflow-wrap:anywhere] text-ink-3">
                      “{form.note.trim()}”
                    </p>
                  )}
                </div>
              </div>
              <div className="cover" aria-hidden="true">
                <div
                  className="face front spine-shade flex flex-col gap-[2.2cqw] pt-[6cqw] pr-[5cqw] pb-[5cqw] pl-[7cqw] transition-colors duration-500"
                  style={{ backgroundColor: coverBg, color: coverInk }}
                >
                  <span className="text-[2.6cqw] font-bold tracking-[0.2em] uppercase">{form.category}</span>
                  <span className="display text-[5.4cqw] leading-[1.08] [overflow-wrap:anywhere]">
                    {form.title.trim() || "Judul bukumu"}
                  </span>
                  <OpenBook className="mt-[1cqw] h-auto w-[40%] opacity-85" />
                  <span className="mt-auto text-[3cqw] font-semibold">{form.author.trim() || "Nama penulis"}</span>
                  {pickedCover && (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element -- pratinjau dari katalog publik, tidak disimpan */}
                      <img
                        key={pickedCover}
                        src={pickedCover}
                        alt=""
                        onError={() => setPickedCover(null)}
                        className="absolute inset-0 size-full rounded-[inherit] object-cover"
                      />
                      <span className="spine-shade absolute inset-0 rounded-[inherit]" />
                    </>
                  )}
                </div>
                <div className="face back endpaper" />
              </div>
            </div>
          </div>
          <button type="button" className={cn(ui.btn, ui.ghost)} aria-pressed={peek} onClick={() => setPeek((p) => !p)}>
            <OpenBook />
            {peek ? "Tutup buku" : "Intip plakat ex libris"}
          </button>
          <p className="m-0 text-[13px] leading-relaxed text-ink-3">
            Plakat ex libris ditempel di sampul dalam setiap buku sumbangan, jadi pembaca berikutnya tahu buku ini datang dari
            siapa.
          </p>
        </aside>
      </div>
    </div>
  );
}

function HowStep({ n, icon, title, delay, children }: { n: number; icon: ReactNode; title: string; delay: string; children: ReactNode }) {
  return (
    <div
      className="flex min-w-0 flex-[1_1_260px] animate-fade-up flex-col gap-3 rounded-3xl border border-line bg-paper p-6"
      style={{ animationDelay: delay }}
    >
      <span className="inline-flex size-[52px] items-center justify-center rounded-2xl bg-primary-100 text-primary-700">{icon}</span>
      <span className={ui.eyebrow}>Langkah {n}</span>
      <h3 className="m-0 text-[19px] font-bold">{title}</h3>
      <p className="m-0 text-[15px] leading-relaxed text-ink-3">{children}</p>
    </div>
  );
}

function Field({ id, label, hint, children }: { id: string; label: ReactNode; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label className={ui.label} htmlFor={id}>
        {label}
      </label>
      {children}
      {hint && <span className="text-[13px] text-ink-3">{hint}</span>}
    </div>
  );
}

function OptionCard({
  title,
  desc,
  selected,
  onSelect,
}: {
  title: string;
  desc: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className="group flex min-h-16 w-full cursor-pointer items-start gap-3 rounded-[18px] border-[1.5px] border-field bg-transparent px-4 py-3.5 text-left text-ink transition hover:border-primary-400 hover:bg-primary-50 aria-pressed:border-ink aria-pressed:bg-tint-2 aria-pressed:shadow-[inset_0_0_0_1px_var(--color-ink)]"
    >
      <span
        aria-hidden="true"
        className="relative mt-px size-5 shrink-0 rounded-full border-2 border-primary-400 group-aria-pressed:border-ink after:absolute after:inset-[3px] after:rounded-full after:bg-ink after:opacity-0 after:content-[''] group-aria-pressed:after:opacity-100"
      />
      <span>
        <span className="block text-[15px] font-bold">{title}</span>
        <span className="mt-[3px] block text-[13px] leading-normal text-ink-3">{desc}</span>
      </span>
    </button>
  );
}

function ErrorNote({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="m-0 flex animate-pop items-center gap-2 rounded-xl bg-[#F6E3DA] px-3.5 py-2.5 text-sm font-semibold text-[#7A3B26]">
      <Alert />
      {message}
    </p>
  );
}


