"use client";

// Galat di layout akar: menggantikan seluruh halaman, jadi gaya dibuat mandiri tanpa CSS aplikasi.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const hidden = !error.message || /specific message is omitted in production|Minified React error/i.test(error.message);
  return (
    <html lang="id">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#ECEFE9", color: "#1D2B28" }}>
        <main style={{ maxWidth: 640, margin: "0 auto", padding: "64px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
          <p style={{ margin: 0, fontFamily: "monospace", fontSize: 14, color: "#7A4B26" }}>500 · sedang dalam perbaikan</p>
          <h1 style={{ margin: 0, fontSize: 36, lineHeight: 1.15 }}>Lembar sedang dirapikan.</h1>
          <p style={{ margin: 0, fontSize: 17, lineHeight: 1.6, color: "#4A5B56" }}>
            Ada yang tidak beres di sisi kami, jadi halaman ini belum bisa dibuka. Datamu aman. Coba lagi sebentar lagi.
          </p>
          <p role="alert" style={{ margin: 0, padding: "12px 16px", borderRadius: 14, background: "#F3E3D3", color: "#7A4B26", fontWeight: 600 }}>
            {hidden ? "Rincian galat disembunyikan server demi keamanan." : error.message}
            {error.digest && <span style={{ display: "block", fontFamily: "monospace", fontWeight: 400, marginTop: 4 }}>Kode galat: {error.digest}</span>}
          </p>
          <button type="button" onClick={reset} style={{ alignSelf: "flex-start", minHeight: 48, padding: "0 22px", borderRadius: 999, border: 0, background: "#2E5A52", color: "#F3F1E7", fontWeight: 600, fontSize: 15, cursor: "pointer" }}>
            Coba lagi
          </button>
        </main>
      </body>
    </html>
  );
}
