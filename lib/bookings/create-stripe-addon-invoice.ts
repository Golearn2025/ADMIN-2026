import Stripe from "stripe";

export type AddonInvoiceResult = {
  invoiceId: string;
  invoiceNumber: string | null;
  hostedInvoiceUrl: string | null;
  stripeCustomerId: string;
  amountPence: number;
  status: string;
};

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key);
}

/**
 * Create + finalize a Stripe Invoice for an extra charge on an existing booking.
 * Sends the invoice email when Stripe customer has an email.
 */
export async function createStripeAddonInvoice(params: {
  amountPence: number;
  currency?: string;
  customerEmail: string;
  customerName?: string | null;
  existingStripeCustomerId?: string | null;
  bookingReference: string;
  bookingId: string;
  description: string;
  hoursExtra?: number | null;
}): Promise<AddonInvoiceResult> {
  if (!Number.isFinite(params.amountPence) || params.amountPence < 50) {
    throw new Error("amountPence must be at least 50 (£0.50)");
  }

  const stripe = getStripe();
  const currency = (params.currency || "gbp").toLowerCase();

  let customerId = params.existingStripeCustomerId || null;
  if (!customerId) {
    const created = await stripe.customers.create({
      email: params.customerEmail,
      name: params.customerName || undefined,
      metadata: { booking_id: params.bookingId, source: "admin_addon" },
    });
    customerId = created.id;
  }

  await stripe.invoiceItems.create({
    customer: customerId,
    amount: Math.round(params.amountPence),
    currency,
    description: params.description,
    metadata: {
      booking_id: params.bookingId,
      booking_reference: params.bookingReference,
      kind: "extra_charge",
      hours_extra: params.hoursExtra != null ? String(params.hoursExtra) : "",
    },
  });

  const invoice = await stripe.invoices.create({
    customer: customerId,
    collection_method: "send_invoice",
    days_until_due: 1,
    metadata: {
      booking_id: params.bookingId,
      booking_reference: params.bookingReference,
      kind: "extra_charge",
    },
    pending_invoice_items_behavior: "include",
  });

  const finalized = await stripe.invoices.finalizeInvoice(invoice.id);
  let sent = finalized;
  try {
    sent = await stripe.invoices.sendInvoice(finalized.id);
  } catch {
    // Still return hosted URL even if email send fails (test mode / missing email)
    sent = finalized;
  }

  return {
    invoiceId: sent.id,
    invoiceNumber: sent.number ?? null,
    hostedInvoiceUrl: sent.hosted_invoice_url ?? null,
    stripeCustomerId: customerId,
    amountPence: Math.round(params.amountPence),
    status: sent.status || "open",
  };
}
