import type { Gender } from "@/lib/people";

export function ReaderArmchair({ gender, name, className }: { gender: Gender; name: string; className?: string }) {
  const isFemale = gender === "perempuan";
  const isMale = !isFemale;
  return (
    <svg className={className} viewBox="0 0 560 460" role="img" aria-label={`Ilustrasi ${name} membaca buku di kursi berlengan dekat jendela, ditemani kucing yang tertidur, lampu baca, dan secangkir teh`}>
      <path d="M150 300V170a130 130 0 0 1 260 0v130z" fill="#EAF0EC" />
      <circle cx="352" cy="112" r="24" fill="#F1DFCB" />
      <g className="cloud" fill="#FFFFFF" opacity=".85">
        <rect x="180" y="122" width="70" height="16" rx="8" />
        <rect x="196" y="112" width="34" height="18" rx="9" />
      </g>
      <path d="M150 300V170a130 130 0 0 1 260 0v130" fill="none" stroke="#F8F7F1" strokeWidth="10" />
      <path d="M280 40v260M150 186h260" stroke="#F8F7F1" strokeWidth="6" />
      <ellipse cx="280" cy="420" rx="236" ry="30" fill="#E2DACB" />
      <circle className="glow" cx="470" cy="170" r="70" fill="#F6E3B8" />
      <path d="M470 168V400" stroke="#2E4A43" strokeWidth="4" />
      <ellipse cx="470" cy="402" rx="24" ry="6" fill="#2E4A43" />
      <path d="M440 168h60l-12-44h-36z" fill="#E3BE9C" />
      <path d="M440 168h60" stroke="#D4A985" strokeWidth="3" />
      <g className="sway">
        <path d="M528 366c-10-16-12-38-2-54 10 14 10 36 2 54z" fill="#5E7D74" />
        <path d="M528 366c2-22 14-36 30-40-2 18-14 32-30 40z" fill="#7F9C8E" />
        <path d="M528 366c-6-18-20-28-36-28 4 16 18 26 36 28z" fill="#8FAE9C" />
      </g>
      <path d="M510 400l4-34h28l4 34z" fill="#C99A7A" />
      <rect x="170" y="168" width="220" height="210" rx="64" fill="#7F9C8E" />
      <circle cx="230" cy="226" r="3" fill="#6B8B7E" />
      <circle cx="280" cy="218" r="3" fill="#6B8B7E" />
      <circle cx="330" cy="226" r="3" fill="#6B8B7E" />
      <rect x="150" y="366" width="260" height="20" rx="10" fill="#5E7D74" />
      <path d="M172 386v16M388 386v16" stroke="#6E5A48" strokeWidth="7" strokeLinecap="round" />
      <rect x="182" y="300" width="196" height="72" rx="24" fill="#8FAE9C" />
      <rect x="140" y="250" width="60" height="132" rx="28" fill="#6B8B7E" />
      <rect x="360" y="250" width="60" height="132" rx="28" fill="#6B8B7E" />
      <g className="breathe">
        {isFemale && (
          <g>
            <path d="M232 330l-6 64h108l-6-64z" fill="#2E4A43" />
            <ellipse cx="248" cy="396" rx="17" ry="7" fill="#3A2E26" />
            <ellipse cx="312" cy="396" rx="17" ry="7" fill="#3A2E26" />
          </g>
        )}
        {isMale && (
          <g>
            <path d="M230 330l-4 64h46l-2-64z" fill="#2E4A43" />
            <path d="M290 330l-2 64h46l-4-64z" fill="#2E4A43" />
            <ellipse cx="249" cy="396" rx="18" ry="7" fill="#3A2E26" />
            <ellipse cx="311" cy="396" rx="18" ry="7" fill="#3A2E26" />
          </g>
        )}
        <path d="M220 300h120c10 0 16 10 14 22-2 10-10 14-20 14H226c-10 0-18-4-20-14-2-12 4-22 14-22z" fill="#35554D" />
        {isFemale && (
          <g>
            <path d="M232 212c-18 8-24 36-20 92h136c4-56-2-84-20-92z" fill="#5C7395" />
            <path d="M280 98c-30 0-48 22-48 52 0 25 6 40 4 55-2 20 10 45 44 53 34-8 46-33 44-53-2-15 4-30 4-55 0-30-18-52-48-52z" fill="#E3BE9C" />
            <path d="M252 198c4 18 10 34 24 50M308 198c-4 18-10 34-24 50" stroke="#D4A985" strokeWidth="3" fill="none" strokeLinecap="round" />
            <ellipse cx="280" cy="150" rx="31" ry="36" fill="#D4A985" />
            <ellipse cx="280" cy="152" rx="27" ry="32" fill="#C68B62" />
            <path d="M264 140q6-3 12 0M284 140q6-3 12 0" stroke="#5A4030" strokeWidth="1.8" fill="none" strokeLinecap="round" />
            <path d="M265 152q5 4 10 0M285 152q5 4 10 0" stroke="#2B211B" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M280 156q-3 6 1 9" stroke="#A86E48" strokeWidth="1.6" fill="none" strokeLinecap="round" />
            <circle cx="264" cy="165" r="5.5" fill="#E0937A" opacity=".5" />
            <circle cx="296" cy="165" r="5.5" fill="#E0937A" opacity=".5" />
            <path d="M273 172q7 5 14 0" stroke="#7E3F30" strokeWidth="2" fill="none" strokeLinecap="round" />
          </g>
        )}
        {isMale && (
          <g>
            <rect x="267" y="172" width="26" height="44" rx="9" fill="#B07350" />
            <path d="M232 212c-18 8-24 36-20 92h136c4-56-2-84-20-92z" fill="#5C7395" />
            <path d="M262 208l18 28 18-28z" fill="#F3E8D6" />
            <path d="M262 208l-7 11 15 5zM298 208l7 11-15 5z" fill="#FFFFFF" stroke="#DCD6C8" strokeWidth="1" />
            <ellipse cx="253" cy="154" rx="5.5" ry="8.5" fill="#C68B62" />
            <ellipse cx="307" cy="154" rx="5.5" ry="8.5" fill="#C68B62" />
            <ellipse cx="280" cy="150" rx="27" ry="31" fill="#C68B62" />
            <path d="M252 150C248 118 262 98 282 98c22 0 32 18 27 50-3-12-8-20-14-24-12 7-27 9-40 4-2 7-3 14-3 22z" fill="#2B211B" />
            <path d="M262 139q6-3 12 0M286 139q6-3 12 0" stroke="#2B211B" strokeWidth="2.2" fill="none" strokeLinecap="round" />
            <path d="M265 153q4 3 8 0M287 153q4 3 8 0" stroke="#2B211B" strokeWidth="2" fill="none" strokeLinecap="round" />
            <circle cx="269" cy="152" r="9.5" fill="#FFFFFF" fillOpacity=".14" stroke="#1D2B28" strokeWidth="1.8" />
            <circle cx="291" cy="152" r="9.5" fill="#FFFFFF" fillOpacity=".14" stroke="#1D2B28" strokeWidth="1.8" />
            <path d="M278.5 151q1.5-2 3 0M259.5 150l-6-2M300.5 150l6-2" stroke="#1D2B28" strokeWidth="1.8" fill="none" />
            <path d="M280 157q-3 6 1 9" stroke="#A86E48" strokeWidth="1.6" fill="none" strokeLinecap="round" />
            <circle cx="264" cy="166" r="5" fill="#E0937A" opacity=".45" />
            <circle cx="296" cy="166" r="5" fill="#E0937A" opacity=".45" />
            <path d="M273 173q7 5 14 0" stroke="#7E3F30" strokeWidth="2" fill="none" strokeLinecap="round" />
          </g>
        )}
        <path d="M228 220c-22 16-26 46-8 64l26-8c-10-12-8-28 2-40z" fill="#4E6585" />
        <path d="M332 220c22 16 26 46 8 64l-26-8c10-12 8-28-2-40z" fill="#4E6585" />
        <path d="M280 254l-54-11-2 48 56 8 56-8-2-48z" fill="#4F6F66" />
        <path d="M280 250l-50-10v46l50 8z" fill="#FAF9F3" />
        <path d="M280 250l50-10v46l-50 8z" fill="#FAF9F3" />
        <path d="M240 254l30 5M240 263l30 5M240 272l30 5M290 259l30-5M290 268l30-5M290 277l30-5" stroke="#CFD6CC" strokeWidth="1.6" />
        <path className="page-flip" d="M280 250l48-9v44l-48 9z" fill="#FFFFFF" stroke="#DCE0D6" strokeWidth="1" />
        <path d="M280 250v44" stroke="#C9CFC4" strokeWidth="1.4" />
        <ellipse cx="231" cy="272" rx="9" ry="12" fill="#C68B62" />
        <ellipse cx="329" cy="272" rx="9" ry="12" fill="#C68B62" />
      </g>
      <path className="tail" d="M416 246c16 0 22-14 12-24" stroke="#9A8F84" strokeWidth="7" fill="none" strokeLinecap="round" />
      <ellipse cx="392" cy="244" rx="30" ry="14" fill="#9A8F84" />
      <path d="M384 234q8 6 2 18M400 233q6 7 0 18" stroke="#857A70" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <circle cx="366" cy="238" r="13" fill="#9A8F84" />
      <path d="M356 232l2-12 8 8zM368 226l7-8 3 12z" fill="#9A8F84" />
      <path d="M359 239q3 2.5 6 0M368 239q3 2.5 6 0" stroke="#3A2E26" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M48 306l-4 94M116 306l4 94" stroke="#6E5A48" strokeWidth="5" strokeLinecap="round" />
      <rect x="34" y="296" width="96" height="11" rx="5.5" fill="#6E5A48" />
      <rect x="96" y="286" width="28" height="10" rx="2" fill="#74678F" />
      <path d="M60 272h24v12a9 9 0 0 1-9 9h-6a9 9 0 0 1-9-9z" fill="#F8F7F1" stroke="#1D2B28" strokeWidth="1.5" />
      <path d="M84 276a5 5 0 0 1 0 10" fill="none" stroke="#1D2B28" strokeWidth="1.5" />
      <path className="steam" d="M68 264c-4-5 4-9 0-15" fill="none" stroke="#9FB8A9" strokeWidth="2" strokeLinecap="round" />
      <path className="steam" d="M77 264c-4-5 4-9 0-15" fill="none" stroke="#9FB8A9" strokeWidth="2" strokeLinecap="round" style={{ animationDelay: "1.4s" }} />
      <rect x="126" y="384" width="52" height="12" rx="2.5" fill="#E3BE9C" />
      <rect x="132" y="372" width="44" height="12" rx="2.5" fill="#2F4A5C" />
    </svg>
  );
}
