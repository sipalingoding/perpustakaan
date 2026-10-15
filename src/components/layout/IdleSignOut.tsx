"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { ui } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/cn";
import { IDLE_SIGN_OUT, clearActivity, markActivity, readActivity } from "@/lib/idle";

const ACTIVITY = ["pointerdown", "pointermove", "keydown", "wheel", "scroll", "touchstart"] as const;

/**
 * Mengakhiri sesi setelah anggota tidak aktif selama `minutes`. Peringatan muncul sebelum waktunya habis (paling lama
 * satu menit, atau seperempat batas untuk batas yang pendek); gerakan apa pun membatalkannya. Tab yang dibuka lagi
 * setelah lama tertutup langsung dikeluarkan, karena waktu aktivitas terakhir tersimpan di localStorage.
 */
export function IdleSignOut({ minutes }: { minutes: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startNavigation] = useTransition();
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [error, setError] = useState("");
  const leaving = useRef(false);

  const timeout = minutes * 60_000;
  const warnFor = Math.min(60_000, timeout / 4);

  const signOut = useCallback(async () => {
    if (leaving.current) return;
    leaving.current = true;
    setError("");
    try {
      const { error } = await authClient.signOut();
      // Tab lain mungkin sudah mengakhiri sesinya lebih dulu; yang penting sesinya memang sudah tidak ada.
      if (error && (await authClient.getSession()).data) throw error;
    } catch {
      setError("Sesimu habis karena tidak aktif, tapi gagal keluar otomatis. Periksa koneksi lalu coba lagi.");
      return;
    }
    clearActivity();
    const to = new URLSearchParams({ keluar: IDLE_SIGN_OUT, menit: String(minutes), lanjut: pathname });
    startNavigation(() => {
      router.push(`/masuk?${to}`);
      router.refresh();
    });
  }, [minutes, pathname, router]);

  useEffect(() => {
    let last = readActivity();
    // Belum ada catatan (mis. sesi dari sebelum fitur ini ada): mulai hitung dari sekarang.
    if (!last) {
      last = Date.now();
      markActivity(last);
    }

    const check = () => {
      if (leaving.current) return;
      last = Math.max(last, readActivity());
      const idle = Date.now() - last;
      if (idle >= timeout) {
        setSecondsLeft(null);
        void signOut();
      } else if (idle >= timeout - warnFor) {
        setSecondsLeft(Math.ceil((timeout - idle) / 1000));
      } else {
        setSecondsLeft(null);
      }
    };

    let written = 0;
    const onActivity = () => {
      if (leaving.current) return;
      const now = Date.now();
      last = now;
      // pointermove dan scroll bisa ratusan kali per detik; cukup tulis sekali per detik.
      if (now - written > 1000) {
        written = now;
        markActivity(now);
        setSecondsLeft(null);
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };

    check();
    const tick = setInterval(check, 1000);
    for (const type of ACTIVITY) window.addEventListener(type, onActivity, { passive: true, capture: true });
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("storage", check);
    return () => {
      clearInterval(tick);
      for (const type of ACTIVITY) window.removeEventListener(type, onActivity, { capture: true });
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("storage", check);
    };
  }, [timeout, warnFor, signOut]);

  if (!error && secondsLeft === null) return null;

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-[calc(16px+env(safe-area-inset-bottom,0px))] z-50 flex justify-center">
      <div
        role="alertdialog"
        aria-labelledby="idle-title"
        aria-describedby="idle-desc"
        className="pointer-events-auto flex w-full max-w-[460px] animate-pop flex-col gap-3 rounded-[20px] border border-line bg-paper p-5 shadow-[0_24px_44px_-22px_rgba(29,43,40,.6)]"
      >
        {error ? (
          <>
            <strong id="idle-title" className="text-[15px] text-ink">
              Gagal keluar otomatis
            </strong>
            <p id="idle-desc" role="alert" className="m-0 text-sm leading-snug text-accent-700">
              {error}
            </p>
            <button
              type="button"
              className={cn(ui.btn, ui.primary, "self-start")}
              onClick={() => {
                leaving.current = false;
                void signOut();
              }}
            >
              Coba keluar lagi
            </button>
          </>
        ) : (
          <>
            <strong id="idle-title" className="text-[15px] text-ink">
              Masih di sana?
            </strong>
            <p id="idle-desc" className="m-0 text-sm leading-snug text-ink-2">
              Kamu tidak aktif cukup lama. Demi keamanan, kamu akan keluar otomatis dalam{" "}
              <strong className="text-ink tabular-nums">{secondsLeft} detik</strong>.
            </p>
            <button
              type="button"
              className={cn(ui.btn, ui.primary, "self-start")}
              onClick={() => {
                markActivity();
                setSecondsLeft(null);
              }}
            >
              Tetap masuk
            </button>
          </>
        )}
      </div>
    </div>
  );
}
