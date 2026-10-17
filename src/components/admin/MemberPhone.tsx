import { formatPhone, whatsappUrl } from "@/lib/phone";

/** Nomor HP anggota di tabel pustakawan: ketuk untuk menelepon, atau buka chat WhatsApp. */
export function MemberPhone({ phone, name }: { phone: string | null; name: string }) {
  if (!phone) return <span className="mt-1 block text-xs text-muted">Belum mengisi nomor HP</span>;
  const wa = whatsappUrl(phone);
  return (
    <span className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[13px] font-semibold">
      <a
        href={`tel:${phone}`}
        aria-label={`Telepon ${name}, ${formatPhone(phone)}`}
        className="inline-flex min-h-8 items-center text-ink-2 tabular-nums no-underline hover:text-ink hover:underline"
      >
        {formatPhone(phone)}
      </a>
      {wa && (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Chat WhatsApp dengan ${name} (tab baru)`}
          className="inline-flex min-h-8 items-center text-primary-600 underline-offset-4 hover:underline"
        >
          WhatsApp
        </a>
      )}
    </span>
  );
}
