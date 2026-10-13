export function WindowNight({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 360 270" role="img" aria-label="Ilustrasi jendela malam dengan bulan sabit, tanaman dalam pot, tumpukan buku dan secangkir teh hangat">
      <path d="M80 244V120a100 100 0 0 1 200 0v124z" fill="#2F4A5C" />
      <path d="M80 244v-34c30-16 64-20 100-8s70 10 100-6v48z" fill="#3D5E6B" />
      <circle cx="226" cy="84" r="22" fill="#F2E3C6" />
      <circle cx="236" cy="77" r="20" fill="#2F4A5C" />
      <circle className="twinkle" cx="122" cy="74" r="2" fill="#F2E3C6" />
      <circle className="twinkle" cx="156" cy="112" r="1.6" fill="#F2E3C6" style={{ animationDelay: ".8s" }} />
      <circle className="twinkle" cx="206" cy="132" r="1.8" fill="#F2E3C6" style={{ animationDelay: "1.6s" }} />
      <circle className="twinkle" cx="254" cy="176" r="1.6" fill="#F2E3C6" style={{ animationDelay: ".4s" }} />
      <circle className="twinkle" cx="112" cy="170" r="1.8" fill="#F2E3C6" style={{ animationDelay: "2.2s" }} />
      <path d="M80 244V120a100 100 0 0 1 200 0v124" fill="none" stroke="#E4E0D2" strokeWidth="9" />
      <path d="M180 22v222M80 150h200" stroke="#E4E0D2" strokeWidth="5" />
      <rect x="48" y="242" width="264" height="14" rx="4" fill="#CDC6B3" />
      <g className="sway">
        <path d="M114 210c-16-14-22-34-14-50 12 12 18 32 14 50z" fill="#5E7D74" />
        <path d="M114 210c4-22 18-38 36-40-2 18-16 34-36 40z" fill="#7F9C8E" />
        <path d="M114 210c-2-26 6-46 20-58 6 20 0 42-20 58z" fill="#4F6F66" />
        <path d="M114 210c-12-8-28-10-40-4 10 10 26 12 40 4z" fill="#8FAE9C" />
      </g>
      <path d="M94 242l6-32h28l6 32z" fill="#C99A7A" />
      <rect x="96" y="206" width="36" height="7" rx="2" fill="#B5876A" />
      <rect x="204" y="228" width="80" height="14" rx="2.5" fill="#5C7395" />
      <rect x="212" y="214" width="66" height="14" rx="2.5" fill="#E3BE9C" />
      <rect x="200" y="200" width="74" height="14" rx="2.5" fill="#4F6F66" />
      <path d="M276 230v10M270 216v10M266 202v10" stroke="#F8F7F1" strokeWidth="2" opacity=".7" />
      <path d="M226 178h26v12a10 10 0 0 1-10 10h-6a10 10 0 0 1-10-10z" fill="#F8F7F1" stroke="#1D2B28" strokeWidth="1.6" />
      <path d="M252 182a6 6 0 0 1 0 12" fill="none" stroke="#1D2B28" strokeWidth="1.6" />
      <path className="steam" d="M234 170c-5-6 5-10 0-17" fill="none" stroke="#9FB8A9" strokeWidth="2" strokeLinecap="round" />
      <path className="steam" d="M244 170c-5-6 5-10 0-17" fill="none" stroke="#9FB8A9" strokeWidth="2" strokeLinecap="round" style={{ animationDelay: "1.4s" }} />
    </svg>
  );
}
