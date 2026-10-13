export function PaperBoat({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 110" aria-hidden="true">
      <circle cx="150" cy="34" r="16" fill="#EBCBAA" />
      <g className="bob">
        <path d="M78 66h44l-8 12H86z" fill="#FAF9F3" stroke="#3A2E26" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M100 66V40l16 26z" fill="#E3BE9C" stroke="#3A2E26" strokeWidth="1.6" strokeLinejoin="round" />
      </g>
      <path d="M8 84q12-8 24 0t24 0 24 0 24 0 24 0 24 0 24 0 24 0" fill="none" stroke="#5C7395" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M20 98q12-8 24 0t24 0 24 0 24 0 24 0 24 0 24 0" fill="none" stroke="#8FA4BF" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
