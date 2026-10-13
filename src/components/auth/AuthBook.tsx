"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { finishSignUp, landingAfterSignIn, signInWithMemberNo } from "@/app/masuk/actions";
import { useEffect, useRef, useState, useTransition, type ComponentProps, type FormEvent, type ReactNode } from "react";
import { PasswordField } from "@/components/auth/PasswordField";
import { Avatar } from "@/components/Avatar";
import { ArrowRight, IdCard, Mail, Spinner } from "@/components/icons";
import { CoverEmblem } from "@/components/illustrations/CoverEmblem";
import { WindowNight } from "@/components/illustrations/WindowNight";
import { ui } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { AUTH_PROBLEMS, isAuthProblem } from "@/lib/auth-problems";
import { cn } from "@/lib/cn";
import { PERSON } from "@/lib/people";

type Mode = "masuk" | "daftar";

function Field({
  id,
  label,
  aside,
  ...input
}: { id: string; label: string; aside?: ReactNode } & ComponentProps<"input">) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <label className={ui.label} htmlFor={id}>
          {label}
        </label>
        {aside}
      </div>
      <input id={id} className={ui.field} {...input} />
    </div>
  );
}

/**
 * Buku terbuka berisi formulir masuk/daftar.
 * Saat dimuat, sampulnya membuka dan beberapa halaman ikut terbalik;
 * pita pembatas di atas buku dipakai untuk berganti formulir.
 */
export function AuthBook() {
  const [mode, setMode] = useState<Mode>("masuk");
  const [switched, setSwitched] = useState(false);

  const go = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    setSwitched(true);
  };

  return (
    <div className="relative w-full max-w-[1040px]">
      <div
        className={cn(
          "relative grid rounded-2xl bg-cream",
          "min-[821px]:grid-cols-2",
          "shadow-[0_2px_0_#E2E5DB,0_5px_0_#F3F2EA,0_7px_0_#DADFD4,0_10px_0_#F1F0E8,0_12px_0_#D3D9CD,0_50px_80px_-40px_rgba(29,43,40,.5)]",
        )}
      >
        {/* Halaman kiri */}
        <section
          className={cn(
            "flex flex-col rounded-t-2xl border-b border-dashed border-[#CFD6CC] px-6 pt-10 pb-7",
            "min-[821px]:rounded-tr-none min-[821px]:rounded-bl-2xl min-[821px]:border-b-0 min-[821px]:px-14 min-[821px]:pt-[52px] min-[821px]:pb-9 min-[821px]:gutter-l",
          )}
        >
          <div className="flex flex-1 animate-fade-up flex-col gap-5 [animation-delay:1.9s]">
            <span className="text-[11px] font-bold tracking-[0.24em] text-muted uppercase">Lembar · Perpustakaan</span>
            <WindowNight className="block h-auto w-full max-w-[300px]" />
            <h1 className="display m-0 text-[clamp(34px,4vw,48px)] leading-[1.04] text-ink">
              Halaman yang kamu tinggalkan masih <span className="text-primary-500">menunggu</span>.
            </h1>
            <p className="m-0 max-w-[40ch] text-base leading-relaxed text-ink-3">
              Masuk untuk melanjutkan pinjaman, memesan buku berikutnya, dan melihat kapan semuanya perlu kembali ke
              rak.
            </p>
            <span className="mt-auto self-start text-lg font-semibold text-muted">i</span>
          </div>
        </section>

        {/* Halaman kanan */}
        <section
          className={cn(
            "relative flex flex-col rounded-b-2xl px-6 pt-[76px] pb-7",
            "min-[821px]:rounded-tr-2xl min-[821px]:rounded-bl-none min-[821px]:px-14 min-[821px]:pt-[52px] min-[821px]:pb-9 min-[821px]:gutter-r",
          )}
        >
          <div className="absolute -top-3.5 right-10 z-[3] flex gap-2.5">
            <button type="button" className="ribbon" aria-pressed={mode === "masuk"} onClick={() => go("masuk")}>
              Masuk
            </button>
            <button type="button" className="ribbon" aria-pressed={mode === "daftar"} onClick={() => go("daftar")}>
              Daftar
            </button>
          </div>

          {switched && (
            <div
              key={`turn-${mode}`}
              className="leaf z-[2]"
              style={{ animationDuration: "0.95s" }}
              aria-hidden="true"
            />
          )}

          <div
            key={mode}
            className="mt-9 flex max-w-[400px] animate-fade-up flex-col gap-4"
            style={{ animationDelay: switched ? "0.45s" : "1.65s" }}
          >
            {mode === "masuk" ? (
              <SignInForm onSwitch={() => go("daftar")} />
            ) : (
              <SignUpForm onSwitch={() => go("masuk")} />
            )}
          </div>

          <span className="mt-auto self-end pt-5 text-lg font-semibold text-muted">ii</span>

          <div className="leaf" style={{ animationDelay: "0.8s" }} aria-hidden="true" />
          <div className="leaf" style={{ animationDelay: "0.95s" }} aria-hidden="true" />
          <div className="leaf" style={{ animationDelay: "1.1s" }} aria-hidden="true" />
          <div className="auth-cover" aria-hidden="true">
            <div className="face spine-shade flex flex-col items-center justify-center gap-4 rounded-[4px_16px_16px_4px] bg-primary-700 p-10 text-center text-[#E7D8B8] shadow-[0_30px_60px_-30px_rgba(0,0,0,.55)]">
              <div className="absolute inset-[22px] rounded-lg border-[1.5px] border-[rgba(231,216,184,.5)]" />
              <CoverEmblem className="h-[54px] w-[72px]" />
              <span className="display text-[72px] leading-none">Lembar</span>
              <span className="text-xs font-semibold tracking-[0.3em] uppercase">Perpustakaan yang tenang</span>
            </div>
            <div className="face back endpaper" />
          </div>
        </section>
      </div>
    </div>
  );
}

