import {
  mdiAlertCircleOutline,
  mdiArrowLeft,
  mdiArrowRight,
  mdiBellOutline,
  mdiBookOpenPageVariantOutline,
  mdiBookshelf,
  mdiCalendarCheckOutline,
  mdiCalendarClockOutline,
  mdiCardAccountDetailsOutline,
  mdiCameraOutline,
  mdiCheck,
  mdiCheckCircleOutline,
  mdiClockOutline,
  mdiChevronDown,
  mdiChevronLeft,
  mdiChevronRight,
  mdiClipboardTextOutline,
  mdiClose,
  mdiCoffeeOutline,
  mdiMapMarkerOutline,
  mdiMenu,
  mdiAccountGroupOutline,
  mdiEyeOutline,
  mdiStar,
  mdiStarHalfFull,
  mdiStarOutline,
  mdiBookArrowLeftOutline,
  mdiEyeOffOutline,
  mdiEmailOutline,
  mdiHeart,
  mdiHistory,
  mdiImageOutline,
  mdiHeartOutline,
  mdiLoading,
  mdiMagnify,
  mdiPackageVariantClosed,
  mdiPencilOutline,
  mdiPlus,
  mdiTrashCanOutline,
  mdiTrayArrowUp,
} from "@mdi/js";
import type { SVGProps } from "react";

type IconProps = Omit<SVGProps<SVGSVGElement>, "children"> & { size?: number };

/** Ikon Material Design Icons (@mdi/js): satu path pada kisi 24x24, warnanya mengikuti teks sekitarnya. */
function Icon({ path, size = 20, ...rest }: IconProps & { path: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true" {...rest}>
      <path d={path} />
    </svg>
  );
}

export const ArrowRight = (p: IconProps) => <Icon path={mdiArrowRight} {...p} />;
export const ArrowLeft = (p: IconProps) => <Icon path={mdiArrowLeft} {...p} />;
export const ChevronLeft = (p: IconProps) => <Icon path={mdiChevronLeft} {...p} />;
export const ChevronRight = (p: IconProps) => <Icon path={mdiChevronRight} {...p} />;
export const ChevronDown = (p: IconProps) => <Icon path={mdiChevronDown} {...p} />;
export const Bell = (p: IconProps) => <Icon path={mdiBellOutline} size={22} {...p} />;
export const Search = (p: IconProps) => <Icon path={mdiMagnify} size={22} {...p} />;
export const Check = (p: IconProps) => <Icon path={mdiCheck} {...p} />;
export const Cross = (p: IconProps) => <Icon path={mdiClose} {...p} />;
export const Menu = (p: IconProps) => <Icon path={mdiMenu} size={24} {...p} />;
export const Camera = (p: IconProps) => <Icon path={mdiCameraOutline} {...p} />;
export const Trash = (p: IconProps) => <Icon path={mdiTrashCanOutline} {...p} />;
export const Plus = (p: IconProps) => <Icon path={mdiPlus} {...p} />;
export const Upload = (p: IconProps) => <Icon path={mdiTrayArrowUp} {...p} />;
export const ImageIcon = (p: IconProps) => <Icon path={mdiImageOutline} {...p} />;
export const Eye = (p: IconProps) => <Icon path={mdiEyeOutline} {...p} />;
export const EyeOff = (p: IconProps) => <Icon path={mdiEyeOffOutline} {...p} />;
export const Mail = (p: IconProps) => <Icon path={mdiEmailOutline} {...p} />;
export const History = (p: IconProps) => <Icon path={mdiHistory} {...p} />;
export const Clock = (p: IconProps) => <Icon path={mdiClockOutline} {...p} />;
export const CheckCircle = (p: IconProps) => <Icon path={mdiCheckCircleOutline} {...p} />;
export const CalendarClock = (p: IconProps) => <Icon path={mdiCalendarClockOutline} {...p} />;
export const Heart = ({ filled, ...p }: IconProps & { filled?: boolean }) => (
  <Icon path={filled ? mdiHeart : mdiHeartOutline} {...p} />
);
export const OpenBook = (p: IconProps) => <Icon path={mdiBookOpenPageVariantOutline} {...p} />;
export const Pencil = (p: IconProps) => <Icon path={mdiPencilOutline} {...p} />;
export const CalendarCheck = (p: IconProps) => <Icon path={mdiCalendarCheckOutline} size={24} {...p} />;
export const IdCard = (p: IconProps) => <Icon path={mdiCardAccountDetailsOutline} size={24} {...p} />;
export const Alert = (p: IconProps) => <Icon path={mdiAlertCircleOutline} size={24} {...p} />;
export const Clipboard = (p: IconProps) => <Icon path={mdiClipboardTextOutline} size={24} {...p} />;
export const Parcel = (p: IconProps) => <Icon path={mdiPackageVariantClosed} size={24} {...p} />;
export const Coffee = (p: IconProps) => <Icon path={mdiCoffeeOutline} size={24} {...p} />;
export const MapPin = (p: IconProps) => <Icon path={mdiMapMarkerOutline} {...p} />;
export const People = (p: IconProps) => <Icon path={mdiAccountGroupOutline} {...p} />;
export const Star = (p: IconProps) => <Icon path={mdiStar} {...p} />;
export const StarHalf = (p: IconProps) => <Icon path={mdiStarHalfFull} {...p} />;
export const StarOutline = (p: IconProps) => <Icon path={mdiStarOutline} {...p} />;
export const ReturnBook = (p: IconProps) => <Icon path={mdiBookArrowLeftOutline} {...p} />;
export const Shelf = (p: IconProps) => <Icon path={mdiBookshelf} size={24} {...p} />;

/** Pemutar untuk tombol yang sedang memproses. Ikuti warna teks tombol; berhenti berputar bila gerak dikurangi. */
export const Spinner = (p: IconProps) => <Icon path={mdiLoading} {...p} className={`animate-spin ${p.className ?? ""}`} />;
