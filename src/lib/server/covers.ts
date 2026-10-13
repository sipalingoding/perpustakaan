import "server-only";
import sharp from "sharp";

const MAX_INPUT_BYTES = 8 * 1024 * 1024;

export type ProcessedCover = { data: Buffer; mime: "image/jpeg"; bg: string; ink: string };


const hex = (n: number) => n.toString(16).padStart(2, "0");

/**
 * Olah gambar sampul apa pun (unggahan atau dari API) jadi JPEG lebar maks. 600 px tanpa metadata.
 * Warna dominan dipakai untuk punggung buku di rak dan latar sampul; tinta dipilih yang kontras.
 * Melempar galat bila berkasnya bukan gambar.
 */
export async function processCover(input: Buffer): Promise<ProcessedCover> {
  if (input.length > MAX_INPUT_BYTES) throw new Error("terlalu besar");
  const image = sharp(input, { limitInputPixels: 40_000_000 }).rotate();
  const meta = await image.metadata();
  if (!meta.width || !meta.height || meta.width < 80 || meta.height < 80) throw new Error("terlalu kecil");

  const data = await image
    .resize({ width: 600, height: 900, fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 84, mozjpeg: true })
    .toBuffer();
  const { dominant: d } = await sharp(data).stats();
  // Luminans relatif sederhana: sampul terang diberi tinta gelap, sampul gelap tinta terang.
  const light = (0.2126 * d.r + 0.7152 * d.g + 0.0722 * d.b) / 255 > 0.55;
  return { data, mime: "image/jpeg", bg: `#${hex(d.r)}${hex(d.g)}${hex(d.b)}`.toUpperCase(), ink: light ? "#1D2B28" : "#F3F1E7" };
}
