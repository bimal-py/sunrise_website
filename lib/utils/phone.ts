/**
 * A client's typed number as WhatsApp digits: "984-1234567" or "09841234567" → "9779841234567".
 * Nepali mobiles (10 digits starting with 9) get the country code; anything else is kept as typed.
 */
export function toWhatsappNumber(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (/^9\d{9}$/.test(digits)) return `977${digits}`;
  return digits;
}
