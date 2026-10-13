import type { Motif } from "@/lib/books";

/** Gambar sederhana di sampul buku, mengikuti warna tinta sampul (currentColor). */
export function CoverMotif({ motif, className }: { motif: Motif; className?: string }) {
  const common = { viewBox: "0 0 100 70", className, "aria-hidden": true } as const;
  switch (motif) {
    case "rain":
      return (
        <svg {...common}>
          <g fill="currentColor">
            <circle cx="38" cy="26" r="12" />
            <circle cx="55" cy="21" r="15" />
            <circle cx="69" cy="29" r="9" />
            <rect x="28" y="27" width="50" height="12" rx="6" />
          </g>
          <path d="M36 48l-3 8M50 48l-3 10M64 48l-3 8" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
        </svg>
      );
    case "moon":
      return (
        <svg {...common}>
          <path d="M60 10a24 24 0 1 0 16 40A19 19 0 1 1 60 10z" fill="currentColor" />
          <g fill="currentColor">
            <circle cx="22" cy="18" r="2" />
            <circle cx="30" cy="48" r="1.6" />
            <circle cx="86" cy="16" r="1.8" />
            <circle cx="16" cy="36" r="1.2" />
          </g>
        </svg>
      );
    case "waves":
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <path d="M12 26q9-8 19 0t19 0 19 0 19 0" />
          <path d="M12 40q9-8 19 0t19 0 19 0 19 0" />
          <path d="M12 54q9-8 19 0t19 0 19 0 19 0" />
        </svg>
      );
    case "cup":
      return (
        <svg
          {...common}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M32 30h32v14a12 12 0 0 1-12 12h-8a12 12 0 0 1-12-12z" />
          <path d="M64 34a7 7 0 0 1 0 14" />
          <path d="M26 62h44" />
          <path d="M42 22c-4-4 4-7 0-12M52 22c-4-4 4-7 0-12" />
        </svg>
      );
    case "ripple":
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
          <path d="M18 60a32 32 0 0 1 64 0M30 60a20 20 0 0 1 40 0M42 60a8 8 0 0 1 16 0" />
          <circle cx="50" cy="14" r="3.5" fill="currentColor" stroke="none" />
        </svg>
      );
    case "lantern":
      return (
        <svg {...common}>
          <path d="M26 0v18M50 0v28M74 0v14" stroke="currentColor" strokeWidth="1.6" />
          <g fill="currentColor">
            <ellipse cx="26" cy="29" rx="9" ry="11" />
            <ellipse cx="50" cy="41" rx="11" ry="13" />
            <ellipse cx="74" cy="25" rx="8" ry="10" />
          </g>
        </svg>
      );
    case "wind":
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
          <path d="M10 24h52a9 9 0 1 0-9-9" />
          <path d="M10 38h68a10 10 0 1 1-10 10" />
          <path d="M10 52h38" />
        </svg>
      );
    case "leaf":
      return (
        <svg
          {...common}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M50 66C22 54 24 18 50 4c26 14 28 50 0 62z" />
          <path d="M50 64V12M50 30l-10-8M50 30l10-8M50 46l-13-9M50 46l13-9" />
        </svg>
      );
  }
}
