export type AvatarLook = {
  type: "hijab" | "short" | "bob" | "long" | "crop";
  skin: string;
  shirt: string;
  hair?: string;
  hijab?: string;
  hijabShade?: string;
  glasses?: boolean;
  /** Alamat foto unggahan. Bila ada, foto dipakai menggantikan ilustrasi. */
  photo?: string;
};

const SKIN_SHADE: Record<string, string> = {
  "#D9A27C": "#C08560",
  "#C68B62": "#B07350",
  "#A8704A": "#8F5C3B",
  "#8E5B3A": "#764A2E",
};

/** Potret setengah badan bergaya ilustrasi, dipakai untuk avatar dan kartu anggota. */
export function Avatar({ look, className }: { look: AvatarLook; className?: string }) {
  if (look.photo) {
    // eslint-disable-next-line @next/next/no-img-element -- foto kecil dari rute sendiri, tidak perlu optimasi next/image
    return <img src={look.photo} alt="" width={120} height={120} className={`${className ?? ""} object-cover`} />;
  }
  const { type, skin, shirt, glasses } = look;
  const hair = look.hair ?? "#2B211B";
  const hijab = look.hijab ?? "#E3BE9C";
  const hijabShade = look.hijabShade ?? "#D4A985";
  const isHijab = type === "hijab";
  const face = isHijab ? { rx: 18, ry: 22 } : { rx: 21, ry: 25 };

  return (
    <svg className={className} viewBox="0 0 120 120" aria-hidden="true">
      <rect width="120" height="120" fill="#DCE5DD" />
      {type === "bob" && (
        <path d="M30 62c-4-30 8-48 30-48s34 18 30 48c-2 12-5 20-8 26H38c-3-6-6-14-8-26z" fill={hair} />
      )}
      {type === "long" && (
        <path d="M28 64c-4-32 8-50 32-50s36 18 32 50c-1 14-3 28-6 40H34c-3-12-5-26-6-40z" fill={hair} />
      )}
      {!isHijab && <rect x="50" y="68" width="20" height="26" rx="6" fill={SKIN_SHADE[skin] ?? skin} />}
      <path d="M12 120c2-22 22-34 48-34s46 12 48 34z" fill={shirt} />
      {!isHijab && <path d="M48 87l12 17 12-17z" fill="#F3E8D6" />}
      {isHijab && (
        <g>
          <path
            d="M60 16c-20 0-31 16-31 37 0 15 4 23 2 33 9 13 19 18 29 20 10-2 20-7 29-20-2-10 2-18 2-33 0-21-11-37-31-37z"
            fill={hijab}
          />
          <path d="M44 84c6 8 10 14 16 22M76 84c-6 8-10 14-16 22" stroke={hijabShade} strokeWidth="2" fill="none" />
          <ellipse cx="60" cy="54" rx="21" ry="25" fill={hijabShade} />
        </g>
      )}
      {(type === "short" || type === "crop") && (
        <g fill={skin}>
          <ellipse cx="39" cy="57" rx="4.5" ry="7" />
          <ellipse cx="81" cy="57" rx="4.5" ry="7" />
        </g>
      )}
      <ellipse cx="60" cy="55" rx={face.rx} ry={face.ry} fill={skin} />
      {type === "short" && (
        <path
          d="M39 56c-4-26 8-42 22-42 18 0 26 16 22 40-3-10-7-16-12-19-10 6-21 7-31 3-1 5-1 11-1 18z"
          fill={hair}
        />
      )}
      {type === "crop" && (
        <path d="M40 50c0-19 9-29 20-29s20 10 20 29c-5-7-12-10-20-10s-15 3-20 10z" fill={hair} />
      )}
      {(type === "bob" || type === "long") && (
        <path d="M38 50c0-20 10-30 22-30s22 10 22 30c-6-9-13-13-22-13s-16 4-22 13z" fill={hair} />
      )}
      <path
        d="M49 45q4.5-2.5 9 0M62 45q4.5-2.5 9 0"
        stroke={isHijab ? "#5A4030" : hair}
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
      />
      <ellipse cx="53.5" cy="54" rx="1.9" ry="2.4" fill="#2B211B" />
      <ellipse cx="66.5" cy="54" rx="1.9" ry="2.4" fill="#2B211B" />
      {glasses && (
        <g fill="none" stroke="#1D2B28" strokeWidth="1.6">
          <circle cx="53" cy="54" r="7" />
          <circle cx="67" cy="54" r="7" />
          <path d="M58.8 53.5q1.2-1.6 2.4 0" />
        </g>
      )}
      <circle cx="47" cy="64" r="3.4" fill="#E0937A" opacity=".45" />
      <circle cx="73" cy="64" r="3.4" fill="#E0937A" opacity=".45" />
      <path d="M54 67q6 5 12 0" stroke="#7E3F30" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </svg>
  );
}
