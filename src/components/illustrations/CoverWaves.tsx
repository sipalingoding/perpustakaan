export function CoverWaves({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 120" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="152" cy="30" r="14" fill="#F4DDC4" stroke="none" />
      <g className="bob">
        <path d="M76 72h48l-9 13H85z" fill="#FAF3E8" />
        <path d="M100 72V42l18 30z" fill="#FAF3E8" />
      </g>
      <path d="M8 92q12-9 24 0t24 0 24 0 24 0 24 0 24 0 24 0 24 0" />
      <path d="M20 108q12-9 24 0t24 0 24 0 24 0 24 0 24 0 24 0" />
    </svg>
  );
}
