# Lembar — perpustakaan yang tenang

Aplikasi web perpustakaan dengan Next.js 16 (App Router) dan Tailwind CSS 4, hasil konversi desain Lembar.
Semua data masih berupa **data contoh** (judul buku, anggota, dan jadwal fiktif), jadi aplikasi ini siap
dijalankan dan disambungkan ke backend nanti.

## Menjalankan

```bash
npm install
npm run dev        # buka http://localhost:3000
```

Perintah lain:

```bash
npm run build      # build produksi
npm start          # jalankan hasil build
npm run lint       # ESLint
npm run typecheck  # buat tipe rute lalu cek TypeScript
```

Butuh Node.js 20.9 atau lebih baru. Font Poppins (400, 500, 600, 700) dipasang lewat npm
(`@fontsource/poppins`), jadi build tidak perlu mengunduh dari Google Fonts. Ikon memakai Material Design Icons
(`@mdi/js`), dibungkus di `src/components/icons.tsx`.

## Backend dan database

Backend-nya Next.js sendiri (Server Component dan Route Handler), dengan Postgres dan Drizzle ORM di Neon,
Neon Auth untuk login email + kata sandi, dan Neon Object Storage untuk foto profil dan sampul buku.

**Neon** (project "Perpustakaan", branch `production`, ditautkan lewat `neon link` di berkas `.neon`):

| Layanan | Di aplikasi |
| --- | --- |
| Postgres | `DATABASE_URL` (pooled, aplikasi) dan `DATABASE_URL_UNPOOLED` (langsung, migrasi). Driver Neon JS (`@neondatabase/serverless`, Pool lewat WebSocket) untuk alamat `*.neon.tech`, node-postgres untuk Postgres lain (`src/db/client.ts`). |
| Auth (Managed Better Auth) | `NEON_AUTH_BASE_URL` + `NEON_AUTH_COOKIE_SECRET`. Server di `src/lib/server/auth.ts`, proxy API di `/api/auth/[...path]`, klien di `src/lib/auth-client.ts`, cek sesi di `src/proxy.ts`. Akun dan kata sandi ada di schema `neon_auth`; tabel `user` aplikasi menyimpan data anggota dengan id yang sama (dibuat saat akun pertama kali masuk, lihat `getViewer`). |
| Object Storage | Bucket privat `uploads` (`AWS_*`). `src/lib/server/storage.ts`; database menyimpan kunci (`profiles.photo_key`, `books.cover_key`) dan berkas dilayani lewat `/berkas/<kunci>`. Kunci baru per versi, jadi aman di-cache setahun. |

```bash
npm run db:migrate             # terapkan migrasi ke database di DATABASE_URL_UNPOOLED / DATABASE_URL
npm run dev
```

`neon.ts` mendeklarasikan Auth dan bucket `uploads`. Terapkan dengan `neon deploy --no-env-pull`, dan tarik variabel
ke berkas terpisah (`neon env pull --file .env.neon`) supaya `.env.local` tidak ditimpa.

Untuk pengembangan atau uji yang mengubah data, pakai branch Neon, bukan `production`: setiap branch punya database,
Auth, dan bucket sendiri yang disalin dari induknya.

```bash
neon branch create --name dev --parent production -o json > /dev/null
neon env pull --branch dev --file .env.dev     # lalu jalankan aplikasi dengan variabel ini
```

**Pemindahan dari Better Auth** (sekali, sudah dijalankan di `production`): `npm run db:migrate-neon` memindahkan akun
ke Neon Auth dengan hash kata sandi yang sama (anggota tetap masuk dengan kata sandi lamanya) dan menyalin foto serta
sampul ke bucket. Migrasi `0007` menghapus tabel lama dan menolak berjalan bila masih ada data yang belum dipindah.

**Database lokal** (`.pgdata/`, port 5433) hanya untuk melihat data contoh tanpa internet: `npm run db:seed` mengisi
katalog dan anggota contoh, tapi login tetap lewat Neon Auth, jadi akun contoh di sana tidak bisa dipakai masuk.

- Skema ada di `src/db/schema.ts`; ubah di sana lalu `npm run db:generate` dan `npm run db:migrate`.
- Satu eksemplar hanya bisa dipegang satu anggota: dijaga indeks unik parsial `loans_one_holder_per_copy`,
  bukan hanya kode aplikasi.
- Akses data ada di `src/lib/server/` (`import "server-only"`). Bacaan yang sama untuk semua orang (katalog dan
  stok) di-cache dengan tag `catalog`; bacaan per anggota tidak di-cache dan dimuat di dalam `<Suspense>`.
