import "server-only";

/**
 * Pencarian data buku di katalog publik, untuk mengisi formulir tambah buku.
 * Open Library selalu dipakai (tanpa kunci). Google Books ikut dicari bila GOOGLE_BOOKS_API_KEY diisi;
 * tanpa kunci, kuota bersamanya sering habis.
 */

export type SourceBook = {
  source: "openlibrary" | "google";
  /** Kunci di sumbernya: "/works/OL…W" untuk Open Library, id volume untuk Google Books. */
  ref: string;
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

async function searchOpenLibrary(query: string, isbn: string | null): Promise<SourceBook[]> {
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

async function searchGoogle(query: string, isbn: string | null, key: string): Promise<SourceBook[]> {
  const url = new URL("https://www.googleapis.com/books/v1/volumes");
  url.searchParams.set("q", isbn ? `isbn:${isbn}` : query);
  url.searchParams.set("maxResults", "10");
  url.searchParams.set("key", key);
  const { items = [] } = await getJson<{ items?: GoogleVolume[] }>(url.toString());
  return items.map(({ id, volumeInfo: v }) => {
    const image = v.imageLinks?.thumbnail?.replace(/^http:/, "https:").replace("&edge=curl", "") ?? null;
    return {
      source: "google",
      ref: id,
      title: v.subtitle ? `${v.title}: ${v.subtitle}` : v.title,
      author: (v.authors ?? []).slice(0, 3).join(", "),
      year: Number(v.publishedDate?.slice(0, 4)) || null,
      pages: v.pageCount || null,
      publisher: v.publisher ?? "",
      isbn: pickIsbn(v.industryIdentifiers?.map((i) => i.identifier)),
      language: (v.language && LANGUAGES[v.language]) ?? null,
      synopsis: v.description ? stripHtml(v.description) : "",
      cover: image,
      thumb: image,
    };
  });
}

/** Cari di semua sumber sekaligus. Sumber yang gagal dilewati; `failed` menyebut yang gagal. */
export async function searchSources(query: string) {
  const isbn = normalizeIsbn(query);
  const key = process.env.GOOGLE_BOOKS_API_KEY;
  const jobs: Array<[string, Promise<SourceBook[]>]> = [["Open Library", searchOpenLibrary(query, isbn)]];
  if (key) jobs.push(["Google Books", searchGoogle(query, isbn, key)]);

  const settled = await Promise.allSettled(jobs.map(([, p]) => p));
  const results = settled.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  const failed = jobs.filter((_, i) => settled[i].status === "rejected").map(([name]) => name);
  // Yang punya sampul didahulukan: itulah alasan utama mencari di sini.
  results.sort((a, b) => Number(!a.cover) - Number(!b.cover));
  return { results: results.slice(0, 16), failed };
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
