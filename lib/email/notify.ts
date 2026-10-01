import "server-only";

type Enquiry = { name: string; phone: string; email: string; occasion: string; date: string; place: string; message: string };

/**
 * Optional email to the studio for each new enquiry, through Resend (free tier is plenty).
 * Off unless RESEND_API_KEY and CONTACT_NOTIFICATION_TO are set; the enquiry is in the
 * dashboard's Messages either way. Never throws: a failed email must not fail the form.
 */
export async function notifyNewEnquiry(enquiry: Enquiry): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_NOTIFICATION_TO;
  if (!key || !to) return;

  const lines = [
    `Name: ${enquiry.name}`,
    `Phone / WhatsApp: ${enquiry.phone}`,
    enquiry.email && `Email: ${enquiry.email}`,
    `What for: ${enquiry.occasion}`,
    enquiry.date && `Date: ${enquiry.date}`,
    enquiry.place && `Place: ${enquiry.place}`,
    enquiry.message && `\n${enquiry.message}`,
  ].filter(Boolean);

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.CONTACT_NOTIFICATION_FROM || "Sunrise website <onboarding@resend.dev>",
        to: [to],
        subject: `New enquiry: ${enquiry.occasion} (${enquiry.name})`,
        text: `${lines.join("\n")}\n\nSee every message in the dashboard: /dashboard/messages`,
        ...(enquiry.email ? { reply_to: enquiry.email } : {}),
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) console.error("[enquiry] email failed", response.status, (await response.text()).slice(0, 200));
  } catch (error) {
    console.error("[enquiry] email failed", error);
  }
}