- `proxy.ts` hanya memeriksa cookie sesi untuk mengalihkan tamu; halaman tetap harus memanggil `requireViewer()`.
- Build produksi membaca database untuk `generateStaticParams`, jadi `DATABASE_URL` dan minimal satu buku harus ada.

Tahap integrasi: katalog, detail buku (termasuk memesan buku), login, header, profil, papan baca, sumbangan,
dan Jadwal sudah memakai database. Yang belum: layar petugas untuk menandai buku sudah diambil atau dikembalikan,
dan mencatat pembayaran denda. Pesanan berstatus "menunggu diambil" belum punya batas waktu otomatis.
`src/lib/books.ts`, `members.ts`, dan `loans.ts` sekarang hanya sumber data untuk skrip seed.

Meminjam buku: anggota memilih tanggal ambil (hari ini sampai 7 hari ke depan; hari ini hanya bila masih ada slot)
dan jam kedatangan (10.00–16.00, `VISIT_HOURS` di `src/lib/library.ts`), lalu lama pinjam 7/14/21 hari. "Ajukan
peminjaman" membuat booking berstatus `reserved`, tampil sebagai **Terbooking**. Saat anggota datang, pustakawan
menekan **Approve** di `/admin/peminjaman`: status jadi `active` (**Dipinjam**) dan masa pinjam dihitung ulang mulai
hari itu dengan lama yang sama. Server memilih satu eksemplar kosong di dalam satu INSERT dan indeks unik menjaganya,
jadi dua anggota tidak bisa memegang eksemplar yang sama. Satu anggota hanya boleh memegang satu eksemplar per judul.
Booking yang tidak diambil sampai akhir hari jadwalnya batal otomatis (status `cancelled`) dan eksemplarnya terbuka
lagi. Belum ada penjadwal, jadi `expireMissedPickups()` dijalankan saat booking dibuat dan saat Jadwal, Profil, halaman
buku anggota, dan admin dibuka; katalog menghitung ketersediaan dengan aturan yang sama (`holdsCopy`), jadi selalu benar
walau pembatalannya belum tercatat.

Notifikasi (lonceng di header): setiap perubahan status mencatat notifikasi untuk anggotanya di tabel `notifications`
(`notify()` di `src/lib/server/notifications.ts`, satu transaksi dengan perubahan statusnya): booking berhasil, buku
diambil (Approve), booking batal otomatis, sumbangan diajukan, disetujui, dan diterima. Angka di lonceng = belum dibaca;
membuka daftar menandai semuanya dibaca. Pengingat jatuh tempo dihitung langsung dan tampil paling atas.

Denda keterlambatan Rp5.000 per hari (`src/lib/fine.ts`) dihitung dari tanggal jatuh tempo dan tanggal hari ini
menurut zona waktu Jakarta; denda tidak disimpan, jadi berhenti bertambah saat petugas menandai buku kembali.
Pinjaman tidak bisa diperpanjang dari aplikasi; anggota mengembalikan buku sebelum jatuh tempo.

## Dasbor pustakawan

Akun pustakawan dibuat lewat terminal. Kata sandinya diambil dari `ADMIN_PASSWORD` di `.env.local`:

```bash
npm run admin:create                                  # admin@contoh.id, "Pustakawan Lembar"
npm run admin:create -- pustakawan@perpus.id "Nama"   # email dan nama sendiri
npm run role -- email@contoh.id pustakawan            # jadikan akun yang sudah ada pustakawan (atau: anggota)
```

Akunnya dibuat lewat API daftar Neon Auth, jadi kata sandinya di-hash oleh Neon. Pustakawan yang masuk langsung
diarahkan ke `/admin` (kecuali datang dari `?lanjut=` ke halaman lain), dan melihat "Kelola koleksi" di menu avatar.
Selain pustakawan, `/admin` tampil sebagai halaman tidak ditemukan.

- **Cari data buku**: judul, penulis, atau ISBN dicari di Open Library (tanpa kunci). Memilih hasil mengisi judul,
  penulis, penerbit, tahun, halaman, ISBN, bahasa, dan sinopsis. Google Books ikut dicari bila `GOOGLE_BOOKS_API_KEY`
  diisi; tanpa kunci, kuota bersamanya sering habis.
