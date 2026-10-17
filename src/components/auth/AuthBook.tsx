"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  finishSignUp,
  landingAfterSignIn,
  signInWithMemberNo,
} from "@/app/masuk/actions";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type ComponentProps,
  type FormEvent,
  type ReactNode,
} from "react";
import { PasswordField } from "@/components/auth/PasswordField";
import { Avatar } from "@/components/Avatar";
import { ArrowRight, IdCard, Mail, Spinner } from "@/components/icons";
import { CoverEmblem } from "@/components/illustrations/CoverEmblem";
import { WindowNight } from "@/components/illustrations/WindowNight";
import { ui } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { AUTH_PROBLEMS, isAuthProblem } from "@/lib/auth-problems";
import { cn } from "@/lib/cn";
import { IDLE_SIGN_OUT, idleMessage, markActivity } from "@/lib/idle";
import { PERSON } from "@/lib/people";
import { useErrorToast, useToast } from "@/components/Toast";

type Mode = "masuk" | "daftar";

/** Kotak isian 44 px di layar pendek supaya formulir daftar muat tanpa digulir; 50 px bila layarnya cukup tinggi. */
const field = `${ui.field.replace("min-h-[50px]", "min-h-11")} [@media(min-height:720px)]:min-h-[50px]`;

function Field({
  id,
  label,
  aside,
  ...input
}: { id: string; label: string; aside?: ReactNode } & ComponentProps<"input">) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <label className={ui.label} htmlFor={id}>
          {label}
        </label>
        {aside}
      </div>
      <input id={id} className={field} {...input} />
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
    // Buku mengisi tinggi yang tersisa di layar (sampai 760 px), isinya diletakkan di tengah halaman.
    <div className="relative my-auto flex max-h-[760px] w-full max-w-[1040px] flex-1 flex-col">
      <div
        className={cn(
          "relative grid flex-1 rounded-2xl bg-cream",
          "min-[821px]:grid-cols-2",
          "shadow-[0_2px_0_#E2E5DB,0_5px_0_#F3F2EA,0_7px_0_#DADFD4,0_10px_0_#F1F0E8,0_12px_0_#D3D9CD,0_50px_80px_-40px_rgba(29,43,40,.5)]",
        )}
      >
        {/* Halaman kiri */}
        <section
          // Di layar sempit halaman kiri (hiasan) disembunyikan: formulirnya saja sudah memenuhi satu layar.
          className="hidden rounded-l-2xl px-12 py-8 min-[821px]:flex min-[821px]:flex-col min-[821px]:justify-center min-[821px]:gutter-l"
        >
          <div className="flex animate-fade-up flex-col gap-4 [animation-delay:1.9s]">
            <WindowNight className="block h-auto w-full max-w-[min(300px,32dvh)]" />
            <h1 className="display m-0 text-[clamp(30px,3.2vw,40px)] leading-[1.06] text-ink [@media(min-height:720px)]:text-[clamp(32px,3.6vw,46px)]">
              Halaman yang kamu tinggalkan masih{" "}
              <span className="text-primary-500">menunggu</span>.
            </h1>
            <p className="m-0 max-w-[36ch] text-[15px] leading-relaxed text-ink-3">
              Lanjutkan pinjaman, pesan buku berikutnya, dan lihat kapan
              semuanya perlu kembali ke rak.
            </p>
          </div>
        </section>

        {/* Halaman kanan */}
        <section className="relative flex flex-col justify-center rounded-2xl px-6 pt-6 pb-5 min-[821px]:rounded-l-none min-[821px]:px-12 min-[821px]:gutter-r">
          <div className="absolute -top-3.5 right-4 z-[3] flex gap-2 min-[821px]:right-10 min-[821px]:gap-2.5">
            <button
              type="button"
              className="ribbon max-[820px]:!w-[72px]"
              aria-pressed={mode === "masuk"}
              onClick={() => go("masuk")}
            >
              Masuk
            </button>
            <button
              type="button"
              className="ribbon max-[820px]:!w-[72px]"
              aria-pressed={mode === "daftar"}
              onClick={() => go("daftar")}
            >
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
            className="flex max-w-[400px] animate-fade-up flex-col"
            style={{ animationDelay: switched ? "0.45s" : "1.65s" }}
          >
            {mode === "masuk" ? <SignInForm /> : <SignUpForm />}
          </div>

          <div
            className="leaf"
            style={{ animationDelay: "0.8s" }}
            aria-hidden="true"
          />
          <div
            className="leaf"
            style={{ animationDelay: "0.95s" }}
            aria-hidden="true"
          />
          <div
            className="leaf"
            style={{ animationDelay: "1.1s" }}
            aria-hidden="true"
          />
          <div className="auth-cover" aria-hidden="true">
            <div className="face spine-shade flex flex-col items-center justify-center gap-4 rounded-[4px_16px_16px_4px] bg-primary-700 p-10 text-center text-[#E7D8B8] shadow-[0_30px_60px_-30px_rgba(0,0,0,.55)]">
              <div className="absolute inset-[22px] rounded-lg border-[1.5px] border-[rgba(231,216,184,.5)]" />
              <CoverEmblem className="h-[54px] w-[72px]" />
              <span className="display text-[72px] leading-none">Lembar</span>
              <span className="text-xs font-semibold tracking-[0.3em] uppercase">
                Perpustakaan yang tenang
              </span>
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
  const {
    code,
    status,
    message = "",
  } = (error ?? {}) as { code?: string; status?: number; message?: string };
  if (code && ERRORS[code]) return ERRORS[code];
  if (status === 429) return MESSAGES.rate;
  // Beberapa galat (mis. 422 "User already exists") hanya terbaca dari pesannya setelah dinormalkan klien Neon.
  const text = message.toLowerCase();
  if (text.includes("already exists")) return MESSAGES.exists;
  if (text.includes("invalid email or password")) return MESSAGES.credentials;
  if (text.includes("password") && text.includes("short"))
    return MESSAGES.password;
  if (text.includes("invalid email")) return MESSAGES.email;
  return FALLBACK_ERROR;
}

