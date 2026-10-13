import { utc } from "@/lib/dates";

/** Data contoh peminjaman milik anggota yang sedang masuk. */
export type Loan = {
  id: string;
  title: string;
  author: string;
  slug?: string;
  start: number;
  due: number;
  color: string;
  status: "returned" | "active" | "reserved";
};

export const LOANS: Loan[] = [
  {
    id: "l4",
    title: "Mengukur Laut",
    author: "Nadia Kirana",
    slug: "mengukur-laut",
    start: utc(2026, 8, 19),
    due: utc(2026, 9, 2),
    color: "#5C7395",
    status: "returned",
  },
  {
    id: "l5",
    title: "Sejarah Kecil Secangkir Teh",
    author: "Dimas Pramudya",
    slug: "sejarah-kecil-secangkir-teh",
    start: utc(2026, 9, 6),
    due: utc(2026, 9, 20),
    color: "#9AAE8E",
    status: "returned",
  },
  {
    id: "l1",
    title: "Kebun di Ujung Hujan",
    author: "Laras Wening",
    slug: "kebun-di-ujung-hujan",
    start: utc(2026, 9, 28),
    due: utc(2026, 10, 12),
    color: "#4F6F66",
    status: "active",
  },
  {
    id: "l2",
    title: "Peta Bintang Nenek",
    author: "Bima Aryasatya",
    slug: "peta-bintang-nenek",
    start: utc(2026, 10, 1),
    due: utc(2026, 10, 15),
    color: "#2F4A5C",
    status: "active",
  },
  {
    id: "l3",
    title: "Surat dari Teluk Sunyi",
    author: "Ratri Anggun",
    slug: "surat-dari-teluk-sunyi",
    start: utc(2026, 10, 9),
    due: utc(2026, 10, 23),
    color: "#D9A77E",
    status: "reserved",
  },
];
