/** Rak yang sedang ditata: celah di rak, tangga bersandar, tumpukan buku di lantai, papan "Sedang ditata". */
export function ShelfMaintenance({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 420 320" aria-hidden="true">
      <ellipse cx="210" cy="296" rx="180" ry="14" fill="#D2DDD4" />
      {/* rak */}
      <rect x="70" y="40" width="240" height="250" rx="8" fill="#B9997A" />
      <rect x="82" y="52" width="216" height="226" rx="4" fill="#E6ECE4" />
      <rect x="82" y="128" width="216" height="8" fill="#9C7E62" />
      <rect x="82" y="206" width="216" height="8" fill="#9C7E62" />
      {/* baris atas: penuh */}
      <g>
        <rect x="92" y="70" width="18" height="58" rx="2" fill="#2E5A52" />
        <rect x="112" y="78" width="14" height="50" rx="2" fill="#D9A77E" />
        <rect x="128" y="66" width="20" height="62" rx="2" fill="#5C7395" />
        <rect x="150" y="74" width="16" height="54" rx="2" fill="#8FA89A" />
        <rect x="168" y="70" width="18" height="58" rx="2" fill="#74678F" />
        <rect x="188" y="80" width="14" height="48" rx="2" fill="#E3BE9C" />
        <rect x="204" y="68" width="20" height="60" rx="2" fill="#4F6F66" />
        <path d="M228 128 L246 76 L262 80 L244 128 Z" fill="#C9D3D9" />
      </g>
      {/* baris tengah: ada celah kosong yang sedang ditata */}
      <g>
        <rect x="92" y="148" width="16" height="58" rx="2" fill="#9A5B3B" />
        <rect x="110" y="152" width="20" height="54" rx="2" fill="#2E5A52" />
        <rect x="132" y="146" width="14" height="60" rx="2" fill="#D9A77E" />
        <rect x="150" y="150" width="92" height="56" rx="4" fill="none" stroke="#B9C6BC" strokeWidth="2" strokeDasharray="6 6" />
        <rect x="248" y="150" width="18" height="56" rx="2" fill="#5C7395" />
        <rect x="268" y="154" width="18" height="52" rx="2" fill="#8FA89A" />
      </g>
      {/* baris bawah */}
      <g>
        <rect x="92" y="226" width="20" height="52" rx="2" fill="#74678F" />
        <rect x="114" y="232" width="16" height="46" rx="2" fill="#4F6F66" />
        <rect x="132" y="224" width="18" height="54" rx="2" fill="#E3BE9C" />
        <rect x="152" y="230" width="22" height="48" rx="2" fill="#2E5A52" />
      </g>
      {/* papan gantung */}
      <g className="illus-swing" style={{ transformOrigin: "190px 14px" }}>
        <path d="M190 14 L150 46 M190 14 L230 46" stroke="#9C7E62" strokeWidth="2.5" fill="none" />
        <circle cx="190" cy="14" r="4" fill="#9C7E62" />
        <rect x="132" y="44" width="116" height="40" rx="8" fill="#FAF9F3" stroke="#9A5B3B" strokeWidth="2.5" />
        <text x="190" y="69" textAnchor="middle" fontFamily="Poppins, sans-serif" fontSize="14" fontWeight="700" fill="#9A5B3B">
          Sedang ditata
        </text>
      </g>
      {/* tangga */}
      <g stroke="#9C7E62" strokeWidth="6" strokeLinecap="round">
        <path d="M318 290 L352 92" />
        <path d="M352 290 L378 104" />
      </g>
      <g stroke="#9C7E62" strokeWidth="4" strokeLinecap="round">
        <path d="M322 268 L355 272" />
        <path d="M328 232 L360 236" />
        <path d="M334 196 L365 200" />
        <path d="M340 160 L370 164" />
        <path d="M346 126 L374 130" />
      </g>
      {/* tumpukan buku di lantai, menunggu ditata */}
      <g>
        <rect x="24" y="270" width="68" height="16" rx="3" fill="#5C7395" />
        <rect x="30" y="254" width="58" height="16" rx="3" fill="#D9A77E" />
        <rect x="22" y="238" width="62" height="16" rx="3" fill="#2E5A52" />
        <rect x="34" y="224" width="44" height="14" rx="3" fill="#E3BE9C" transform="rotate(-6 56 231)" />
      </g>
    </svg>
  );
}
