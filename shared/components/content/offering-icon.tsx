import {
  Album,
  Aperture,
  Baby,
  BookHeart,
  BookImage,
  Cake,
  Camera,
  Clapperboard,
  Crown,
  Drum,
  Film,
  Flame,
  Flower2,
  Frame,
  Gem,
  Gift,
  GraduationCap,
  HandHeart,
  Heart,
  IdCard,
  Image as ImageIcon,
  Images,
  Landmark,
  Mountain,
  Music,
  PartyPopper,
  Printer,
  ScanFace,
  Smile,
  Sunrise,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react";
import type { OfferingIcon as IconName } from "@/shared/domain/offering";
import { MaskIcon } from "@/shared/components/ui/mask-icon";

export const OFFERING_ICON_COMPONENTS: Record<IconName, LucideIcon> = {
  Heart,
  Clapperboard,
  Flower2,
  Flame,
  Users,
  IdCard,
  PartyPopper,
  BookHeart,
  Frame,
  Image: ImageIcon,
  Printer,
  BookImage,
  Camera,
  Aperture,
  Film,
  Video,
  Baby,
  Gift,
  Music,
  Drum,
  Cake,
  Gem,
  Crown,
  HandHeart,
  Images,
  Album,
  Landmark,
  GraduationCap,
  Mountain,
  Sunrise,
  ScanFace,
  Smile,
};

/**
 * An offering's small gold icon (outline, never decorative-large): the icon chosen in the
 * dashboard (`svg`, cleaned markup drawn as a mask in the text colour) when there is one,
 * else the built-in lucide icon `name` (unknown names fall back to a camera).
 */
export function OfferingIcon({ name, svg, className = "h-5 w-5" }: { name: IconName; svg?: string | null; className?: string }) {
  if (svg) return <MaskIcon svg={svg} className={`${className} text-primary`} />;
  const Icon = OFFERING_ICON_COMPONENTS[name] ?? Camera;
  return <Icon className={`${className} text-primary`} strokeWidth={1.7} aria-hidden />;
}
