import "server-only";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

/**
 * Berkas unggahan (foto profil, sampul buku, dokumentasi agenda) di Neon Object Storage, bucket privat "uploads".
 * Kredensial, endpoint, dan region dibaca dari variabel AWS_* yang disuntikkan Neon (lihat `neon env pull`).
 * Database hanya menyimpan kuncinya. Setiap versi berkas mendapat kunci baru, jadi alamatnya boleh di-cache selamanya.
 */
export const UPLOADS_BUCKET = "uploads";

const globalForS3 = globalThis as unknown as { lembarS3?: S3Client };

function client() {
  return (globalForS3.lembarS3 ??= new S3Client({
    endpoint: process.env.AWS_ENDPOINT_URL_S3,
    region: process.env.AWS_REGION,
    // Neon hanya menerima alamat path-style.
    forcePathStyle: true,
  }));
}

/** Kunci berkas yang sah. Juga dipakai rute /berkas untuk menolak alamat lain. */
export const FILE_KEY = /^(avatars|covers|agenda)\/[A-Za-z0-9-]{1,64}\/[0-9a-f-]{36}\.jpg$/;

export const newFileKey = (kind: "avatars" | "covers" | "agenda", ownerId: string) => `${kind}/${ownerId}/${crypto.randomUUID()}.jpg`;

/** Alamat berkas di aplikasi. Dilayani oleh src/app/berkas/[...key]/route.ts. */
export const fileUrl = (key: string) => `/berkas/${key}`;

export async function putFile(key: string, data: Buffer | Uint8Array, contentType = "image/jpeg") {
  await client().send(new PutObjectCommand({ Bucket: UPLOADS_BUCKET, Key: key, Body: data, ContentType: contentType }));
}

export async function getFile(key: string) {
  const res = await client().send(new GetObjectCommand({ Bucket: UPLOADS_BUCKET, Key: key }));
  return { body: res.Body?.transformToWebStream(), contentType: res.ContentType ?? "image/jpeg", length: res.ContentLength };
}

/** Hapus berkas lama. Kegagalan hanya dicatat: berkas yatim tidak merusak apa pun, sedangkan aksi pengguna sudah selesai. */
export async function deleteFile(key: string | null | undefined) {
  if (!key) return;
  try {
    await client().send(new DeleteObjectCommand({ Bucket: UPLOADS_BUCKET, Key: key }));
  } catch (e) {
    console.error(`Gagal menghapus berkas ${key}`, e);
  }
}
