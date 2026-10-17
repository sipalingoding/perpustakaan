/**
 * Muka gedung perpustakaan: jam di atas pintu, papan "Buka"/"Tutup", jendela berisi rak buku, dan penanda lokasi.
 * `night`: di luar jam layanan, langit gelap dengan bulan dan bintang, jendela dan lampu jalan menyala.
 */
export function LibraryFront({
  className,
  night = false,
  open = true,
}: {
  className?: string;
  night?: boolean;
  open?: boolean;
}) {
  const c = night
    ? { hill: "#3D5E6B", hill2: "#355262", wall: "#E4E0D2", pane: "#F2D9A6", shelf: "#C99A7A", tree: ["#4F6F66", "#3F5F58", "#355249"] }
    : { hill: "#D2DDD4", hill2: "#B7C9BC", wall: "#F8F7F1", pane: "#2F4A5C", shelf: "#E4E0D2", tree: ["#7F9C8E", "#5E7D74", "#4F6F66"] };
  return (
    <svg
      className={className}
      viewBox="0 0 360 270"
      role="img"
      aria-label={`Ilustrasi gedung perpustakaan ${night ? "pada malam hari" : "pada siang hari"} dengan jam di atas pintu, papan bertuliskan ${open ? "buka" : "tutup"}, dan penanda lokasi`}
    >
      <defs>
        <clipPath id="library-front-clip">
          <rect width="360" height="270" rx="24" />
        </clipPath>
      </defs>
      <g clipPath="url(#library-front-clip)">
        {/* Langit dan bukit */}
        {night ? (
          <>
            <rect width="360" height="270" fill="#2F4A5C" />
            <circle cx="292" cy="58" r="22" fill="#F2E3C6" />
            <circle cx="302" cy="51" r="20" fill="#2F4A5C" />
            <circle className="twinkle" cx="40" cy="40" r="2" fill="#F2E3C6" />
            <circle className="twinkle" cx="110" cy="24" r="1.6" fill="#F2E3C6" style={{ animationDelay: ".8s" }} />
            <circle className="twinkle" cx="250" cy="30" r="1.8" fill="#F2E3C6" style={{ animationDelay: "1.6s" }} />
            <circle className="twinkle" cx="330" cy="110" r="1.6" fill="#F2E3C6" style={{ animationDelay: ".4s" }} />
            <circle className="twinkle" cx="70" cy="96" r="1.8" fill="#F2E3C6" style={{ animationDelay: "2.2s" }} />
            <circle cx="306" cy="172" r="22" fill="#F2E3C6" opacity=".18" />
          </>
        ) : (
          <circle cx="292" cy="58" r="26" fill="#F2E3C6" />
        )}
        <path
          d="M0 214c50-26 104-30 160-18s112 10 200-14v88H0z"
          fill={c.hill}
        />
        <path d="M0 236c70-14 140-14 200-6s110 4 160-8v48H0z" fill={c.hill2} />

        {/* Pohon */}
        <g className="sway">
          <circle cx="52" cy="150" r="30" fill={c.tree[0]} />
          <circle cx="34" cy="172" r="20" fill={c.tree[1]} />
          <circle cx="70" cy="174" r="18" fill={c.tree[2]} />
        </g>
        <path
          d="M52 236v-52"
          stroke="#8A6A55"
          strokeWidth="6"
          strokeLinecap="round"
        />

        {/* Gedung */}
        <path
          d="M96 236V112h178v124z"
          fill={c.wall}
          stroke="#1D2B28"
          strokeWidth="2"
        />
        <path
          d="M86 116l99-52 99 52z"
          fill="#4F6F66"
          stroke="#1D2B28"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <rect x="96" y="112" width="178" height="10" fill="#E3BE9C" />

        {/* Jam di atas pintu */}
        <circle
          cx="185"
          cy="96"
          r="13"
          fill="#F8F7F1"
          stroke="#1D2B28"
          strokeWidth="2"
        />
        <path
          d="M185 96v-8M185 96l-6 3"
          stroke="#1D2B28"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Jendela berisi rak buku */}
        <rect
          x="110"
          y="138"
          width="44"
          height="52"
          rx="4"
          fill={c.pane}
          stroke="#1D2B28"
          strokeWidth="2"
        />
        <rect
          x="216"
          y="138"
          width="44"
          height="52"
          rx="4"
          fill={c.pane}
          stroke="#1D2B28"
          strokeWidth="2"
        />
        <path d="M112 164h40M218 164h40" stroke={c.shelf} strokeWidth="2.5" />
        <path
          d="M118 162v-16M124 162v-12M131 162v-18M138 162v-14M145 162v-10"
          stroke="#E3BE9C"
          strokeWidth="4"
        />
        <path
          d="M118 186v-16M125 186v-18M132 186v-12M139 186v-16"
          stroke="#8FAE9C"
          strokeWidth="4"
        />
        <path
          d="M224 162v-14M231 162v-18M238 162v-12M245 162v-16M252 162v-10"
          stroke="#8FAE9C"
          strokeWidth="4"
        />
        <path
          d="M224 186v-12M231 186v-16M238 186v-18M245 186v-14"
          stroke="#E3BE9C"
          strokeWidth="4"
        />

        {/* Pintu dan papan "Buka" */}
        <path
          d="M166 236v-62a19 19 0 0 1 38 0v62z"
          fill="#C99A7A"
          stroke="#1D2B28"
          strokeWidth="2"
        />
        <circle cx="197" cy="208" r="2.5" fill="#1D2B28" />
        <path
          d="M177 172l8-8 8 8"
          fill="none"
          stroke="#1D2B28"
          strokeWidth="1.6"
        />
        <rect
          x="170"
          y="176"
          width="30"
          height="14"
          rx="3"
          fill="#F8F7F1"
          stroke="#1D2B28"
          strokeWidth="1.6"
        />
        <text
          x="185"
          y="186.5"
          textAnchor="middle"
          fontSize={open ? "8.5" : "7.5"}
          fontWeight="700"
          fill={open ? "#4F6F66" : "#9A5B3B"}
          fontFamily="Poppins, sans-serif"
        >
          {open ? "BUKA" : "TUTUP"}
        </text>
        <rect x="156" y="234" width="58" height="6" rx="2" fill="#CDC6B3" />

        {/* Lampu jalan */}
        <path
          d="M306 238v-74"
          stroke="#33433F"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path d="M296 166h20l-4-14h-12z" fill="#33433F" />
        <circle className={night ? "twinkle" : undefined} cx="306" cy="172" r="5" fill={night ? "#F2E3C6" : "#CDC6B3"} />

        {/* Penanda lokasi */}
        <g className="sway">
          <path
            d="M185 4c-14 0-24 10-24 23 0 17 24 37 24 37s24-20 24-37c0-13-10-23-24-23z"
            fill="#D9825B"
            stroke="#1D2B28"
            strokeWidth="2"
          />
          <circle
            cx="185"
            cy="27"
            r="8"
            fill="#F8F7F1"
            stroke="#1D2B28"
            strokeWidth="2"
          />
        </g>
      </g>
    </svg>
  );
}
