export function SproutBook({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 90" aria-hidden="true" fill="none" stroke="#4F6F66" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M60 72c-10-7-26-8-40-5V32c14-3 30-2 40 5 10-7 26-8 40-5v35c-14-3-30-2-40 5z" />
      <path d="M60 37v35" />
      <g className="grow">
        <path d="M60 37V16" />
        <path d="M60 24c-8 0-14-5-15-12 8 0 14 5 15 12zM60 20c6-1 11-5 12-11-7 0-11 5-12 11z" fill="#A9BFB0" />
      </g>
    </svg>
  );
}
