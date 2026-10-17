"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteAccount } from "@/app/profil/actions";
import { PasswordField } from "@/components/auth/PasswordField";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Trash } from "@/components/icons";
import { useToast } from "@/components/Toast";
import { ui } from "@/components/ui";
import { cn } from "@/lib/cn";
import { clearActivity } from "@/lib/idle";

/** Hapus akun dari halaman Profil. Kata sandi diminta lagi di jendela konfirmasi; pesan galat tampil di sana. */
export function DeleteAccount() {
  const router = useRouter();
  const notify = useToast();
  const [, startNavigation] = useTransition();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const close = () => {
    setOpen(false);
    setPassword("");
    setError("");
  };

  async function confirm() {
    if (!password) return setError("Isi kata sandimu dulu.");
    setBusy(true);
    setError("");
    const result = await deleteAccount(password).catch(() => ({
      ok: false as const,
      error: "Gagal menghapus akun. Periksa koneksi lalu coba lagi.",
    }));
    setBusy(false);
    if (!result.ok) return setError(result.error);
    clearActivity();
    setOpen(false);
    notify({ kind: "ok", text: "Akunmu sudah dihapus. Terima kasih sudah membaca bersama Lembar." });
    startNavigation(() => {
      router.replace("/");
      router.refresh();
    });
  }

  return (
    <section className={cn(ui.card, "mt-10 flex flex-col gap-3")}>
      <h2 className="display m-0 text-[32px] leading-none">Hapus akun</h2>
      <p className="m-0 max-w-[60ch] text-[15px] leading-relaxed text-ink-3">
        Akun, profil, foto, riwayat pinjam, sumbangan, ulasan, dan pendaftaran agendamu akan dihapus permanen. Buku
        yang masih dipinjam atau dibooking perlu dikembalikan atau dibatalkan dulu.
      </p>
      <div>
        <button type="button" className={cn(ui.btn, ui.ghost, "text-accent-700")} onClick={() => setOpen(true)}>
          <Trash />
          Hapus akun
        </button>
      </div>
      {open && (
        <ConfirmDialog
          title="Hapus akunmu secara permanen?"
          confirmLabel="Ya, hapus akun"
          busy={busy}
          onConfirm={confirm}
          onCancel={close}
        >
          <div className="flex flex-col gap-3 pt-1">
            <p className="m-0">Tindakan ini tidak bisa dibatalkan. Masukkan kata sandimu untuk melanjutkan.</p>
            <PasswordField
              id="hapus-sandi"
              label="Kata sandi"
              autoComplete="current-password"
              value={password}
              disabled={busy}
              aria-invalid={!!error}
              aria-describedby={error ? "hapus-sandi-galat" : undefined}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && !busy && confirm()}
              hint={
                error && (
                  <p id="hapus-sandi-galat" role="alert" className="m-0 text-[13px] font-semibold text-accent-700">
                    {error}
                  </p>
                )
              }
            />
          </div>
        </ConfirmDialog>
      )}
    </section>
  );
}
