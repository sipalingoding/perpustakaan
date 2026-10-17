import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "@/components/icons";
import { PageShell } from "@/components/layout/PageShell";
import { ui } from "@/components/ui";
import { cn } from "@/lib/cn";
import { LIBRARY } from "@/lib/library";

export const metadata: Metadata = {
  title: "Hapus akun",
  description: "Cara menghapus akun Lembar beserta data yang ikut terhapus.",
};

/** Terbuka untuk tamu: alamat ini diisi di Play Console (Data deletion), jadi harus bisa dibaca tanpa masuk. */
export default function HapusAkunPage() {
  return (
    <PageShell>
      <article className={cn(ui.wrap, "flex max-w-[720px] flex-col gap-6 pt-14 pb-16")}>
        <h1 className="display m-0 text-[clamp(38px,5vw,56px)] leading-[1.05]">Menghapus akun Lembar</h1>
        <p className="m-0 text-lg leading-relaxed text-ink-3">
          Kamu bisa menghapus akunmu sendiri kapan saja, dari situs maupun aplikasi Android Lembar.
        </p>

        <section className="flex flex-col gap-3">
          <h2 className="m-0 text-xl font-bold">Caranya</h2>
          <ol className="m-0 flex flex-col gap-2 pl-6 text-base leading-relaxed text-ink-2">
            <li>Masuk ke akunmu, lalu buka halaman Profil.</li>
            <li>Gulir ke bagian paling bawah, lalu tekan Hapus akun.</li>
            <li>Masukkan kata sandimu, lalu tekan Ya, hapus akun.</li>
          </ol>
          <p className="m-0 text-base leading-relaxed text-ink-2">
            Buku yang masih dipinjam atau dibooking perlu dikembalikan atau dibatalkan dulu.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="m-0 text-xl font-bold">Data yang dihapus</h2>
          <p className="m-0 text-base leading-relaxed text-ink-2">
            Semua data akunmu langsung dihapus permanen dan tidak disimpan lagi: nama, email, kata sandi, nomor HP, foto
            profil, bio, riwayat pinjam, sumbangan, ulasan, notifikasi, dan pendaftaran agenda.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="m-0 text-xl font-bold">Tidak bisa masuk lagi?</h2>
          <p className="m-0 text-base leading-relaxed text-ink-2">
            Atur ulang kata sandimu lewat <Link href="/lupa-sandi">Lupa kata sandi</Link>, lalu hapus akun seperti di
            atas. Butuh bantuan? Kirim email ke <a href={`mailto:${LIBRARY.email}`}>{LIBRARY.email}</a> dari alamat
            email akunmu, atau datangi pustakawan di {LIBRARY.address}, {LIBRARY.days.toLowerCase()} pukul {LIBRARY.hours}.
          </p>
        </section>

        <div>
          <Link href="/profil" className={cn(ui.btn, ui.primary)}>
            Buka Profil
            <ArrowRight />
          </Link>
        </div>
      </article>
    </PageShell>
  );
}
