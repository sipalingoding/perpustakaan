/** Jam beker berdering di atas tumpukan buku: tanda ada buku yang lewat batas pengembalian. */
export function OverdueClock({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 160 200"
      role="img"
      aria-label="Ilustrasi jam beker berdering di atas tumpukan buku, tanda ada buku yang terlambat dikembalikan"
    >
      <circle className="pulse-soft" cx="82" cy="92" r="70" fill="#F3E3D3" />
      <rect x="18" y="170" width="124" height="16" rx="3" fill="#2F4A5C" />
      <rect x="132" y="173" width="7" height="10" rx="2" fill="#F4F2EA" />
      <rect x="28" y="154" width="104" height="16" rx="3" fill="#4F6F66" />
      <rect x="122" y="157" width="7" height="10" rx="2" fill="#FBF8F0" />
      {/* kaki jam */}
      <path d="M58 146l-8 12M102 146l8 12" stroke="#1D2B28" strokeWidth="4" strokeLinecap="round" />
      <g className="ring">
        {/* lonceng */}
        <circle cx="52" cy="48" r="13" fill="#D9A77E" stroke="#1D2B28" strokeWidth="2" />
        <circle cx="108" cy="48" r="13" fill="#D9A77E" stroke="#1D2B28" strokeWidth="2" />
        <path d="M80 28v10" stroke="#1D2B28" strokeWidth="4" strokeLinecap="round" />
        {/* badan jam */}
        <circle cx="80" cy="96" r="52" fill="#F8F7F1" stroke="#1D2B28" strokeWidth="3" />
        <circle cx="80" cy="96" r="42" fill="none" stroke="#EBD3BE" strokeWidth="2" />
        <path d="M80 62v6M80 124v6M46 96h6M108 96h6" stroke="#1D2B28" strokeWidth="3" strokeLinecap="round" />
        {/* jarum menunjuk lewat batas */}
        <path d="M80 96V74" stroke="#1D2B28" strokeWidth="4" strokeLinecap="round" />
        <path d="M80 96l22 12" stroke="#9A5B3B" strokeWidth="4" strokeLinecap="round" />
        <circle cx="80" cy="96" r="5" fill="#9A5B3B" />
      </g>
      {/* getaran bunyi */}
      <path d="M22 70c-5 7-5 15 0 22M12 62c-9 11-9 27 0 38" fill="none" stroke="#9A5B3B" strokeWidth="3" strokeLinecap="round" />
      <path d="M138 70c5 7 5 15 0 22M148 62c9 11 9 27 0 38" fill="none" stroke="#9A5B3B" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
