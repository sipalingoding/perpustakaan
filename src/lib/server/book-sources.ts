import "server-only";

/**
 * Pencarian data buku di katalog publik, untuk mengisi formulir tambah buku.
 * - Perpusnas (data ISBN resmi Indonesia, isbn.perpusnas.go.id): paling lengkap dan terbaru untuk buku terbitan
 *   Indonesia, sering dengan sinopsis dan jumlah halaman, tapi tanpa sampul. Ini endpoint yang dipakai halaman
 *   pencarian situs itu sendiri, bukan API berdokumen, jadi bisa berubah; bila gagal, sumber lain tetap jalan.
 * - Open Library (tanpa kunci): buku internasional, dan sampul banyak buku Indonesia lewat ISBN.
 * - Google Books: hanya bila GOOGLE_BOOKS_API_KEY diisi; tanpa kunci kuota bersamanya sudah 0.
 * Hasil Perpusnas dilengkapi sampul dan sinopsis dari sumber lain yang ISBN-nya sama.
 */

export type SourceBook = {
  source: "perpusnas" | "openlibrary" | "google";
  /** Kunci di sumbernya: ISBN untuk Perpusnas, "/works/OL…W" untuk Open Library, id volume untuk Google Books. */
  ref: string;
  /** Karya Open Library ("/works/OL…W") untuk mengambil sinopsis nanti, bila dikenal. */
  workKey: string | null;
  title: string;
  author: string;
  year: number | null;
  pages: number | null;
  publisher: string;
  isbn: string | null;
  language: string | null;
  synopsis: string;
  /** Gambar sampul ukuran besar untuk disimpan, dan versi kecil untuk daftar hasil. */
  cover: string | null;
  thumb: string | null;
  /** Keterangan edisi singkat, mis. "Edisi digital". */
  edition?: string | null;
};

const USER_AGENT = "Lembar/1.0 (aplikasi perpustakaan)";
const TIMEOUT_MS = 8000;

const LANGUAGES: Record<string, string> = {
  ind: "Indonesia",
  id: "Indonesia",
  eng: "Inggris",
  en: "Inggris",
  msa: "Melayu",
  may: "Melayu",
  ms: "Melayu",
  jav: "Jawa",
  jv: "Jawa",
  sun: "Sunda",
  su: "Sunda",
  ara: "Arab",
  ar: "Arab",
  jpn: "Jepang",
  ja: "Jepang",
  fre: "Prancis",
  fra: "Prancis",
  fr: "Prancis",
  ger: "Jerman",
  deu: "Jerman",
  de: "Jerman",
  dut: "Belanda",
  nld: "Belanda",
  nl: "Belanda",
  chi: "Mandarin",
  zho: "Mandarin",
  zh: "Mandarin",
};

/** "978-602-…" -> "978602…" bila bentuknya ISBN-10/13, selain itu null. */
export function normalizeIsbn(value: string): string | null {
  const digits = value.replace(/[\s-]/g, "").toUpperCase();
  return /^(\d{9}[\dX]|\d{13})$/.test(digits) ? digits : null;
}

const pickIsbn = (list: string[] | undefined) =>
  list?.find((i) => /^\d{13}$/.test(i)) ?? list?.find((i) => /^\d{9}[\dX]$/.test(i)) ?? null;

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${new URL(url).host} ${res.status}`);
  return res.json() as Promise<T>;
}

type OpenLibraryDoc = {
  key: string;
  title: string;
  subtitle?: string;
  author_name?: string[];
  first_publish_year?: number;
  number_of_pages_median?: number;
  cover_i?: number;
  isbn?: string[];
  publisher?: string[];
  language?: string[];
};

/** Hasil beserta semua ISBN edisinya, untuk dicocokkan dengan hasil Perpusnas. Tidak dikirim ke browser. */
type Found = SourceBook & { isbns: string[] };

async function searchOpenLibrary(query: string, isbn: string | null): Promise<Found[]> {
  const url = new URL("https://openlibrary.org/search.json");
  url.searchParams.set(isbn ? "isbn" : "q", isbn ?? query);
  url.searchParams.set("limit", "12");
  url.searchParams.set(
    "fields",
    "key,title,subtitle,author_name,first_publish_year,number_of_pages_median,cover_i,isbn,publisher,language",
  );
  const { docs } = await getJson<{ docs: OpenLibraryDoc[] }>(url.toString());
  return docs.map((d) => ({
    source: "openlibrary",
    ref: d.key,
    workKey: d.key,
    isbns: d.isbn ?? [],
    title: d.subtitle ? `${d.title}: ${d.subtitle}` : d.title,
    author: (d.author_name ?? []).slice(0, 3).join(", "),
    year: d.first_publish_year ?? null,
    pages: d.number_of_pages_median ?? null,
    publisher: d.publisher?.[0] ?? "",
    isbn: isbn ?? pickIsbn(d.isbn),
    language: d.language?.map((l) => LANGUAGES[l]).find(Boolean) ?? null,
    synopsis: "",
    cover: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg?default=false` : null,
    thumb: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : null,
  }));
}

