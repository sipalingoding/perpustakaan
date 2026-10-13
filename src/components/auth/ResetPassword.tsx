"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { landingAfterSignIn } from "@/app/masuk/actions";
import { PasswordField } from "@/components/auth/PasswordField";
import { ArrowLeft, ArrowRight, Check, Mail, Spinner } from "@/components/icons";
import { ui } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/cn";

type Step = "email" | "kode" | "selesai";

const RESEND_SECONDS = 60;
const MIN_PASSWORD = 8;

/** Galat dari Neon Auth (kode atau pesan) dalam bahasa Indonesia. */
function resetError(error: unknown) {
  const { code = "", status, message = "" } = (error ?? {}) as { code?: string; status?: number; message?: string };
  const key = `${code} ${message}`.toLowerCase();
  if (status === 429 || key.includes("rate_limit") || key.includes("too many requests")) {
    return "Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.";
  }
  if (key.includes("too_many_attempts") || key.includes("too many attempts")) {
    return "Kode salah terlalu sering. Minta kode baru lalu coba lagi.";
  }
  if (key.includes("expired")) return "Kodenya sudah kedaluwarsa. Minta kode baru, ya.";
  if (key.includes("otp") || key.includes("invalid")) return "Kodenya belum cocok. Periksa lagi 6 angka di email.";
  if (key.includes("password") && (key.includes("short") || key.includes("weak"))) {
    return `Kata sandi baru minimal ${MIN_PASSWORD} karakter.`;
  }
  if (key.includes("email")) return "Alamat email belum benar.";
  return "Belum berhasil. Periksa koneksi lalu coba lagi.";
}

/**
 * Lupa kata sandi dalam tiga langkah: isi email, isi kode 6 angka yang dikirim Neon Auth ke email itu beserta kata
 * sandi baru, lalu langsung masuk. Pesan setelah langkah pertama sama untuk email yang terdaftar maupun tidak,
 * supaya halaman ini tidak bisa dipakai menebak email anggota.
 */
