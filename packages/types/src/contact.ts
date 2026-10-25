/**
 * Phone numbers and UPI IDs — the two pieces of contact info a plan can carry.
 * Shared so the form, the API gate and the party room agree on what's valid.
 */

/**
 * "+91XXXXXXXXXX" for an Indian mobile however it was typed (spaces, dashes,
 * 0- or 91-prefix), "+<digits>" for anything already international, or null.
 *
 * ponytail: India-first. Other countries must be typed with their "+" code;
 * a real per-country parser (libphonenumber) is the upgrade if that matters.
 */
export function normalizePhone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const raw = value.replace(/[\s\-().]/g, "");
  const indian = raw.match(/^(?:\+?91|0)?([6-9]\d{9})$/);
  if (indian) return `+91${indian[1]}`;
  if (/^\+[1-9]\d{7,14}$/.test(raw)) return raw;
  return null;
}

/** name@bank, the shape every UPI app hands out. */
export function normalizeUpiId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim().toLowerCase();
  return /^[a-z0-9.\-_]{2,256}@[a-z][a-z0-9]{1,63}$/.test(id) ? id : null;
}

/**
 * A upi://pay link — on a phone it opens GPay / PhonePe / Paytm with the payee,
 * amount and note filled in. Person-to-person, so no gateway and no fees.
 */
export function upiPayLink({
  upiId,
  payeeName,
  amount,
  note,
}: {
  upiId: string;
  payeeName: string;
  amount: number;
  note: string;
}): string {
  const q = new URLSearchParams({
    pa: upiId,
    pn: payeeName,
    am: amount.toFixed(2),
    cu: "INR",
    tn: note.slice(0, 50),
  });
  return `upi://pay?${q.toString()}`;
}