type GoogleVolume = {
  id: string;
  volumeInfo: {
    title: string;
    subtitle?: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    description?: string;
    pageCount?: number;
    language?: string;
    industryIdentifiers?: Array<{ type: string; identifier: string }>;
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
  };
};

const stripHtml = (s: string) =>
  s
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

async function searchGoogle(query: string, isbn: string | null, key: string): Promise<Found[]> {
  const url = new URL("https://www.googleapis.com/books/v1/volumes");
  url.searchParams.set("q", isbn ? `isbn:${isbn}` : query);
  url.searchParams.set("maxResults", "10");
  url.searchParams.set("key", key);
  const { items = [] } = await getJson<{ items?: GoogleVolume[] }>(url.toString());
  return items.map(({ id, volumeInfo: v }) => {
    const image = v.imageLinks?.thumbnail?.replace(/^http:/, "https:").replace("&edge=curl", "") ?? null;
    const isbns = v.industryIdentifiers?.map((i) => i.identifier) ?? [];
    return {
      source: "google",
      ref: id,
      workKey: null,
      isbns,
      title: v.subtitle ? `${v.title}: ${v.subtitle}` : v.title,
      author: (v.authors ?? []).slice(0, 3).join(", "),
      year: Number(v.publishedDate?.slice(0, 4)) || null,
      pages: v.pageCount || null,
      publisher: v.publisher ?? "",
      isbn: pickIsbn(isbns),
      language: (v.language && LANGUAGES[v.language]) ?? null,
      synopsis: v.description ? stripHtml(v.description) : "",
      cover: image,
      thumb: image,
    };
  });
}

type PerpusnasRow = {
  title: string;
  kepeng?: string;
  nama_penerbit?: string;
  tahun_terbit?: string;
  code?: string;
  jml_hlm?: string;
  sinopsis?: string;
  jenis_media?: string;
  jenis_kategori?: string;
};

const PERPUSNAS_URL = "https://isbn.perpusnas.go.id/landing_page/serverside_search2";

/** Satu pencarian Perpusnas. `field` null = cari ISBN persis; selain itu frasa di judul ("title") atau pengarang ("kepeng"). */
async function perpusnasQuery(value: string, field: "title" | "kepeng" | null): Promise<PerpusnasRow[]> {
  const url = new URL(PERPUSNAS_URL);
  url.searchParams.set("draw", "1");
  url.searchParams.set("start", "0");
  url.searchParams.set("length", "10");
  url.searchParams.set("jenis_media", "all");
  if (field) {
    // Pencarian biasa mencocokkan kata mana pun; pencarian lanjutan mencocokkan frasa utuh di satu kolom.
    url.searchParams.set("search", "");
    url.searchParams.set("filter_by", "all");
    url.searchParams.set("advanced_search[0][field]", field);
    url.searchParams.set("advanced_search[0][value]", value);
  } else {
    url.searchParams.set("search", value);
    url.searchParams.set("filter_by", "code");
  }
  const { data } = await getJson<{ data?: PerpusnasRow[] }>(url.toString());
  return data ?? [];
}

/** "Pramoedya Ananta Toer ; editor, Astuti" -> "Pramoedya Ananta Toer"; "penulis dan ilustrator, Andrea" -> "Andrea". */
function perpusnasAuthor(kepeng = "") {
  return kepeng
    .split(";")[0]
    .replace(/^\s*(penulis dan ilustrator|penulis|pengarang|penyusun|karya|oleh|editor|ilustrator)\s*,?\s*/i, "")
    .trim();
}

