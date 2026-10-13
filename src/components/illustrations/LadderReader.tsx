import type { Gender } from "@/lib/people";

export function LadderReader({ gender, name, className }: { gender: Gender; name: string; className?: string }) {
  const isFemale = gender === "perempuan";
  const isMale = !isFemale;
  return (
    <svg className={className} viewBox="0 0 300 240" role="img" aria-label={`Ilustrasi ${name} menaiki tangga untuk menaruh buku di rak paling atas`}>
      <circle cx="150" cy="122" r="104" fill="#E6EDE7" />
      <rect x="168" y="24" width="112" height="200" rx="6" fill="#B9997A" />
      <rect x="176" y="32" width="96" height="184" rx="3" fill="#8F7358" />
      <rect x="176" y="76" width="96" height="6" fill="#B9997A" />
      <rect x="176" y="126" width="96" height="6" fill="#B9997A" />
      <rect x="176" y="176" width="96" height="6" fill="#B9997A" />
      <rect x="180" y="44" width="12" height="32" rx="2" fill="#4F6F66" />
      <rect x="214" y="40" width="10" height="36" rx="2" fill="#E3BE9C" />
      <rect x="226" y="46" width="14" height="30" rx="2" fill="#5C7395" />
      <rect x="242" y="42" width="10" height="34" rx="2" fill="#74678F" />
      <rect x="254" y="50" width="14" height="26" rx="2" fill="#C9D3D9" />
      <rect x="180" y="92" width="14" height="34" rx="2" fill="#2F4A5C" />
      <rect x="196" y="96" width="10" height="30" rx="2" fill="#D9A77E" />
      <rect x="208" y="90" width="12" height="36" rx="2" fill="#9AAE8E" />
      <path d="M224 126l10-32 9 3-10 32z" fill="#4F6F66" />
      <rect x="180" y="142" width="12" height="34" rx="2" fill="#74678F" />
      <rect x="194" y="146" width="16" height="30" rx="2" fill="#E3BE9C" />
      <rect x="212" y="140" width="10" height="36" rx="2" fill="#5C7395" />
      <rect x="226" y="150" width="12" height="26" rx="2" fill="#C9D3D9" />
      <rect x="184" y="204" width="44" height="10" rx="2" fill="#4F6F66" />
      <rect x="188" y="194" width="38" height="10" rx="2" fill="#E3BE9C" />
      <g stroke="#6E5A48" strokeWidth="4" strokeLinecap="round">
        <path d="M86 230L150 30M112 232L172 34" />
        <path d="M96 200l25 2M105 170l25 3M115 140l24 3M124 110l24 3M134 80l23 3M144 50l22 4" />
      </g>
      <path d="M126 74l-4 34h24l-2-34z" fill="#2E4A43" />
      {isMale && (
        <path d="M134 80v28" stroke="#22382F" strokeWidth="1.6" />
      )}
      <ellipse cx="130" cy="110" rx="7" ry="3.5" fill="#3A2E26" />
      <ellipse cx="142" cy="111.5" rx="7" ry="3.5" fill="#3A2E26" />
      {isMale && (
        <rect x="136" y="37" width="9" height="10" rx="3" fill="#B07350" />
      )}
      <path d="M124 76c-2-14 2-28 12-32 10 2 14 14 12 32z" fill="#5C7395" />
      <path d="M130 52l-4 20 4 18" stroke="#4E6585" strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="130" cy="92" r="4" fill="#C68B62" />
      {isFemale && (
        <g>
          <path d="M138 16c-9 0-15 7-15 16 0 8 2 14 1 20 4 6 10 8 16 8 6-2 10-6 12-12-2-4 0-10 0-16 0-9-5-16-14-16z" fill="#E3BE9C" />
          <ellipse cx="146" cy="30" rx="7.5" ry="9.5" fill="#D4A985" />
          <ellipse cx="146.5" cy="30" rx="6" ry="8" fill="#C68B62" />
          <circle cx="149" cy="28" r="1.3" fill="#2B211B" />
          <circle cx="148" cy="34" r="2" fill="#E0937A" opacity=".55" />
          <path d="M146.5 36.5q2 1.5 4 0" stroke="#7E3F30" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        </g>
      )}
      {isMale && (
        <g>
          <circle cx="142" cy="30" r="11" fill="#C68B62" />
          <path d="M131 33c-3-12 4-21 13-21 7 0 11 4 12 9-5-2-10-1-13 2-2 4-6 7-12 10z" fill="#2B211B" />
          <ellipse cx="137" cy="31" rx="2.6" ry="3.6" fill="#B07350" />
          <circle cx="148" cy="29" r="1.3" fill="#2B211B" />
          <circle cx="148" cy="29" r="3.4" fill="none" stroke="#1D2B28" strokeWidth="1.2" />
          <path d="M144.6 28.6l-6-1" stroke="#1D2B28" strokeWidth="1.2" />
          <circle cx="148" cy="35" r="2" fill="#E0937A" opacity=".5" />
          <path d="M147 37.5q2 1.5 4 0" stroke="#7E3F30" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        </g>
      )}
      <g className="reach">
        <rect x="192" y="40" width="12" height="34" rx="2" fill="#D9A77E" />
        <path d="M194 46h8M194 68h8" stroke="#3A2E26" strokeWidth="1.4" opacity=".5" />
        <path d="M146 50l22-10 18 6" stroke="#5C7395" strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="190" cy="48" r="4.6" fill="#C68B62" />
      </g>
      <path className="twinkle" d="M222 14l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#D9A77E" />
      <path className="twinkle" d="M266 26l1.5 3.5 3.5 1.5-3.5 1.5-1.5 3.5-1.5-3.5-3.5-1.5 3.5-1.5z" fill="#8FAE9C" style={{ animationDelay: "1.2s" }} />
    </svg>
  );
}