const MESSAGES = {
  credentials: "Email atau kata sandi belum cocok. Periksa lagi, ya.",
  email: "Alamat email belum benar.",
  password: "Kata sandi minimal 8 karakter.",
  exists: "Email ini sudah terdaftar. Coba masuk.",
  rate: "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.",
};
/** Kode galat dari Neon Auth (gaya Supabase, huruf kecil) dan dari Better Auth (huruf besar). */
const ERRORS: Record<string, string> = {
  invalid_credentials: MESSAGES.credentials,
  INVALID_EMAIL_OR_PASSWORD: MESSAGES.credentials,
  email_address_invalid: MESSAGES.email,
  INVALID_EMAIL: MESSAGES.email,
  weak_password: MESSAGES.password,
  PASSWORD_TOO_SHORT: MESSAGES.password,
  user_already_exists: MESSAGES.exists,
  email_exists: MESSAGES.exists,
  USER_ALREADY_EXISTS: MESSAGES.exists,
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: MESSAGES.exists,
  over_request_rate_limit: MESSAGES.rate,
};
const FALLBACK_ERROR = "Belum berhasil. Coba lagi sebentar lagi.";

/** Klien Neon Auth bisa mengembalikan `{ error }` atau melempar AuthApiError; keduanya punya code dan status. */
function errorMessage(error: unknown) {
  const { code, status, message = "" } = (error ?? {}) as { code?: string; status?: number; message?: string };
  if (code && ERRORS[code]) return ERRORS[code];
  if (status === 429) return MESSAGES.rate;
  // Beberapa galat (mis. 422 "User already exists") hanya terbaca dari pesannya setelah dinormalkan klien Neon.
  const text = message.toLowerCase();
  if (text.includes("already exists")) return MESSAGES.exists;
  if (text.includes("invalid email or password")) return MESSAGES.credentials;
  if (text.includes("password") && text.includes("short")) return MESSAGES.password;
  if (text.includes("invalid email")) return MESSAGES.email;
  return FALLBACK_ERROR;
}

/** Hasil permintaan masuk/daftar. `message` = pesan siap tampil (dari aksi server), dipakai apa adanya. */
type AuthResponse = { error: { code?: string; status?: number } | null; message?: string };

