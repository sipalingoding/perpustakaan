export function Hourglass({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 160 200" role="img" aria-label="Ilustrasi jam pasir di atas tumpukan buku">
      <circle className="pulse-soft" cx="92" cy="96" r="72" fill="#DCE5DD" />
      <rect x="18" y="170" width="124" height="16" rx="3" fill="#4F6F66" />
      <rect x="132" y="173" width="7" height="10" rx="2" fill="#F4F2EA" />
      <rect x="28" y="154" width="104" height="16" rx="3" fill="#E3BE9C" />
      <rect x="122" y="157" width="7" height="10" rx="2" fill="#FBF8F0" />
      <rect x="48" y="26" width="64" height="9" rx="3" fill="#6E5A48" />
      <rect x="48" y="145" width="64" height="9" rx="3" fill="#6E5A48" />
      <path d="M56 35h48c0 26-18 36-18 55s18 29 18 55H56c0-26 18-36 18-55S56 61 56 35z" fill="#F8F7F1" stroke="#1D2B28" strokeWidth="2" />
      <path d="M62 46h36c-2 14-12 22-18 30-6-8-16-16-18-30z" fill="#D9A77E" />
      <path className="fall" d="M80 78v58" stroke="#D9A77E" strokeWidth="2.2" strokeDasharray="3 5" />
      <path d="M60 143c4-18 14-24 20-26 6 2 16 8 20 26z" fill="#D9A77E" />
      <path d="M52 35v110M108 35v110" stroke="#6E5A48" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
