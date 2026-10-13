export function ShelfPlant({ className }: { className?: string }) {
  return (
    <svg className={className} aria-hidden="true" viewBox="0 0 90 120">
      <g className="sway">
        <path d="M45 74c-12-18-14-42-2-60 12 16 12 40 2 60z" fill="#5E7D74" />
        <path d="M45 74c2-24 16-40 34-44-2 20-16 36-34 44z" fill="#7F9C8E" />
        <path d="M45 74c-6-20-22-30-40-30 4 18 20 28 40 30z" fill="#8FAE9C" />
      </g>
      <path d="M24 120l4-46h34l4 46z" fill="#C99A7A" />
      <rect x="22" y="70" width="46" height="8" rx="3" fill="#B5876A" />
    </svg>
  );
}