/** Kirim formulir ke Neon Auth, tampilkan galat dalam bahasa Indonesia, lalu pindah halaman. */
function useAuthForm(
  request: (data: FormData) => Promise<AuthResponse>,
  afterAuth?: (data: FormData) => Promise<unknown>,
) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  // Pindah halaman dijalankan sebagai transisi: tombol tetap sibuk sampai halaman tujuan tampil, lalu kembali normal.
  // Next menyimpan halaman yang pernah dibuka beserta state-nya, jadi state "sibuk" tidak boleh tertinggal di sini;
  // kalau tertinggal, formulir masuk tampil loading terus saat anggota kembali ke /masuk setelah keluar.
  const [navigating, startNavigation] = useTransition();
  const [error, setError] = useState("");

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    setSubmitting(true);
    setError("");
    try {
      const data = new FormData(form);
      const { error, message } = await request(data);
      if (error || message) {
        setError(message ?? errorMessage(error));
        setSubmitting(false);
        return;
      }
      await afterAuth?.(data);
      // Server yang menentukan tujuan, karena hanya server yang tahu peran akun (pustakawan ke /admin).
      const target = await landingAfterSignIn(new URLSearchParams(window.location.search).get("lanjut"));
      // Kata sandi tidak ikut tersimpan di halaman /masuk yang disimpan Next.
      form.reset();
      setSubmitting(false);
      startNavigation(() => {
        router.push(target);
        router.refresh();
      });
    } catch (e) {
      setError(errorMessage(e));
      setSubmitting(false);
    }
  };

  return { pending: submitting || navigating, error, setError, onSubmit };
}

function FormError({ message }: { message: string }) {
  return (
    <div role="alert" className="min-h-0 empty:hidden">
      {message && (
        <p className="m-0 rounded-[14px] bg-accent-50 px-4 py-3 text-sm leading-snug text-accent-700">{message}</p>
      )}
    </div>
  );
}

type SignInMethod = "email" | "nomor";

function SignInForm({ onSwitch }: { onSwitch: () => void }) {
  const [method, setMethod] = useState<SignInMethod>("email");
  const identifier = useRef<HTMLInputElement>(null);
  const { pending, error, setError, onSubmit } = useAuthForm(async (data): Promise<AuthResponse> => {
    const password = String(data.get("password"));
    const remember = data.get("ingat") === "on";
    if (method === "nomor") {
      const result = await signInWithMemberNo(String(data.get("nomor")), password, remember);
      return result.ok ? { error: null } : { error: null, message: result.error };
    }
    return authClient.signIn.email({ email: String(data.get("email")).trim(), password, rememberMe: remember });
  });

  // Dialihkan ke sini karena sesi bermasalah (?galat=…): tampilkan alasannya, jangan hanya diam di formulir.
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("galat");
    if (isAuthProblem(code)) setError(AUTH_PROBLEMS[code]);
  }, [setError]);

  const switchMethod = () => {
    setMethod((m) => (m === "email" ? "nomor" : "email"));
    setError("");
    requestAnimationFrame(() => identifier.current?.focus());
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <span className="text-[11px] font-bold tracking-[0.24em] text-muted uppercase">Kartu anggota</span>
      <h2 className="display m-0 text-[48px] leading-none">Masuk</h2>
      <p className="m-0 text-[15px] leading-relaxed text-ink-3">
        {method === "email"
          ? "Gunakan email yang terdaftar pada kartu anggotamu."
          : "Gunakan nomor yang tercetak di kartu anggotamu (ada di halaman Profil)."}
      </p>
      {method === "email" ? (
        <Field
          ref={identifier}
          key="email"
          id="m-email"
          name="email"
          label="Email"
          type="email"
          placeholder="nama@email.com"
          autoComplete="email"
          required
        />
      ) : (
        <Field
          ref={identifier}
          key="nomor"
          id="m-nomor"
          name="nomor"
          label="Nomor anggota"
          type="text"
          placeholder="LMB-2610-0007"
          autoComplete="username"
          autoCapitalize="characters"
          spellCheck={false}
          required
        />
      )}
      <PasswordField
        id="m-pass"
        name="password"
        label="Kata sandi"
        placeholder="Minimal 8 karakter"
        autoComplete="current-password"
        required
        aside={
          <Link href="/lupa-sandi" className="text-[13px] font-semibold">
            Lupa kata sandi?
          </Link>
        }
      />
      <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm text-ink-2">
        <input type="checkbox" name="ingat" defaultChecked className="m-0 size-[18px] accent-primary-600" />
        <span>Ingat saya di perangkat ini</span>
      </label>
      <FormError message={error} />
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className={cn(ui.btn, ui.primary, "disabled:cursor-wait disabled:opacity-80")}
      >
        Masuk ke perpustakaan
        {pending ? <Spinner /> : <ArrowRight />}
      </button>
      <div className="flex items-center gap-3.5 text-[13px] text-muted">
        <span className="h-px flex-1 bg-line" />
        <span>atau</span>
        <span className="h-px flex-1 bg-line" />
      </div>
      <button type="button" onClick={switchMethod} className={cn(ui.btn, ui.ghost)}>
        {method === "email" ? (
          <>
            <IdCard />
            Masuk dengan nomor anggota
          </>
        ) : (
          <>
            <Mail />
            Masuk dengan email
          </>
        )}
      </button>
      <p className="m-0 flex flex-wrap items-center gap-0.5 text-sm text-ink-3">
        <span>Belum punya kartu anggota?</span>
        <SwitchButton onClick={onSwitch}>Daftar di sini</SwitchButton>
      </p>
    </form>
  );
}

