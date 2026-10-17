/**
 * Logo Lembar: selembar kertas dengan sudut bawah yang terlipat, dan huruf L sebagai ruang kosong di atasnya.
 * `gap` = warna huruf L, samakan dengan latar tempat logo diletakkan.
 */
export function LogoMark({ className, gap = "#EDF0E9" }: { className?: string; gap?: string }) {
  return (
    <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true" className={className}>
      <path d="M6 6a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v14l-8 9H9a3 3 0 0 1-3-3z" fill="#2E4A43" />
      <path d="M26 20h-5a3 3 0 0 0-3 3v6z" fill="#8FAE9C" />
      <path
        d="M11 9v11h6"
        fill="none"
        stroke={gap}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