/** Hasil permintaan masuk/daftar. `message` = pesan siap tampil (dari aksi server), dipakai apa adanya. */
type AuthResponse = {
  error: { code?: string; status?: number } | null;
  message?: string;
};

/** Kirim formulir ke Neon Auth, tampilkan galat dalam bahasa Indonesia, lalu pindah halaman. */
function useAuthForm(
  request: (data: FormData) => Promise<AuthResponse>,
  success: string,
  afterAuth?: (data: FormData) => Promise<unknown>,
) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  // Pindah halaman dijalankan sebagai transisi: tombol tetap sibuk sampai halaman tujuan tampil, lalu kembali normal.
  // Next menyimpan halaman yang pernah dibuka beserta state-nya, jadi state "sibuk" tidak boleh tertinggal di sini;
  // kalau tertinggal, formulir masuk tampil loading terus saat anggota kembali ke /masuk setelah keluar.
  const [navigating, startNavigation] = useTransition();
  const setError = useErrorToast();
  const notify = useToast();

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    setSubmitting(true);
    try {
      const data = new FormData(form);
      const { error, message } = await request(data);
      if (error || message) {
        setError(message ?? errorMessage(error));
        setSubmitting(false);
        return;
      }
      await afterAuth?.(data);
      // Catatan aktivitas dari sesi sebelumnya tidak boleh langsung mengeluarkan sesi yang baru.
      markActivity();
      // Server yang menentukan tujuan, karena hanya server yang tahu peran akun (pustakawan ke /admin).
      const target = await landingAfterSignIn(
        new URLSearchParams(window.location.search).get("lanjut"),
      );
      // Kata sandi tidak ikut tersimpan di halaman /masuk yang disimpan Next.
      form.reset();
      setSubmitting(false);
      notify({ kind: "ok", text: success });
      startNavigation(() => {
        router.push(target);
        router.refresh();
      });
    } catch (e) {
      setError(errorMessage(e));
      setSubmitting(false);
    }
  };

  return { pending: submitting || navigating, setError, onSubmit };
}

/** Judul formulir. Dibuat pendek supaya muat di sebelah kiri pita pembatas tanpa menambah jarak atas. */
function FormHeading({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="display m-0 text-[40px] leading-none [@media(max-height:640px)]:text-[32px] [@media(min-height:720px)]:text-[48px]">
        {title}
      </h2>
      <p className="m-0 text-sm leading-snug text-ink-3 [@media(max-height:640px)]:hidden">
        {children}
      </p>
    </div>
  );
}

type SignInMethod = "email" | "nomor";