function SignUpForm({ onSwitch }: { onSwitch: () => void }) {
  const { pending, error, onSubmit } = useAuthForm(
    (data) =>
      authClient.signUp.email({
        name: String(data.get("nama")).trim(),
        email: String(data.get("email")).trim(),
        password: String(data.get("password")),
      }),
    // Neon Auth hanya menyimpan akun; jenis kelamin disimpan di profil anggota setelah akun jadi.
    (data) => finishSignUp(String(data.get("gender"))),
  );

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <span className="text-[11px] font-bold tracking-[0.24em] text-muted uppercase">Anggota baru</span>
      <h2 className="display m-0 text-[48px] leading-none">Buat kartu anggota</h2>
      <p className="m-0 text-[15px] leading-relaxed text-ink-3">
        Satu kartu untuk meminjam, memesan, dan mencatat setiap buku yang pernah menemanimu.
      </p>
      <Field
        id="d-nama"
        name="nama"
        label="Nama lengkap"
        type="text"
        placeholder="Nama sesuai identitas"
        autoComplete="name"
        required
      />
      <Field
        id="d-email"
        name="email"
        label="Email"
        type="email"
        placeholder="nama@email.com"
        autoComplete="email"
        required
      />
      <PasswordField
        id="d-pass"
        name="password"
        label="Kata sandi"
        placeholder="Minimal 8 karakter"
        autoComplete="new-password"
        minLength={8}
        required
      />
      <fieldset className="m-0 min-w-0 border-0 p-0">
        <legend className={cn(ui.label, "mb-2 p-0")}>Jenis kelamin</legend>
        <div className="flex flex-wrap gap-2.5">
          {(["perempuan", "laki-laki"] as const).map((g) => (
            <label
              key={g}
              className={cn(
                ui.chip,
                "min-h-[52px] gap-2.5 pr-5 pl-[7px] focus-within:outline-2 focus-within:outline-offset-[3px] focus-within:outline-primary-600 has-checked:border-ink has-checked:bg-ink has-checked:text-cream has-checked:hover:border-ink has-checked:hover:bg-ink",
              )}
            >
              <input type="radio" name="gender" value={g} required className="sr-only" />
              <span className="size-[38px] shrink-0 overflow-hidden rounded-full shadow-[0_0_0_2px_var(--color-cream)]">
                <Avatar look={PERSON[g].look} className="block size-full" />
              </span>
              <span>{g === "perempuan" ? "Perempuan" : "Laki-laki"}</span>
            </label>
          ))}
        </div>
        <p className="mt-2 mb-0 text-[13px] text-ink-3">Menentukan ilustrasi karakter di profil dan kartu anggotamu.</p>
      </fieldset>
      <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm text-ink-2">
        <input type="checkbox" name="setuju" required className="m-0 size-[18px] accent-primary-600" />
        <span>Saya menyetujui tata tertib perpustakaan</span>
      </label>
      <FormError message={error} />
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className={cn(ui.btn, ui.primary, "disabled:cursor-wait disabled:opacity-80")}
      >
        Buat kartu anggota
        {pending ? <Spinner /> : <ArrowRight />}
      </button>
      <p className="m-0 flex flex-wrap items-center gap-0.5 text-sm text-ink-3">
        <span>Sudah punya kartu?</span>
        <SwitchButton onClick={onSwitch}>Masuk</SwitchButton>
      </p>
    </form>
  );
}

function SwitchButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-11 cursor-pointer border-0 bg-transparent px-1 font-bold text-primary-600 underline underline-offset-[3px]"
    >
      {children}
    </button>
  );
}
