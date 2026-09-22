/**
 * Normalize a phone number for tel: / WhatsApp links.
 * Returns digits-only E.164-ish string without +, or null if unusable.
 */
export function normalizePhoneForLink(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const trimmed = phone.trim();
  if (!trimmed) return null;

  let digits = trimmed.replace(/[^\d+]/g, "");
  if (!digits) return null;

  // Strip leading +
  if (digits.startsWith("+")) {
    digits = digits.slice(1);
  }

  digits = digits.replace(/\D/g, "");
  if (digits.length < 7) return null;

  // Fix UK stored as +4407... → 447...
  if (digits.startsWith("440") && digits.length >= 12) {
    digits = `44${digits.slice(3)}`;
  }

  // UK local 07... → 447...
  if (digits.startsWith("07") && digits.length === 11) {
    return `44${digits.slice(1)}`;
  }

  // UK without leading 0: 7xxxxxxxxx
  if (digits.startsWith("7") && digits.length === 10) {
    return `44${digits}`;
  }

  return digits;
}

export function getTelHref(phone: string | null | undefined): string | null {
  const normalized = normalizePhoneForLink(phone);
  return normalized ? `tel:+${normalized}` : null;
}

export function getWhatsAppHref(
  phone: string | null | undefined,
  message?: string
): string | null {
  const normalized = normalizePhoneForLink(phone);
  if (!normalized) return null;
  const base = `https://wa.me/${normalized}`;
  if (!message) return base;
  const params = new URLSearchParams();
  params.set("text", message);
  return `${base}?${params.toString()}`;
}

export function openPhoneCall(phone: string | null | undefined): boolean {
  const href = getTelHref(phone);
  if (!href) return false;
  window.location.href = href;
  return true;
}

export function openWhatsAppChat(
  phone: string | null | undefined,
  message?: string
): boolean {
  const href = getWhatsAppHref(phone, message);
  if (!href) return false;
  window.open(href, "_blank", "noopener,noreferrer");
  return true;
}
