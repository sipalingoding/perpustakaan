"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { joinEvent, leaveEvent } from "@/app/agenda/actions";
import { PhotoGallery } from "@/components/agenda/PhotoGallery";
import { ArrowRight, Check, Clock, MapPin, People, Spinner } from "@/components/icons";
import { AgendaEmblem } from "@/components/illustrations/AgendaEmblem";
import { ui } from "@/components/ui";
import { AGENDA, AGENDA_KINDS, PARTNER, type AgendaKind } from "@/lib/agenda";
import { cn } from "@/lib/cn";
import { BULAN, formatDay, HARI } from "@/lib/dates";
import type { AgendaEventView, AgendaPhoto } from "@/lib/server/agenda";
import { useToast } from "@/components/Toast";


const dateParts = (iso: string) => {
  const d = new Date(Date.parse(iso));
  return { weekday: HARI[d.getUTCDay()], day: d.getUTCDate(), month: BULAN[d.getUTCMonth()] };
};

function seatsText(e: AgendaEventView) {
  if (e.capacity === null)
    return e.registered > 0 ? `${e.registered} orang ikut · kursi tanpa batas` : "Kursi tanpa batas";
  const left = Math.max(0, e.capacity - e.registered);
  return left === 0 ? `Penuh · ${e.capacity} kursi` : `${left} dari ${e.capacity} kursi tersisa`;
}

