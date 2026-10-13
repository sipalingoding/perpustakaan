export function CoverEmblem({ className }: { className?: string }) {
  return (
    <svg className={className} aria-hidden="true" viewBox="0 0 64 48" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M32 14c-6-5-15-6-24-4v28c9-2 18-1 24 4 6-5 15-6 24-4V10c-9-2-18-1-24 4z" />
      <path d="M32 14v28" />
      <path d="M32 14c0-6 3-10 8-12-1 5-4 9-8 12z" />
    </svg>
  );
}
