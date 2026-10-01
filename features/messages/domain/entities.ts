import type { MessageStatus } from "@/lib/supabase/types";

/** What the enquiry form offers under "What for"; the dashboard filters by the same list. */
export const occasions = [
  "Wedding",
  "Pre-wedding shoot",
  "Pasni, bratabandha or puja",
  "Studio portraits",
  "Event or programme",
  "Album, frame or prints",
  "Passport or ID photos",
  "Something else",
] as const;

/** An enquiry sent from the contact page, as the dashboard shows it. */
export type Message = {
  id: string;
  name: string;
  phone: string;
  email: string;
  occasion: string;
  eventDate: string;
  place: string;
  message: string;
  sourcePath: string;
  status: MessageStatus;
  createdAt: string;
};

export const messageStatuses: { value: MessageStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "read", label: "Read" },
  { value: "replied", label: "Replied" },
  { value: "archived", label: "Archived" },
];

/** Limits shared by the form, the action and the database checks. */
export const MESSAGE_LIMITS = { name: 100, phone: 40, email: 200, occasion: 80, eventDate: 60, place: 120, message: 2000 } as const;
