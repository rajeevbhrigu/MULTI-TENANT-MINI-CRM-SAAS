import "server-only";

export type ChargeResult = { success: true; providerPaymentId: string } | { success: false; error: string };

/**
 * Payment provider abstraction. Business logic (subscriptions, invoices,
 * usage limits) never calls Stripe/Razorpay SDKs directly - it goes through
 * this interface so the provider can be swapped without touching the CRM
 * core. Only the mock provider is wired up here; implement the Stripe /
 * Razorpay classes against real credentials when available.
 */
export interface PaymentProvider {
  readonly name: string;
  charge(params: { amount: number; currency: string; description: string }): Promise<ChargeResult>;
}

class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock";
  async charge(params: { amount: number; currency: string; description: string }): Promise<ChargeResult> {
    // Deterministic success in the mock provider - never presented as a
    // real charge. Swap PAYMENT_PROVIDER to "stripe" or "razorpay" and
    // implement the corresponding class once credentials are available.
    return { success: true, providerPaymentId: `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` };
  }
}

let provider: PaymentProvider | null = null;

export function getPaymentProvider(): PaymentProvider {
  if (provider) return provider;
  // Only "mock" is implemented today; this switch is the seam where a real
  // Stripe/Razorpay adapter plugs in without changing any call site.
  provider = new MockPaymentProvider();
  return provider;
}
