export function LogoMark({ className, gap = "#EDF0E9" }: { className?: string; gap?: string }) {
  return (
    <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true" className={className}>
      <path
        d="M16 9c-3.4-2.6-8-3.2-12-2v17c4-1.2 8.6-.6 12 2 3.4-2.6 8-3.2 12-2V7c-4-1.2-8.6-.6-12 2z"
        fill="#2E4A43"
      />
      <path d="M16 9v17" stroke={gap} strokeWidth="1.6" />
      <path d="M16 9c0-3 1.8-5.4 4.6-6.4-.4 2.8-2 5-4.6 6.4z" fill="#8FAE9C" />
    </svg>
  );
}
