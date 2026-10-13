/** Buku terbuka yang halaman kanannya sobek; halaman "404" melayang lepas. Untuk halaman tidak ditemukan. */
export function MissingPage({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 420 300" aria-hidden="true">
      {/* bayangan meja */}
      <ellipse cx="200" cy="268" rx="170" ry="14" fill="#D2DDD4" />
      {/* sampul */}
      <path d="M38 76 Q120 58 200 80 Q280 58 362 76 L366 250 Q282 232 200 254 Q118 232 34 250 Z" fill="#2E5A52" />
      {/* halaman kiri, bergaris tulisan */}
      <path d="M48 72 Q124 54 198 76 L198 242 Q124 222 48 238 Z" fill="#FAF9F3" />
      <g stroke="#D5DCD3" strokeWidth="5" strokeLinecap="round" fill="none">
        <path d="M70 96 Q120 86 176 100" />
        <path d="M70 118 Q120 108 176 122" />
        <path d="M70 140 Q120 130 176 144" />
        <path d="M70 162 Q120 152 150 160" />
        <path d="M70 184 Q120 174 176 188" />
      </g>
      <text x="120" y="226" textAnchor="middle" fontFamily="Poppins, sans-serif" fontSize="11" fill="#8FA89A">
        hal. 403
      </text>
      {/* sisa halaman kanan yang sobek */}
      <path
        d="M202 76 Q216 72 230 70 L224 92 L236 108 L222 126 L238 146 L224 166 L236 186 L222 206 L232 226 L228 240 Q214 240 202 242 Z"
        fill="#FAF9F3"
      />
      {/* halaman di bawahnya, kosong */}
      <path d="M232 74 Q296 58 352 72 L352 238 Q296 224 232 240 Z" fill="#F3F1E7" />
      <path d="M200 78 L200 248" stroke="#1D2B28" strokeOpacity=".18" strokeWidth="2" />
      {/* halaman yang lepas, melayang */}
      <g className="illus-float" style={{ transformOrigin: "330px 70px" }}>
        <g transform="rotate(14 330 70)">
          <rect x="282" y="6" width="96" height="124" rx="4" fill="#FAF9F3" stroke="#D5DCD3" strokeWidth="2" />
          <path d="M282 30 L270 40 L284 52 L272 64 L284 76 L272 90 L284 102 L274 116 L282 130" fill="none" stroke="#D5DCD3" strokeWidth="2" />
          <g stroke="#E1E5DC" strokeWidth="4" strokeLinecap="round" fill="none">
            <path d="M298 30 H362" />
            <path d="M298 46 H354" />
            <path d="M298 62 H362" />
          </g>
          <text x="330" y="108" textAnchor="middle" fontFamily="Poppins, sans-serif" fontSize="22" fontWeight="700" fill="#9A5B3B">
            404
          </text>
        </g>
      </g>
      {/* jejak gerak */}
      <g stroke="#D9A77E" strokeWidth="3" strokeLinecap="round" fill="none">
        <path d="M262 150 q8 -6 14 -18" />
        <path d="M276 166 q10 -8 16 -22" />
      </g>
    </svg>
  );
}
