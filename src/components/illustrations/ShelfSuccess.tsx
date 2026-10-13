export function ShelfSuccess({ coverBg, coverInk, className }: { coverBg: string; coverInk: string; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 260 150" aria-hidden="true">
      <circle cx="130" cy="78" r="70" fill="#E1E9E2" />
      <rect x="40" y="124" width="180" height="10" rx="3" fill="#B9997A" />
      <rect x="56" y="62" width="16" height="62" rx="2" fill="#4F6F66" />
      <rect x="74" y="72" width="14" height="52" rx="2" fill="#E3BE9C" />
      <rect x="90" y="58" width="16" height="66" rx="2" fill="#74678F" />
      <g className="slide-in">
        <rect x="110" y="54" width="20" height="70" rx="2" fill={coverBg} />
        <path d="M114 62h12M114 116h12" stroke={coverInk} strokeWidth="2.4" opacity=".6" />
      </g>
      <rect x="134" y="66" width="14" height="58" rx="2" fill="#5C7395" />
      <rect x="150" y="60" width="16" height="64" rx="2" fill="#C9D3D9" />
      <path d="M170 124l14-56 13 3-14 56z" fill="#D9A77E" />
      <path className="twinkle" d="M120 22l2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5z" fill="#D9A77E" style={{ animationDelay: ".9s" }} />
      <path className="twinkle" d="M156 36l2 4.5 4.5 2-4.5 2-2 4.5-2-4.5-4.5-2 4.5-2z" fill="#8FAE9C" style={{ animationDelay: "1.3s" }} />
      <path className="twinkle" d="M92 38l2 4.5 4.5 2-4.5 2-2 4.5-2-4.5-4.5-2 4.5-2z" fill="#74678F" style={{ animationDelay: "1.1s" }} />
    </svg>
  );
}