export function ResetPassword() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [signedIn, setSignedIn] = useState(false);
  // Pindah halaman sebagai transisi, supaya tombol tidak tertinggal dalam keadaan sibuk di halaman yang disimpan Next.
  const [navigating, startNavigation] = useTransition();
  const heading = useRef<HTMLHeadingElement>(null);
  const firstStep = useRef(true);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Pindah langkah: fokus ke judul supaya pembaca layar mendengar langkah barunya.
  useEffect(() => {
    if (firstStep.current) {
      firstStep.current = false;
      return;
    }
    heading.current?.focus();
  }, [step]);

  const sendCode = async () => {
    const address = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      setError("Alamat email belum benar.");
      return false;
    }
    setPending(true);
    setError("");
    setInfo("");
    try {
      const { error } = await authClient.emailOtp.sendVerificationOtp({ email: address, type: "forget-password" });
      if (error) {
        setError(resetError(error));
        return false;
      }
      setCooldown(RESEND_SECONDS);
      return true;
    } catch (e) {
      setError(resetError(e));
      return false;
    } finally {
      setPending(false);
    }
  };

  const submitEmail = async (e: FormEvent) => {
    e.preventDefault();
    if (await sendCode()) setStep("kode");
  };

  const resend = async () => {
    setOtp("");
    if (await sendCode()) setInfo("Kode baru sudah dikirim. Kode yang lama tidak berlaku lagi.");
  };

  const submitReset = async (e: FormEvent) => {
    e.preventDefault();
    setInfo("");
    if (!/^\d{6}$/.test(otp)) return setError("Kodenya 6 angka. Salin dari email yang kami kirim.");
    if (password.length < MIN_PASSWORD) return setError(`Kata sandi baru minimal ${MIN_PASSWORD} karakter.`);
    if (password !== confirm) return setError("Kedua kata sandi belum sama. Ketik ulang, ya.");

    setPending(true);
    setError("");
    try {
      const { error } = await authClient.emailOtp.resetPassword({ email: email.trim(), otp, password });
      if (error) {
        setError(resetError(error));
        setPending(false);
        return;
      }
    } catch (e) {
      setError(resetError(e));
      setPending(false);
      return;
    }

    // Kata sandi sudah diganti. Coba langsung masuk; bila gagal, anggota tinggal masuk manual.
    try {
      const { error } = await authClient.signIn.email({ email: email.trim(), password });
      setSignedIn(!error);
    } catch {
      setSignedIn(false);
    }
    setPassword("");
    setConfirm("");
    setPending(false);
    setStep("selesai");
  };

  const goOn = async () => {
    setPending(true);
    try {
      const target = await landingAfterSignIn(null);
      setPending(false);
      startNavigation(() => {
        router.push(target);
        router.refresh();
      });
    } catch {
      setPending(false);
      setError("Gagal membuka halaman berikutnya. Periksa koneksi lalu coba lagi.");
    }
  };

  const STEPS: Array<{ key: Step; label: string }> = [
    { key: "email", label: "Email" },
    { key: "kode", label: "Kata sandi baru" },
    { key: "selesai", label: "Selesai" },
  ];
  const current = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="w-full max-w-[500px] animate-fade-up rounded-[26px] border border-line bg-cream px-6 py-8 shadow-[0_40px_70px_-40px_rgba(29,43,40,.5)] min-[480px]:px-10 min-[480px]:py-10">
      <ol className="m-0 mb-7 flex list-none gap-2 p-0" aria-label="Langkah">
        {STEPS.map((s, i) => (
          <li key={s.key} className="flex flex-1 flex-col gap-1.5" aria-current={i === current ? "step" : undefined}>
            <span className={cn("h-1.5 rounded-full", i <= current ? "bg-primary-600" : "bg-primary-200")} />
            <span className={cn("text-xs font-semibold", i === current ? "text-ink" : "text-muted")}>{s.label}</span>
          </li>
        ))}
      </ol>

      {step === "email" && (
        <form onSubmit={submitEmail} noValidate className="flex flex-col gap-4">
          <h1
            ref={heading}
            tabIndex={-1}
            className="display m-0 text-[clamp(34px,6vw,44px)] leading-[1.05] focus:outline-none"
          >
            Lupa kata sandi?
          </h1>
          <p className="m-0 text-[15px] leading-relaxed text-ink-3">
            Tulis email yang terdaftar di kartu anggotamu. Kami kirim kode 6 angka untuk membuat kata sandi baru.
          </p>
          <div className="flex flex-col gap-2">
            <label htmlFor="r-email" className={ui.label}>
              Email
            </label>
            <input
              id="r-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              placeholder="nama@email.com"
              autoComplete="email"
              required
              aria-invalid={!!error}
              aria-describedby={error ? "r-error" : undefined}
              className={ui.field}
            />
          </div>
          <Alert id="r-error" message={error} />
          <button
            type="submit"
            disabled={pending}
            aria-busy={pending}
            className={cn(ui.btn, ui.primary, "disabled:cursor-wait")}
          >
            Kirim kode
            {pending ? <Spinner /> : <ArrowRight />}
          </button>
          <BackToSignIn />
        </form>
      )}

      {step === "kode" && (
        <form onSubmit={submitReset} noValidate className="flex flex-col gap-4">
          <h1
            ref={heading}
            tabIndex={-1}
            className="display m-0 text-[clamp(34px,6vw,44px)] leading-[1.05] focus:outline-none"
          >
            Cek emailmu
          </h1>
          <p className="m-0 flex gap-2.5 rounded-[14px] bg-primary-100 px-4 py-3 text-sm leading-relaxed text-primary-700">
            <Mail size={20} className="mt-0.5 shrink-0" />
            <span>
              Kalau <strong className="break-all">{email.trim()}</strong> terdaftar, kode 6 angka sudah dikirim ke sana
              dari auth@mail.myneon.app. Belum masuk? Cek folder spam atau promosi.
            </span>
          </p>
          <div className="flex flex-col gap-2">
            <label htmlFor="r-otp" className={ui.label}>
              Kode dari email
            </label>
            <input
              id="r-otp"
              value={otp}
              onChange={(e) => {
                setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                setError("");
              }}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              maxLength={6}
              required
              className={cn(ui.field, "text-center font-mono text-[22px] tracking-[0.5em]")}
            />
          </div>
          <PasswordField
            id="r-pass"
            label="Kata sandi baru"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError("");
            }}
            placeholder={`Minimal ${MIN_PASSWORD} karakter`}
            autoComplete="new-password"
            minLength={MIN_PASSWORD}
            required
          />
          <PasswordField
            id="r-pass2"
            label="Ulangi kata sandi baru"
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value);
              setError("");
            }}
            autoComplete="new-password"
            required
          />
          <Alert id="r-error" message={error} />
          <div role="status" aria-live="polite" className="empty:hidden">
            {info && <p className="m-0 text-sm font-semibold text-primary-700">{info}</p>}
          </div>
          <button
            type="submit"
            disabled={pending}
            aria-busy={pending}
            className={cn(ui.btn, ui.primary, "disabled:cursor-wait")}
          >
            Simpan kata sandi baru
            {pending ? <Spinner /> : <Check />}
          </button>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setOtp("");
                setError("");
                setInfo("");
              }}
              className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 border-0 bg-transparent px-0 font-semibold text-ink-2 hover:text-ink"
            >
              <ArrowLeft size={18} />
              Ganti email
            </button>
            <button
              type="button"
              onClick={resend}
              disabled={pending || cooldown > 0}
              className="min-h-11 cursor-pointer border-0 bg-transparent px-0 font-semibold text-primary-600 underline underline-offset-[3px] disabled:cursor-default disabled:text-muted disabled:no-underline"
            >
              {cooldown > 0 ? `Kirim ulang dalam ${cooldown} detik` : "Kirim ulang kode"}
            </button>
          </div>
        </form>
      )}

      {step === "selesai" && (
        <div className="flex flex-col gap-4">
          <span className="inline-flex size-14 items-center justify-center rounded-full bg-primary-100 text-primary-700">
            <Check size={30} />
          </span>
          <h1
            ref={heading}
            tabIndex={-1}
            className="display m-0 text-[clamp(34px,6vw,44px)] leading-[1.05] focus:outline-none"
          >
            Kata sandi diganti.
          </h1>
          <p className="m-0 text-[15px] leading-relaxed text-ink-3">
            {signedIn
              ? "Kamu sudah masuk dengan kata sandi baru. Pakai kata sandi ini mulai sekarang, di perangkat mana pun."
              : "Kata sandi barumu sudah tersimpan. Masuk sekali lagi dengan kata sandi baru itu."}
          </p>
          <Alert id="r-error" message={error} />
          {signedIn ? (
            <button
              type="button"
              onClick={goOn}
              disabled={pending || navigating}
              aria-busy={pending || navigating}
              className={cn(ui.btn, ui.primary, "disabled:cursor-wait")}
            >
              Lanjut ke perpustakaan
              {pending || navigating ? <Spinner /> : <ArrowRight />}
            </button>
          ) : (
            <Link href="/masuk" className={cn(ui.btn, ui.primary)}>
              Masuk sekarang
              <ArrowRight />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function Alert({ id, message }: { id: string; message: string }) {
  return (
    <div role="alert" className="empty:hidden">
      {message && (
        <p id={id} className="m-0 rounded-[14px] bg-accent-50 px-4 py-3 text-sm leading-snug text-accent-700">
          {message}
        </p>
      )}
    </div>
  );
}

function BackToSignIn() {
  return (
    <Link href="/masuk" className="inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-semibold">
      <ArrowLeft size={18} />
      Kembali ke halaman masuk
    </Link>
  );
}