function SignInForm() {
  const [method, setMethod] = useState<SignInMethod>("email");
  const identifier = useRef<HTMLInputElement>(null);
  const { pending, setError, onSubmit } = useAuthForm(
    async (data): Promise<AuthResponse> => {
      const password = String(data.get("password"));
      const remember = data.get("ingat") === "on";
      if (method === "nomor") {
        const result = await signInWithMemberNo(
          String(data.get("nomor")),
          password,
          remember,
        );
        return result.ok
          ? { error: null }
          : { error: null, message: result.error };
      }
      return authClient.signIn.email({
        email: String(data.get("email")).trim(),
        password,
        rememberMe: remember,
      });
    },
    "Kamu sudah masuk. Selamat membaca!",
  );

  // Dialihkan ke sini karena sesi bermasalah (?galat=…) atau berakhir karena tidak aktif (?keluar=…): tampilkan
  // alasannya, jangan hanya diam di formulir.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("galat");
    if (isAuthProblem(code)) setError(AUTH_PROBLEMS[code]);
    else if (params.get("keluar") === IDLE_SIGN_OUT)
      setError(idleMessage(params.get("menit")));
  }, [setError]);

  const switchMethod = (next: SignInMethod) => {
    if (next === method) return;
    setMethod(next);
    setError("");
    requestAnimationFrame(() => identifier.current?.focus());
  };

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-2.5 [@media(min-height:720px)]:gap-3.5"
    >
      <FormHeading title="Masuk">
        {method === "email"
          ? "Pakai email yang terdaftar di kartu anggotamu."
          : "Nomornya ada di kartu anggota, halaman Profil."}
      </FormHeading>
      <div
        role="group"
        aria-label="Masuk dengan"
        className="grid grid-cols-2 gap-1 rounded-full bg-tint p-1"
      >
        {(
          [
            ["email", "Email", <Mail key="i" size={18} />],
            ["nomor", "Nomor anggota", <IdCard key="i" size={18} />],
          ] as const
        ).map(([key, label, icon]) => (
          <button
            key={key}
            type="button"
            aria-pressed={method === key}
            onClick={() => switchMethod(key)}
            className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-full border-0 bg-transparent px-3 text-[13px] font-semibold text-ink-2 transition-colors hover:text-ink aria-pressed:bg-paper aria-pressed:text-ink aria-pressed:shadow-[0_2px_6px_-2px_rgba(29,43,40,.25)]"
          >
            <span className="hidden min-[421px]:contents">{icon}</span>
            {label}
          </button>
        ))}
      </div>
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
        fieldClassName={field}
        required
        aside={
          <Link href="/lupa-sandi" className="text-[13px] font-semibold">
            Lupa kata sandi?
          </Link>
        }
      />
      <label className="flex min-h-9 cursor-pointer items-center gap-2.5 text-sm text-ink-2">
        <input
          type="checkbox"
          name="ingat"
          defaultChecked
          className="m-0 size-[18px] accent-primary-600"
        />
        <span>Ingat saya di perangkat ini</span>
      </label>
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className={cn(
          ui.btn,
          ui.primary,
          "disabled:cursor-wait disabled:opacity-80",
        )}
      >
        Masuk ke perpustakaan
        {pending ? <Spinner /> : <ArrowRight />}
      </button>
      <Link
        href="/"
        className="-mt-1 flex min-h-11 items-center justify-center text-sm font-semibold text-ink-2 underline-offset-4 hover:text-ink hover:underline"
      >
        Lihat katalog tanpa login
      </Link>
    </form>
  );
}

function SignUpForm() {
  const { pending, onSubmit } = useAuthForm(
    (data) =>
      authClient.signUp.email({
        name: String(data.get("nama")).trim(),
        email: String(data.get("email")).trim(),
        password: String(data.get("password")),
      }),
    "Kartu anggotamu sudah jadi. Selamat datang di Lembar!",
    // Neon Auth hanya menyimpan akun; jenis kelamin disimpan di profil anggota setelah akun jadi.
    (data) => finishSignUp(String(data.get("gender"))),
  );

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-2.5 [@media(min-height:720px)]:gap-3.5"
    >
      <FormHeading title="Daftar">
        Satu kartu untuk meminjam dan memesan buku.
      </FormHeading>
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
        fieldClassName={field}
        minLength={8}
        required
      />
      <fieldset className="m-0 min-w-0 border-0 p-0">
        <legend className={cn(ui.label, "mb-1.5 p-0")}>Jenis kelamin</legend>
        <div className="grid grid-cols-2 gap-2">
          {(["perempuan", "laki-laki"] as const).map((g) => (
            <label
              key={g}
              className={cn(
                ui.chip,
                "min-h-11 min-w-0 gap-2 pr-3 pl-[5px] focus-within:outline-2 focus-within:outline-offset-[3px] focus-within:outline-primary-600 has-checked:border-ink has-checked:bg-ink has-checked:text-cream has-checked:hover:border-ink has-checked:hover:bg-ink",
              )}
            >
              <input
                type="radio"
                name="gender"
                value={g}
                required
                className="sr-only"
              />
              <span className="size-8 shrink-0 overflow-hidden rounded-full shadow-[0_0_0_2px_var(--color-cream)]">
                <Avatar look={PERSON[g].look} className="block size-full" />
              </span>
              <span>{g === "perempuan" ? "Perempuan" : "Laki-laki"}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex min-h-9 cursor-pointer items-center gap-2.5 text-sm text-ink-2">
        <input
          type="checkbox"
          name="setuju"
          required
          className="m-0 size-[18px] accent-primary-600"
        />
        <span>Saya menyetujui tata tertib perpustakaan</span>
      </label>
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className={cn(
          ui.btn,
          ui.primary,
          "disabled:cursor-wait disabled:opacity-80",
        )}
      >
        Buat kartu anggota
        {pending ? <Spinner /> : <ArrowRight />}
      </button>
    </form>
  );
}