/** Halaman Agenda: tiket jadwal terdekat, jadwal berikutnya, lalu penjelasan dan dokumentasi tiap agenda. */
export function AgendaClient({
  events: initial,
  photos,
  signedIn,
}: {
  events: AgendaEventView[];
  photos: Record<AgendaKind, AgendaPhoto[]>;
  signedIn: boolean;
}) {
  const router = useRouter();
  const [events, setEvents] = useState(initial);
  const notify = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);
  const inFlight = useRef(false);

  const act = async (e: AgendaEventView) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusyId(e.id);
    const leaving = e.mine;
    const title = AGENDA[e.kind].name;
    try {
      const result = leaving ? await leaveEvent(e.id) : await joinEvent(e.id);
      if (!result.ok) {
        notify({ kind: "error", title, text: result.error });
        if (result.registered !== undefined) {
          const registered = result.registered;
          setEvents((all) => all.map((x) => (x.id === e.id ? { ...x, registered } : x)));
        }
        return;
      }
      setEvents((all) =>
        all.map((x) => (x.id === e.id ? { ...x, registered: result.registered, mine: result.mine } : x)),
      );
      notify({
        kind: "ok",
        title,
        text: leaving
          ? "Pendaftaranmu dibatalkan. Kursinya kembali terbuka untuk anggota lain."
          : "Kamu terdaftar. Pengingatnya sudah masuk ke lonceng notifikasi.",
      });
      router.refresh();
    } catch {
      notify({ kind: "error", title, text: "Gagal menyimpan. Periksa koneksi lalu coba lagi." });
    } finally {
      inFlight.current = false;
      setBusyId(null);
    }
  };

  const [next, ...later] = events;
  const nextOf = (kind: AgendaKind) => events.find((e) => e.kind === kind);
  const action = (e: AgendaEventView) => (
    <EventAction event={e} signedIn={signedIn} busy={busyId === e.id} onAct={() => act(e)} />
  );

  return (
    <>
      <section
        className={cn(
          ui.wrap,
          "grid grid-cols-[repeat(auto-fit,minmax(min(440px,100%),1fr))] items-center gap-x-14 gap-y-10 pt-14 pb-6",
        )}
      >
        <div className="flex animate-fade-up flex-col gap-[22px]">
          <h1 className="display m-0 text-[clamp(44px,5.6vw,74px)] leading-[1.08]">
            Ketemu langsung, <span className="text-primary-600">sesama pembaca.</span>
          </h1>
          <p className="m-0 max-w-[52ch] text-[17px] leading-relaxed text-ink-2">
            Empat agenda kopi darat Lembar bersama teman-teman{" "}
            <a href={PARTNER.url} target="_blank" rel="noopener noreferrer" className="font-semibold">
              {PARTNER.handle}
            </a>
            : membaca tanpa gangguan ponsel, bertukar puisi, menulis bareng, dan ngobrol pintar. Pilih jadwalnya,
            daftar, lalu datang.
          </p>
          <nav aria-label="Empat agenda" className="flex flex-wrap gap-2">
            {AGENDA_KINDS.map((k) => (
              <a key={k} href={`#${k}`} className={cn(ui.chip, "no-underline")}>
                <span
                  aria-hidden="true"
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: AGENDA[k].tone.bg }}
                />
                {AGENDA[k].name}
              </a>
            ))}
          </nav>
        </div>

        <div className="animate-fade-up [animation-delay:.15s]">
          <h2 className="m-0 mb-3 text-sm font-bold text-ink-3">Agenda terdekat</h2>
          {next ? (
            <Ticket event={next}>{action(next)}</Ticket>
          ) : (
            <div className={cn(ui.card, "flex flex-col items-start gap-3")}>
              <p className="m-0 text-lg font-bold text-ink">Jadwal berikutnya belum diumumkan.</p>
              <p className="m-0 max-w-[44ch] text-[15px] leading-relaxed text-ink-2">
                Pustakawan sedang menyusunnya bersama {PARTNER.handle}. Kabar terbaru biasanya muncul lebih dulu di
                Instagram mereka.
              </p>
              <a href={PARTNER.url} target="_blank" rel="noopener noreferrer" className={cn(ui.btn, ui.ghost)}>
                Buka {PARTNER.handle}
                <ArrowRight />
              </a>
            </div>
          )}
        </div>
      </section>

      {later.length > 0 && (
        <section aria-labelledby="jadwal-lain" className={cn(ui.wrap, "pt-12")}>
          <h2 id="jadwal-lain" className="display m-0 text-[clamp(30px,3.4vw,40px)] leading-none">
            Jadwal berikutnya
          </h2>
          <ul className="m-0 mt-5 flex list-none flex-col p-0">
            {later.map((e) => (
              <li key={e.id} id={`jadwal-${e.id}`} className="scroll-mt-6 border-t border-line py-5 last:border-b">
                <EventRow event={e}>{action(e)}</EventRow>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-col gap-20 pt-20">
        {AGENDA_KINDS.map((k, i) => (
          <Program key={k} kind={k} index={i} photos={photos[k]} next={nextOf(k)} />
        ))}
      </div>
    </>
  );
}

/* ---------------------------------------------------------------- */
/* Tiket jadwal terdekat                                             */
/* ---------------------------------------------------------------- */

function Ticket({ event: e, children }: { event: AgendaEventView; children: React.ReactNode }) {
  const info = AGENDA[e.kind];
  const { weekday, day, month } = dateParts(e.date);
  return (
    <article
      id={`jadwal-${e.id}`}
      aria-label={`${info.name}, ${formatDay(Date.parse(e.date))}`}
      className="ticket relative flex scroll-mt-6 flex-col overflow-hidden rounded-[26px] border border-line bg-paper shadow-[0_26px_40px_-30px_rgba(29,43,40,.6)] min-[520px]:flex-row"
    >
      <div
        className="flex shrink-0 flex-row items-center justify-between gap-4 px-6 py-5 min-[520px]:w-[150px] min-[520px]:flex-col min-[520px]:justify-center min-[520px]:py-8"
        style={{ backgroundColor: info.tone.bg, color: info.tone.ink }}
      >
        <span className="text-sm font-semibold">{weekday}</span>
        <span className="display text-[64px] leading-none">{day}</span>
        <span className="text-sm font-semibold">{month}</span>
      </div>
      <div className="ticket-cut" aria-hidden="true" />
      <div className="flex min-w-0 flex-1 flex-col gap-3 p-6">
        <div>
          <p className="m-0 text-[13px] font-semibold" style={{ color: info.tone.bg }}>
            {info.tagline}
          </p>
          <h3 className="display m-0 text-[30px] leading-tight">{info.name}</h3>
        </div>
        <EventFacts event={e} />
        {e.note && <p className="m-0 text-sm leading-relaxed text-ink-2">{e.note}</p>}
        {children}
      </div>
    </article>
  );
}

function EventFacts({ event: e }: { event: AgendaEventView }) {
  const full = e.capacity !== null && e.registered >= e.capacity;
  return (
    <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-sm text-ink-2">
      <li className="flex items-start gap-2">
        <Clock size={18} className="mt-px shrink-0 text-ink-3" />
        <span>
          {e.start}–{e.end} WIB
        </span>
      </li>
      <li className="flex items-start gap-2">
        <MapPin size={18} className="mt-px shrink-0 text-ink-3" />
        <span>{e.place}</span>
      </li>
      <li className="flex items-start gap-2">
        <People size={18} className="mt-px shrink-0 text-ink-3" />
        <span className={cn(full && !e.mine && "font-semibold text-accent-700")}>{seatsText(e)}</span>
      </li>
    </ul>
  );
}

/* ---------------------------------------------------------------- */
/* Baris jadwal berikutnya                                           */
/* ---------------------------------------------------------------- */

function EventRow({ event: e, children }: { event: AgendaEventView; children: React.ReactNode }) {
  const info = AGENDA[e.kind];
  const { weekday, day, month } = dateParts(e.date);
  return (
    <article className="grid grid-cols-[64px_1fr] gap-x-5 gap-y-3 md:grid-cols-[64px_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-start">
      <div
        className="flex flex-col items-center justify-center rounded-2xl py-2.5"
        style={{ backgroundColor: info.tone.soft, color: info.tone.bg }}
      >
        <span className="text-xs font-semibold">{weekday.slice(0, 3)}</span>
        <span className="text-[26px] leading-none font-extrabold">{day}</span>
        <span className="text-xs font-semibold">{month.slice(0, 3)}</span>
      </div>
      <div className="min-w-0">
        <h3 className="m-0 text-lg leading-snug font-bold">{info.name}</h3>
        <p className="m-0 text-sm text-ink-3">{info.tagline}</p>
        {e.note && <p className="m-0 mt-1.5 text-sm leading-relaxed text-ink-2">{e.note}</p>}
      </div>
      <div className="col-start-2 md:col-start-auto">
        <EventFacts event={e} />
      </div>
      <div className="col-start-2 md:col-start-auto md:max-w-[260px] md:justify-self-end">{children}</div>
    </article>
  );
}

/* ---------------------------------------------------------------- */
/* Tombol ikut / batal                                               */
/* ---------------------------------------------------------------- */

function EventAction({
  event: e,
  signedIn,
  busy,
  onAct,
}: {
  event: AgendaEventView;
  signedIn: boolean;
  busy: boolean;
  onAct: () => void;
}) {
  const full = e.capacity !== null && e.registered >= e.capacity;
  const name = AGENDA[e.kind].name;
  let control: React.ReactNode;

  if (e.started) {
    control = (
      <span className="status bg-secondary-100 text-secondary-600">
        {e.mine ? "Sedang berlangsung · kamu terdaftar" : "Sedang berlangsung"}
      </span>
    );
  } else if (!signedIn) {
    control = (
      <Link href="/masuk?lanjut=/agenda" className={cn(ui.btn, ui.ghost, "min-h-11 px-4 text-sm")}>
        Masuk untuk ikut
      </Link>
    );
  } else if (e.mine) {
    control = (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="inline-flex items-center gap-1.5 text-sm font-bold text-primary-700">
          <Check size={18} />
          Kamu terdaftar
        </span>
        <button
          type="button"
          onClick={onAct}
          disabled={busy}
          aria-busy={busy}
          aria-label={`Batal ikut ${name}`}
          className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border-0 bg-transparent px-2 text-sm font-semibold text-ink-3 underline underline-offset-2 hover:text-ink disabled:cursor-wait"
        >
          {busy && <Spinner size={16} />}
          Batal ikut
        </button>
      </div>
    );
  } else if (full) {
    control = (
      <button
        type="button"
        disabled
        className={cn(ui.btn, ui.ghost, "min-h-11 cursor-not-allowed px-4 text-sm opacity-60")}
      >
        Kursi penuh
      </button>
    );
  } else {
    control = (
      <button
        type="button"
        onClick={onAct}
        disabled={busy}
        aria-busy={busy}
        aria-label={`Ikut ${name}`}
        className={cn(ui.btn, ui.primary, "min-h-11 px-5 text-sm disabled:cursor-wait")}
      >
        {busy ? <Spinner size={18} /> : <Check size={18} />}
        Ikut agenda ini
      </button>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      {control}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Penjelasan tiap agenda                                            */
/* ---------------------------------------------------------------- */

function Program({
  kind,
  index,
  photos,
  next,
}: {
  kind: AgendaKind;
  index: number;
  photos: AgendaPhoto[];
  next: AgendaEventView | undefined;
}) {
  const info = AGENDA[kind];
  const flip = index % 2 === 1;
  return (
    <section
      id={kind}
      aria-labelledby={`${kind}-judul`}
      className={cn(
        ui.wrap,
        "grid scroll-mt-6 grid-cols-1 items-start gap-x-14 gap-y-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]",
        flip && "lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]",
      )}
    >
      <div className={cn("flex flex-col gap-5", flip && "lg:order-2")}>
        <div>
          <span className="display text-[20px] leading-none tabular-nums" style={{ color: info.tone.bg }}>
            {String(index + 1).padStart(2, "0")}
          </span>
          <h2 id={`${kind}-judul`} className="display m-0 mt-2 text-[clamp(36px,4.2vw,52px)] leading-[1.05]">
            {info.name}
          </h2>
          <p className="m-0 mt-1 text-lg font-semibold" style={{ color: info.tone.bg }}>
            {info.tagline}
          </p>
        </div>
        <p className="m-0 max-w-[54ch] text-base leading-relaxed text-ink-2">{info.about}</p>

        <ol className="m-0 flex list-none flex-col gap-0 p-0">
          {info.flow.map((step, i) => (
            <li
              key={step}
              className="flex items-baseline gap-3 border-t border-line-2 py-2.5 text-[15px] text-ink-2 last:border-b"
            >
              <span className="w-5 shrink-0 text-sm font-bold tabular-nums" style={{ color: info.tone.bg }}>
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>

        <p className="m-0 text-sm leading-relaxed text-ink-3">
          <strong className="text-ink-2">Yang perlu dibawa:</strong> {info.bring}
        </p>

        <p className="m-0 text-sm text-ink-2">
          {next ? (
            <>
              Jadwal terdekat:{" "}
              <a href={`#jadwal-${next.id}`} className="font-semibold">
                {formatDay(Date.parse(next.date))}, {next.start} WIB
              </a>
            </>
          ) : (
            <span className="text-ink-3">Belum ada jadwal untuk agenda ini.</span>
          )}
        </p>
      </div>

      <div className={cn(flip && "lg:order-1")}>
        {photos.length > 0 ? (
          <PhotoGallery photos={photos} label={info.name} />
        ) : (
          <figure className="m-0 flex flex-col gap-2.5">
            <AgendaEmblem kind={kind} className="block h-auto w-full rounded-[22px]" />
            <figcaption className="text-sm text-ink-3">Dokumentasi kegiatan {info.name} menyusul.</figcaption>
          </figure>
        )}
      </div>
    </section>
  );
}
