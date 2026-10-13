/**
 * Kumpulan kelas Tailwind untuk elemen yang dipakai berulang.
 * Status aktif/terpilih memakai atribut ARIA (aria-pressed, aria-current),
 * jadi tampilan dan aksesibilitas selalu sejalan.
 */
export const ui = {
  wrap: "mx-auto w-full max-w-[1240px] px-[clamp(16px,4vw,40px)]",
  btn: "inline-flex min-h-[50px] cursor-pointer items-center justify-center gap-2.5 rounded-full px-[22px] text-[15px] font-semibold no-underline transition duration-200",
  primary: "bg-primary-600 text-cream hover:-translate-y-0.5 hover:text-cream hover:shadow-[0_16px_26px_-16px_rgba(29,43,40,.7)]",
  ghost: "border-[1.5px] border-primary-300 bg-transparent text-ink hover:bg-tint hover:text-ink",
  chip: "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border-[1.5px] border-field bg-transparent px-[18px] text-sm font-semibold text-ink-2 transition-colors hover:border-primary-400 hover:bg-tint aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-cream aria-pressed:hover:border-ink aria-pressed:hover:bg-ink",
  field:
    "w-full min-h-[50px] rounded-[14px] border-[1.5px] border-field bg-white px-4 text-[15px] text-ink transition focus:border-primary-600 focus:shadow-[0_0_0_4px_rgba(46,90,82,.15)] focus:outline-none",
  label: "text-[13px] font-bold text-ink-2",
  card: "rounded-[26px] border border-line bg-paper p-[26px]",
  eyebrow: "text-xs font-bold uppercase tracking-[0.14em] text-muted",
  stat: "inline-flex items-baseline gap-1.5 rounded-full border border-line bg-cream px-[15px] py-[9px] text-sm text-ink-2 [&_strong]:text-[17px] [&_strong]:text-ink",
  navlink:
    "inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold text-ink-2 no-underline transition-colors hover:bg-hover hover:text-ink aria-[current=page]:bg-ink aria-[current=page]:text-cream aria-[current=page]:hover:bg-ink aria-[current=page]:hover:text-cream",
  stepper:
    "inline-flex size-11 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-field bg-cream text-xl font-semibold text-ink hover:bg-white disabled:cursor-default disabled:opacity-40",
} as const;