async function searchPerpusnas(query: string, isbn: string | null): Promise<Found[]> {
  const rows = isbn
    ? await perpusnasQuery(isbn, null)
    : // Judul dan pengarang dicari bersamaan; hasil judul didahulukan.
      (await Promise.all([perpusnasQuery(query, "title"), perpusnasQuery(query, "kepeng")])).flat();

  const seen = new Set<string>();
  const books: Found[] = [];
  for (const r of rows) {
    const code = r.code && normalizeIsbn(r.code);
    if (!code || seen.has(code)) continue;
    seen.add(code);
    const digital = r.jenis_media !== undefined && r.jenis_media !== "cetak";
    books.push({
      source: "perpusnas",
      ref: code,
      workKey: null,
      isbns: [code],
      // Judul edisi digital diberi tanda "[sumber elektronis]"; tandanya dibuang, keterangan edisinya dicatat di bawah.
      title: r.title.replace(/\s*\[sumber elektronis\]\s*/i, " ").replace(/\s+/g, " ").trim(),
      author: perpusnasAuthor(r.kepeng),
      year: Number(r.tahun_terbit) || null,
      pages: Number(r.jml_hlm) || null,
      publisher: r.nama_penerbit?.trim() ?? "",
      isbn: code,
      // Semua buku ber-ISBN Indonesia; yang terjemahan ditandai Perpusnas, bahasanya tidak selalu Indonesia.
      language: r.jenis_kategori === "non terjemahan" ? "Indonesia" : null,
      synopsis: r.sinopsis?.trim() ?? "",
      cover: null,
      thumb: null,
      edition: digital ? "Edisi digital" : null,
    });
  }
  // Edisi cetak didahulukan: itu yang biasanya ada di rak.
  return books.sort((a, b) => Number(!!a.edition) - Number(!!b.edition));
}

/**
 * Sampul Open Library menurut ISBN, bila ada. Dicek dulu karena alamat ISBN tanpa sampul mengembalikan 404.
 * Kuota Open Library untuk pencarian sampul per ISBN terbatas, jadi hanya dipakai untuk beberapa hasil teratas.
 */
async function openLibraryCoverByIsbn(isbn: string) {
  const res = await fetch(`https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg?default=false`, {
    method: "HEAD",
    headers: { "User-Agent": USER_AGENT },
    redirect: "manual",
    signal: AbortSignal.timeout(2500),
    cache: "no-store",
  });
  if (res.status < 300 || res.status >= 400) return null;
  return {
    cover: `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`,
    thumb: `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`,
  };
}

/** "Bumi Manusia: Roman" -> "bumi manusia roman", untuk membandingkan judul antarsumber. */
const plain = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Nama belakang pengarang pertama: "Pramoedya Ananta Toer" -> "toer". */
const surname = (author: string) => plain(author.split(",")[0]).split(" ").pop() ?? "";

/** Karya yang sama dari edisi lain: judul utama sama dan nama belakang pengarang pertama sama. */
function sameWork(a: SourceBook, b: SourceBook) {
  const title = (t: string) => plain(t.split(/[:;]/)[0]);
  return !!a.author && !!b.author && title(a.title) === title(b.title) && surname(a.author) === surname(b.author);
}

/** Berapa hasil Perpusnas tanpa sampul yang dicarikan sampulnya per ISBN di Open Library. */
const COVER_LOOKUPS = 6;

/** Cari di semua sumber sekaligus. Sumber yang gagal dilewati; `failed` menyebut yang gagal. */
export async function searchSources(query: string): Promise<{ results: SourceBook[]; failed: string[] }> {
  const isbn = normalizeIsbn(query);
  const key = process.env.GOOGLE_BOOKS_API_KEY;
  const jobs: Array<[string, Promise<Found[]>]> = [
    ["Perpusnas", searchPerpusnas(query, isbn)],
    ["Open Library", searchOpenLibrary(query, isbn)],
  ];
  if (key) jobs.push(["Google Books", searchGoogle(query, isbn, key)]);

  const settled = await Promise.allSettled(jobs.map(([, p]) => p));
  const failed = jobs.filter((_, i) => settled[i].status === "rejected").map(([name]) => name);
  const [perpusnas, ...others] = settled.map((r) => (r.status === "fulfilled" ? r.value : []));
  const rest = others.flat();

  // Buku yang sama di sumber lain melengkapi data Perpusnas, lalu tidak ditampilkan dua kali. Yang ISBN-nya sama
  // didahulukan; bila tidak ada, karya yang sama (judul sama, nama belakang pengarang sama) dari edisi lain.
  const used = new Set<Found>();
  for (const book of perpusnas) {
    const sameIsbn = rest.filter((o) => !used.has(o) && o.isbns.some((i) => normalizeIsbn(i) === book.ref));
    const twins = sameIsbn.length ? sameIsbn : rest.filter((o) => !used.has(o) && sameWork(o, book)).slice(0, 1);
    if (!twins.length) continue;
    twins.forEach((t) => used.add(t));
    const withCover = twins.find((t) => t.cover);
    book.cover = withCover?.cover ?? null;
    book.thumb = withCover?.thumb ?? null;
    book.workKey = twins.find((t) => t.workKey)?.workKey ?? null;
    book.synopsis ||= twins.find((t) => t.synopsis)?.synopsis ?? "";
    // Jumlah halaman berbeda antaredisi, jadi hanya diambil dari ISBN yang sama.
    if (sameIsbn.length) book.pages ??= twins.find((t) => t.pages)?.pages ?? null;
  }
  await Promise.all(
    perpusnas
      .filter((b) => !b.cover)
      .slice(0, COVER_LOOKUPS)
      .map(async (b) => Object.assign(b, await openLibraryCoverByIsbn(b.ref).catch(() => null))),
  );

  // Data Perpusnas (buku terbitan Indonesia) didahulukan, lalu sumber lain. Dalam tiap kelompok, yang punya sampul
  // didahulukan karena sampul adalah alasan utama mencari di sini. Perpusnas dibatasi supaya sumber lain tetap tampil.
  const coverFirst = <T extends SourceBook>(list: T[]) => list.sort((a, b) => Number(!a.cover) - Number(!b.cover));
  const results: SourceBook[] = [
    ...coverFirst(perpusnas).slice(0, 10),
    ...coverFirst(rest.filter((o) => !used.has(o))),
  ].map((found) => {
    const { isbns, ...book } = found;
    void isbns; // hanya untuk pencocokan di server
    return book;
  });
  return { results: results.slice(0, 18), failed };
}

