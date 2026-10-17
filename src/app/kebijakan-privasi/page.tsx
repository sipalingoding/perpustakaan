import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { idleMinutes } from "@/lib/idle";
import { LIBRARY } from "@/lib/library";
import { PageShell } from "@/components/layout/PageShell";
import { ui } from "@/components/ui";

export const metadata: Metadata = {
  title: "Kebijakan privasi",
  description: "Data apa yang dikumpulkan Lembar, untuk apa, dan cara mengatur atau menghapusnya.",
};

/** Ubah tanggal ini setiap kali isi kebijakan berubah. */
const EFFECTIVE = "17 Oktober 2026";

const DATA: { what: string; when: string; required: string }[] = [
  { what: "Nama, alamat email, dan jenis kelamin", when: "Saat mendaftar akun", required: "Ya" },
  { what: "Kata sandi, disimpan dalam bentuk hash yang tidak bisa dibaca", when: "Saat mendaftar akun", required: "Ya" },
  { what: "Nama panggilan, bio, kategori favorit, target baca", when: "Saat mengisi Profil", required: "Tidak" },
  { what: "Nomor HP", when: "Saat mengisi Profil", required: "Ya, saat menyimpan Profil" },
  { what: "Foto profil", when: "Saat mengunggahnya di Profil", required: "Tidak" },
  {
    what: "Riwayat booking, pinjam, perpanjangan, pengembalian, dan halaman terakhir dibaca",
    when: "Saat meminjam buku",
    required: "Ya, untuk meminjam",
  },
  {
    what: "Data sumbangan: judul, penulis, jumlah, catatan, alamat penjemputan bila diisi, dan jadwal",
    when: "Saat mengajukan sumbangan",
    required: "Ya, untuk menyumbang",
  },
  { what: "Ulasan dan rating buku", when: "Saat menulis ulasan", required: "Tidak" },
  { what: "Pendaftaran agenda", when: "Saat mendaftar kegiatan", required: "Ya, untuk mendaftar" },
];

const PROCESSORS: { name: string; role: string }[] = [
  { name: "Vercel", role: "Hosting situs dan aplikasi" },
  { name: "Neon", role: "Database, akun dan login, penyimpanan foto" },
  { name: "Resend", role: "Pengiriman email" },
  { name: "Fonnte", role: "Pengiriman pesan WhatsApp" },
];

