import { AGENDA, type AgendaKind } from "@/lib/agenda";

/**
 * Lambang tiap agenda, dipakai selama dokumentasi foto belum diunggah:
 * keranjang ponsel (2 Jam Tanpa Gadget), lembar puisi dan gelembung obrolan (Basa-Basi),
 * buku catatan dan pena (KKN), cangkir kopi yang mengepul (Ngopi).
 */
export function AgendaEmblem({ kind, className }: { kind: AgendaKind; className?: string }) {
  const { bg: ink, soft } = AGENDA[kind].tone;
  const paper = "#FBFAF5";
  return (
    <svg viewBox="0 0 240 180" className={className} aria-hidden="true">
      <rect width="240" height="180" rx="18" fill={soft} />
      <g stroke={ink} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        {kind === "tanpa-gadget" && (
          <>
            {/* jam: dua jam */}
            <circle cx="178" cy="52" r="24" fill={paper} />
            <path d="M178 38 V52 L166 59" fill="none" />
            {/* ponsel di keranjang */}
            <rect x="82" y="58" width="30" height="52" rx="6" fill={ink} transform="rotate(-12 97 84)" />
            <rect x="112" y="52" width="30" height="54" rx="6" fill={paper} transform="rotate(10 127 79)" />
            <rect x="96" y="64" width="28" height="48" rx="6" fill={ink} opacity=".75" />
            <path d="M58 96 H182 L170 150 H70 Z" fill={paper} />
            <path
              d="M64 112 H176 M68 128 H172 M90 96 L96 150 M120 96 V150 M150 96 L144 150"
              fill="none"
              opacity=".55"
            />
          </>
        )}
        {kind === "basa-basi" && (
          <>
            <path
              d="M44 40 H150 a12 12 0 0 1 12 12 V112 a12 12 0 0 1 -12 12 H86 L62 144 L66 124 H44 a12 12 0 0 1 -12 -12 V52 a12 12 0 0 1 12 -12 Z"
              fill={paper}
            />
            <path d="M58 62 H124 M66 78 H116 M54 94 H130 M70 110 H108" fill="none" opacity=".7" />
            <path
              d="M156 70 H196 a12 12 0 0 1 12 12 V118 a12 12 0 0 1 -12 12 H190 L194 148 L172 130 H156 a12 12 0 0 1 -12 -12 V82 a12 12 0 0 1 12 -12 Z"
              fill={ink}
            />
            <circle cx="164" cy="100" r="3.5" fill={paper} stroke="none" />
            <circle cx="176" cy="100" r="3.5" fill={paper} stroke="none" />
            <circle cx="188" cy="100" r="3.5" fill={paper} stroke="none" />
          </>
        )}
        {kind === "kkn" && (
          <>
            <rect x="56" y="30" width="112" height="128" rx="8" fill={paper} />
            <path d="M56 30 V158" strokeWidth="10" opacity=".85" />
            <path d="M76 58 H150 M76 76 H146 M76 94 H128" fill="none" opacity=".7" />
            <path d="M76 112 H104" fill="none" opacity=".7" />
            <path d="M118 140 L190 68 L202 80 L130 152 L112 158 Z" fill={ink} />
            <path d="M190 68 L202 80" stroke={paper} />
          </>
        )}
        {kind === "ngopi" && (
          <>
            <path
              d="M100 60 c-8 -10 8 -16 0 -28 M122 60 c-8 -10 8 -16 0 -28 M144 60 c-8 -10 8 -16 0 -28"
              fill="none"
              opacity=".6"
            />
            <ellipse cx="122" cy="146" rx="70" ry="12" fill={paper} />
            <path d="M76 72 H168 V108 a38 38 0 0 1 -38 38 H114 a38 38 0 0 1 -38 -38 Z" fill={ink} />
            <path d="M168 84 h10 a16 16 0 0 1 0 32 h-14" fill="none" strokeWidth="6" />
            <ellipse cx="122" cy="72" rx="46" ry="7" fill="#6B4A36" />
          </>
        )}
      </g>
    </svg>
  );
}
