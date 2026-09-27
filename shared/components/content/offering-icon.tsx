import {
  BookHeart,
  BookImage,
  Clapperboard,
  Flame,
  Flower2,
  Frame,
  Heart,
  IdCard,
  Image as ImageIcon,
  PartyPopper,
  Printer,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { OfferingIcon as IconName } from "@/shared/domain/offering";

const ICONS: Record<IconName, LucideIcon> = {
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
};

/** An offering's small gold icon (outline, never decorative-large). */
export function OfferingIcon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  const Icon = ICONS[name];
  return <Icon className={`${className} text-primary`} strokeWidth={1.7} aria-hidden />;
}