/** Sinopsis Open Library ada di data karya, bukan di hasil pencarian. */
export async function openLibraryDescription(workKey: string): Promise<string> {
  if (!/^\/works\/OL\d+W$/.test(workKey)) return "";
  const work = await getJson<{ description?: string | { value: string } }>(`https://openlibrary.org${workKey}.json`);
  const d = typeof work.description === "string" ? work.description : (work.description?.value ?? "");
  // Buang tautan dan catatan sumber yang sering menempel di akhir deskripsi Open Library.
  const clean = d
    .split(/\n-{3,}|\(\[source\]/)[0]
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();
  // Deskripsi panjang sering memuat kutipan ulasan. Ambil paragraf awal secukupnya untuk sinopsis.
  let out = "";
  for (const para of clean.split(/\n\s*\n/)) {
    if (out && out.length + para.length > 900) break;
    out = out ? `${out}\n\n${para.trim()}` : para.trim();
  }
  return out.length > 1200 ? `${out.slice(0, 1200).replace(/\s+\S*$/, "")}…` : out;
}

const COVER_HOSTS = ["covers.openlibrary.org", "archive.org", "books.google.com", "books.googleusercontent.com"];
const allowedHost = (host: string) => COVER_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
const MAX_COVER_BYTES = 8 * 1024 * 1024;

/** Alamat sampul yang boleh disimpan dan diunduh nanti: https dari host sampul yang dikenal. */
export function isAllowedCoverUrl(url: string) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && allowedHost(u.hostname);
  } catch {
    return false;
  }
}

/**
 * Unduh gambar sampul dari sumber publik. Hanya host sampul yang dikenal yang boleh, termasuk di setiap
 * pengalihan, supaya server tidak bisa disuruh mengambil alamat sembarang.
 */
export async function downloadCover(url: string): Promise<Buffer> {
  let target = new URL(url);
  for (let hop = 0; hop < 4; hop++) {
    if (target.protocol !== "https:" || !allowedHost(target.hostname)) throw new Error("host sampul tidak dikenal");
    const res = await fetch(target, {
      headers: { "User-Agent": USER_AGENT },
      redirect: "manual",
      signal: AbortSignal.timeout(12_000),
      cache: "no-store",
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      target = new URL(res.headers.get("location")!, target);
      continue;
    }
    if (!res.ok || !res.body) throw new Error(`sampul ${res.status}`);
    if (Number(res.headers.get("content-length") ?? 0) > MAX_COVER_BYTES) throw new Error("sampul terlalu besar");

    const chunks: Uint8Array[] = [];
    let size = 0;
    const reader = res.body.getReader();
    for (let r = await reader.read(); !r.done; r = await reader.read()) {
      size += r.value.length;
      if (size > MAX_COVER_BYTES) {
        await reader.cancel();
        throw new Error("sampul terlalu besar");
      }
      chunks.push(r.value);
    }
    return Buffer.concat(chunks);
  }
  throw new Error("terlalu banyak pengalihan");
}

export type SearchResponse = { ok: true; results: SourceBook[]; failed: string[] } | { ok: false; error: string };

/** Pencarian untuk formulir (admin dan sumbangan): validasi panjang kueri dan pesan galat yang bisa ditampilkan. */
export async function searchForForm(query: string): Promise<SearchResponse> {
  const q = query.trim().slice(0, 120);
  if (q.length < 2) return { ok: false, error: "Ketik judul, penulis, atau ISBN minimal 2 huruf." };
  const { results, failed } = await searchSources(q);
  if (results.length === 0 && failed.length > 0) {
    return { ok: false, error: `${failed.join(" dan ")} sedang tidak bisa dihubungi. Coba lagi sebentar, atau isi manual.` };
  }
  return { ok: true, results, failed };
}
