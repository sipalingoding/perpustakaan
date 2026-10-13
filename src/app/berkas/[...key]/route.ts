import { NoSuchKey } from "@aws-sdk/client-s3";
import { FILE_KEY, getFile } from "@/lib/server/storage";
import { getViewer } from "@/lib/server/session";

/**
 * Berkas dari bucket privat "uploads". Sampul buku dan foto agenda terbuka untuk tamu (katalog dan Agenda juga terbuka);
 * foto profil hanya untuk anggota yang masuk. Kuncinya unik per versi, jadi aman di-cache setahun.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const key = (await params).key.join("/");
  if (!FILE_KEY.test(key)) return new Response(null, { status: 404 });

  const isAvatar = key.startsWith("avatars/");
  if (isAvatar && !(await getViewer())) return new Response(null, { status: 401 });

  try {
    const file = await getFile(key);
    if (!file.body) return new Response(null, { status: 404 });
    return new Response(file.body, {
      headers: {
        "Content-Type": file.contentType,
        ...(file.length ? { "Content-Length": String(file.length) } : {}),
        "Cache-Control": `${isAvatar ? "private" : "public"}, max-age=31536000, immutable`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    if (e instanceof NoSuchKey) return new Response(null, { status: 404 });
    throw e;
  }
}
