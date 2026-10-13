export function LibraryHills({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 640 440" role="img" aria-label="Ilustrasi bukit dengan menara buku yang ditumbuhi pohon, lampu taman, dan buku-buku yang terbang seperti burung">
      <circle cx="440" cy="150" r="104" fill="#F1DFCB" />
      <g className="cloud" fill="#F8F7F1" opacity=".85">
        <rect x="60" y="92" width="120" height="26" rx="13" />
        <rect x="88" y="76" width="62" height="30" rx="15" />
      </g>
      <g className="cloud" fill="#F8F7F1" opacity=".7" style={{ animationDelay: "-6s" }}>
        <rect x="250" y="52" width="90" height="20" rx="10" />
        <rect x="270" y="40" width="46" height="24" rx="12" />
      </g>
      <path d="M0 300c90-50 180-45 270-20s160-40 250-35c60 3 100 20 120 30v165H0z" fill="#CBD8D0" />
      <path d="M0 352c120-40 240-20 340-6s200-24 300-14v108H0z" fill="#A9BFB0" />
      <rect x="392" y="318" width="160" height="30" rx="4" fill="#2F4A5C" />
      <rect x="540" y="321" width="9" height="24" rx="2" fill="#F4F2EA" />
      <path d="M410 318v30M418 318v30" stroke="#F1E3C8" strokeWidth="2" opacity=".6" />
      <rect x="404" y="290" width="136" height="28" rx="4" fill="#E3BE9C" />
      <rect x="528" y="293" width="9" height="22" rx="2" fill="#FBF8F0" />
      <path d="M420 290v28" stroke="#3A2E26" strokeWidth="2" opacity=".35" />
      <rect x="386" y="264" width="150" height="26" rx="4" fill="#4F6F66" />
      <rect x="524" y="267" width="9" height="20" rx="2" fill="#F4F2EA" />
      <path d="M402 264v26M408 264v26" stroke="#F3F1E7" strokeWidth="2" opacity=".5" />
      <rect x="412" y="240" width="118" height="24" rx="4" fill="#74678F" />
      <rect x="518" y="243" width="9" height="18" rx="2" fill="#F4F2EA" />
      <rect x="398" y="218" width="134" height="22" rx="4" fill="#C9D3D9" />
      <rect x="520" y="221" width="9" height="16" rx="2" fill="#FBF8F0" />
      <path d="M414 218v22" stroke="#22323A" strokeWidth="2" opacity=".35" />
      <path d="M466 220c-2-20 4-38 0-62" stroke="#6E5A48" strokeWidth="7" fill="none" strokeLinecap="round" />
      <path d="M466 186c10-8 20-12 30-12M465 196c-10-6-18-8-26-6" stroke="#6E5A48" strokeWidth="4" fill="none" strokeLinecap="round" />
      <g className="sway-slow">
        <circle cx="436" cy="146" r="34" fill="#7F9C8E" />
        <circle cx="496" cy="140" r="38" fill="#5E7D74" />
        <circle cx="466" cy="108" r="36" fill="#8FAE9C" />
        <circle cx="470" cy="150" r="28" fill="#6B8B7E" />
      </g>
      <g stroke="#6E5A48" strokeWidth="3" strokeLinecap="round">
        <path d="M360 352l40-140M378 356l40-140" />
        <path d="M364 338l18 4M369 320l18 4M374 302l18 4M380 283l18 4M385 265l18 4M390 247l18 4M395 229l18 4" />
      </g>
      <path d="M0 404c140-30 260-10 380-16s200 12 260 4v48H0z" fill="#7F9C8E" />
      <path d="M300 440c20-30 50-60 92-90" stroke="#E9E4D6" strokeWidth="10" fill="none" strokeLinecap="round" strokeDasharray="2 18" />
      <circle className="glow" cx="120" cy="300" r="30" fill="#F6E3B8" />
      <path d="M120 404V306" stroke="#2E4A43" strokeWidth="4" />
      <path d="M108 306h24l-4-16h-16z" fill="#2E4A43" />
      <circle cx="120" cy="300" r="5" fill="#FBEBC8" />
    </svg>
  );
}