/** Terbuka untuk tamu: alamat ini diisi di Play Console (Privacy policy), jadi harus bisa dibaca tanpa masuk. */
export default function KebijakanPrivasiPage() {
  return (
    <PageShell>
      <article className={cn(ui.wrap, "flex max-w-[760px] flex-col gap-8 pt-14 pb-16")}>
        <header className="flex flex-col gap-3">
          <h1 className="display m-0 text-[clamp(38px,5vw,56px)] leading-[1.05]">Kebijakan privasi</h1>
          <p className="m-0 text-sm text-ink-3">Berlaku sejak {EFFECTIVE}</p>
          <p className="m-0 text-lg leading-relaxed text-ink-3">
            Lembar adalah perpustakaan komunitas di {LIBRARY.address}, yang bisa diakses lewat situs dan aplikasi
            Android. Halaman ini menjelaskan data apa yang kami kumpulkan, untuk apa, dan bagaimana kamu bisa mengaturnya.
          </p>
        </header>

        <Section title="Data yang kami kumpulkan">
          <div className="overflow-x-auto rounded-[18px] border border-line">
            <table className="w-full min-w-[520px] border-collapse text-left text-[15px]">
              <thead className="bg-hover text-[13px] text-ink-2">
                <tr>
                  <th className="px-4 py-3 font-semibold">Data</th>
                  <th className="px-4 py-3 font-semibold">Kapan dikumpulkan</th>
                  <th className="px-4 py-3 font-semibold">Wajib?</th>
                </tr>
              </thead>
              <tbody>
                {DATA.map((d) => (
                  <tr key={d.what} className="border-t border-line align-top">
                    <td className="px-4 py-3 text-ink">{d.what}</td>
                    <td className="px-4 py-3 text-ink-2">{d.when}</td>
                    <td className="px-4 py-3 text-ink-2">{d.required}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            Katalog bisa dilihat tanpa akun dan tanpa data apa pun. Kami tidak mengumpulkan lokasi, kontak, atau data
            perangkat, dan tidak memakai iklan maupun alat analitik pihak ketiga.
          </p>
        </Section>

        <Section title="Untuk apa data dipakai">
          <ul className="m-0 flex flex-col gap-2 pl-6">
            <li>Menjalankan akun dan layanan perpustakaan: booking, peminjaman, perpanjangan, sumbangan, dan agenda.</li>
            <li>
              Mengirim kabar layanan, seperti konfirmasi booking dan pengingat jatuh tempo, lewat email, WhatsApp, dan
              notifikasi di aplikasi. Pengingat jatuh tempo bisa dimatikan di Profil.
            </li>
            <li>
              Menampilkan nama panggilan, foto profil (bila kamu memilih menampilkannya), dan ulasanmu kepada anggota lain.
              Nama penyumbang hanya ditampilkan bila kamu mengizinkannya.
            </li>
            <li>Membantu pustakawan mengelola koleksi dan menghubungimu soal pinjaman dan sumbangan.</li>
          </ul>
          <p>Kami tidak menjual data pribadi dan tidak memakainya untuk iklan.</p>
        </Section>

        <Section title="Pihak yang memproses data atas nama kami">
          <ul className="m-0 flex flex-col gap-2 pl-6">
            {PROCESSORS.map((p) => (
              <li key={p.name}>
                <strong className="text-ink">{p.name}</strong>: {p.role}
              </li>
            ))}
          </ul>
          <p>
            Data hanya dibagikan ke penyedia ini sejauh diperlukan untuk menjalankan fungsinya. Data juga bisa kami
            serahkan bila diwajibkan hukum.
          </p>
        </Section>

        <Section title="Keamanan dan cookie">
          <p>
            Semua koneksi memakai HTTPS, dan kata sandi disimpan sebagai hash. Kami memakai cookie sesi agar kamu tetap
            masuk; sesi berakhir otomatis setelah {idleMinutes(process.env.IDLE_TIMEOUT_MINUTES)} menit tidak aktif.
            Aplikasi Android menyimpan cookie yang sama di perangkatmu.
          </p>
        </Section>

        <Section title="Berapa lama data disimpan">
          <p>
            Data akun dan riwayat pinjam disimpan selama akunmu ada. Saat akun dihapus, semua datanya langsung dihapus
            permanen, termasuk foto profil.
          </p>
        </Section>

        <Section title="Hak kamu">
          <ul className="m-0 flex flex-col gap-2 pl-6">
            <li>Melihat dan mengubah data profil kapan saja di halaman Profil.</li>
            <li>Menghapus foto profil kapan saja, dan mematikan pengingat jatuh tempo.</li>
            <li>
              Menghapus akun beserta semua datanya sendiri dari halaman Profil. Caranya ada di{" "}
              <Link href="/hapus-akun">Hapus akun</Link>.
            </li>
            <li>
              Meminta salinan datamu lewat email ke <a href={`mailto:${LIBRARY.email}`}>{LIBRARY.email}</a>. Permintaan
              dibalas paling lama 14 hari.
            </li>
          </ul>
        </Section>

        <Section title="Anak-anak">
          <p>
            Lembar ditujukan untuk pengguna berusia 13 tahun ke atas. Anak di bawah 13 tahun sebaiknya meminjam buku
            dengan pendampingan orang tua atau wali.
          </p>
        </Section>

        <Section title="Perubahan kebijakan">
          <p>Bila kebijakan ini berubah, kami memperbarui tanggal di atas. Versi terbaru selalu ada di halaman ini.</p>
        </Section>

        <Section title="Kontak">
          <p>
            Pertanyaan soal privasi bisa dikirim ke <a href={`mailto:${LIBRARY.email}`}>{LIBRARY.email}</a>, atau
            disampaikan langsung ke pustakawan di {LIBRARY.address}, {LIBRARY.days.toLowerCase()} pukul {LIBRARY.hours}.
          </p>
        </Section>
      </article>
    </PageShell>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 text-base leading-relaxed text-ink-2 [&_p]:m-0">
      <h2 className="m-0 text-xl font-bold text-ink">{title}</h2>
      {children}
    </section>
  );
}