- **Sampul**: bila hasil pencarian punya sampul, gambarnya diunduh server saat buku disimpan (hanya dari host sampul
  Open Library/Google), diperkecil ke lebar 600 px dengan `sharp`, dan disimpan di bucket `uploads`. Bila tidak ada,
  pustakawan mengunggah foto sampul sendiri, atau memakai sampul ilustrasi (warna + motif). Warna punggung buku di rak
  diambil dari warna dominan sampul. Sampul disajikan lewat `/berkas/covers/...`; sampul lama dihapus dari bucket saat diganti.
- **Sumbangan**: status `diajukan` (anggota mengirim formulir) → `dikirim` (disetujui, buku diantar atau dijemput) →
  `diterima` (buku sudah di tangan petugas). Perubahan status hanya maju satu langkah dari status yang dilihat
  pustakawan, jadi dua pustakawan yang menekan tombol bersamaan tidak saling menimpa.
- **Sumbangan masuk koleksi otomatis** saat "Konfirmasi diterima" (`src/lib/server/collection.ts`, satu transaksi):
  bila buku yang sama sudah ada (ISBN sama, atau judul dan penulis sama) eksemplarnya ditambah; bila belum, dibuat
  buku baru di rak sementara `SB` dengan data formulir dan, bila anggota memilih bukunya lewat pencarian, ISBN, penerbit,
  tahun, halaman, bahasa, sinopsis, dan sampul dari Open Library. Pustakawan melengkapi dan memindahkan raknya lewat
  tombol ubah. Halaman dan tahun boleh kosong; halaman detail tidak menampilkan baris yang kosong.
- **Agenda**: nama dan penjelasan keempat agenda ada di `src/lib/agenda.ts`; jadwal, pendaftar, dan foto di tabel
  `agenda_events`, `agenda_registrations`, `agenda_photos`. Pendaftaran mengunci baris jadwal supaya kuota tidak
  terlampaui, dan ditutup saat acara dimulai (waktu Jakarta). Peserta mendapat notifikasi saat mendaftar, saat
  tanggal/jam/tempat diubah, dan saat jadwal dihapus. Foto diolah ulang jadi JPEG maks. 1600 px tanpa metadata,
  disimpan di bucket `uploads` (`agenda/<agenda>/<uuid>.jpg`), dan terbuka untuk tamu. Maksimal 12 foto per agenda.
- **Eksemplar**: kodenya `<kode rak>-<nomor>`. Eksemplar yang pernah dipinjam tidak bisa dihapus, begitu juga buku
  yang punya riwayat pinjam, supaya riwayat dan denda tetap utuh.

## Halaman

| Rute | Isi |
| --- | --- |
| `/masuk` | Masuk dan daftar di dalam buku terbuka. Sampul membuka saat dimuat, pita pembatas untuk berganti formulir. Masuk dengan email atau nomor anggota (LMB-YYMM-NNNN); tombol mata menampilkan kata sandi. |
| `/lupa-sandi` | Lupa kata sandi: email → kode 6 angka dari Neon Auth (`emailOtp`, tipe `forget-password`) + kata sandi baru → langsung masuk. |
| `/` | Katalog: pencarian, filter kategori, urutan, dan kartu buku yang sampulnya membuka saat disorot. |
| `/buku/[slug]` | Detail buku (dengan rata-rata rating dan bagian "Ulasan pembaca") dengan buku 3D yang bisa dibuka, dibalik halamannya, dan ditutup, plus panel peminjaman (pilih tanggal ambil dan lama pinjam). |
| `/jadwal` | Kalender meja yang lembarnya membalik, pinjaman aktif, booking, dan denda bila terlambat. Tombol "Kembalikan buku" membuka popup rating 1–5 bintang dan ulasan (boleh dilewati) lalu mengajukan pengembalian; status baru berubah setelah pustakawan menerimanya. |
| `/profil` | Profil anggota, kartu anggota yang bisa dibalik, target membaca, rak bacaan, akun, dan preferensi. |
| `/anggota` | Papan baca (peringkat anggota per periode) dan rak koleksi tiap anggota. |
| `/sumbang` | Formulir sumbang buku 3 langkah dengan pratinjau sampul dan plakat ex libris. |
| `/agenda` | Agenda kopi darat bersama @kopiku_literasi (2 Jam Tanpa Gadget, Basa-Basi, KKN, Ngopi): tiket jadwal terdekat, jadwal berikutnya, penjelasan dan dokumentasi foto tiap agenda. Terbuka untuk tamu; ikut/batal ikut perlu masuk. |
| `/admin` | Khusus pustakawan: daftar koleksi dengan stok, tambah buku (`/admin/buku/baru`), ubah dan hapus buku. |
| `/admin/peminjaman` | Khusus pustakawan: booking dan pinjaman yang berjalan. "Approve" saat anggota mengambil buku mengubah status Terbooking jadi Dipinjam; "Terima pengembalian" untuk buku yang pengembaliannya diajukan anggota mengubahnya jadi dikembalikan (eksemplar tersedia lagi, denda dihitung sampai hari itu). |
| `/admin/sumbangan` | Khusus pustakawan: sumbangan anggota. "Setujui" mengubah status jadi dalam pengiriman; "Konfirmasi diterima" (setelah buku tiba) jadi diterima. |
| `/admin/agenda` | Khusus pustakawan: tambah, ubah, dan hapus jadwal agenda (tanggal, jam, tempat, kuota, catatan), lihat peserta, dan unggah foto dokumentasi per agenda. |

Pilihan **jenis kelamin** di halaman Profil disimpan di database, sehingga ilustrasi karakter, avatar di
navigasi, dan baris "Kamu" di papan baca ikut berubah di semua halaman.

Di Profil, anggota memilih satu dari enam karakter sesuai jenis kelaminnya (`AVATAR_PRESETS` di `src/lib/people.ts`)
atau mengunggah foto sendiri. Foto dipotong persegi dan dikecilkan ke 320 px di browser (data lokasi ikut terbuang),
dicek ulang dan diolah ulang di server jadi JPEG (JPG, PNG, WebP, maksimal 300 KB), lalu disimpan di bucket `uploads`
dan disajikan lewat `/berkas/avatars/...` hanya untuk anggota yang masuk.

## Struktur

```
src/
  app/                    rute (page.tsx tiap halaman), layout, globals.css, ikon
  components/
    layout/               PageShell, SiteHeader, LogoMark
    illustrations/        ilustrasi SVG (dibuat dari file desain)
    auth/ catalog/ detail/ schedule/ profile/ members/ donate/
                          komponen per halaman (client component untuk bagian interaktif)
    Avatar.tsx            potret ilustrasi yang bisa diatur (hijab, bob, rambut panjang, pendek, cepak, kacamata) atau foto unggahan
    ui.ts                 kelas Tailwind untuk tombol, chip, input, kartu, dll.
    icons.tsx             ikon MDI (path dari @mdi/js, warna mengikuti teks)
  lib/
    books.ts              katalog + isi cuplikan buku
    loans.ts              jadwal peminjaman anggota yang masuk
    members.ts            anggota, periode papan baca, sumbangan terbaru
    people.ts             tampilan karakter bawaan per jenis kelamin
    member.ts             format nomor kartu dan tanggal keanggotaan
    dates.ts              format tanggal Indonesia dan tanggal "hari ini" contoh
    cn.ts                 penyambung nama kelas (tidak menyelesaikan bentrokan kelas)
```

## Catatan untuk pengembangan

- **Tema** ada di `src/app/globals.css` lewat `@theme`. Tiga warna utama, masing-masing bertingkat dari terang (50) ke gelap (700-800):
  **Primer** (hijau pinus, `bg-primary-600`), **Sekunder** (biru senja, `text-secondary-600`), dan **Aksen**
  (aprikot, `bg-accent-100`; untuk teks pakai tingkat 600-700). Warna netral (`text-ink-3`, `border-line`,
  `bg-cream`) terpisah dari ketiganya. Untuk mengganti palet, ubah nilai `--color-primary-*`, `-secondary-*`,
  dan `-accent-*` di sana. Animasi seperti `animate-fade-up` juga di file itu. Efek buku 3D (sampul, halaman yang dibalik,
  burung-buku) memakai CSS biasa di file yang sama karena butuh `preserve-3d` dan keyframe khusus.
- **Status terpilih** memakai atribut ARIA (`aria-pressed`, `aria-current`) yang langsung dipakai
  sebagai varian Tailwind, jadi tampilan dan aksesibilitas selalu sejalan.
- **"Hari ini"** di data contoh dikunci ke 5 Oktober 2026 (`TODAY` di `lib/dates.ts`) supaya jadwal
  dan peringkat konsisten. Ganti dengan tanggal sungguhan saat data sudah berasal dari server.
- Proyek memakai **Cache Components** (bawaan `create-next-app` 16). Semua halaman dirender statis;
  `/buku/[slug]` dibuat untuk setiap buku lewat `generateStaticParams`.
- Jam layanan dan alamat ada di `src/lib/library.ts`. Yang masih perlu diisi: `[AREA LAYANAN]`, `[NOMOR]`,
  serta ketentuan sumbangan di `components/donate/DonateClient.tsx`.
# perpustakaan
