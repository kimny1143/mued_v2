import { vi } from 'vitest';

/**
 * Mock Stripe client and responses for testing
 */

export interface MockStripeOptions {
  throwError?: boolean;
  customerId?: string;
  subscriptionId?: string;
}

export class MockStripe {
  private options: MockStripeOptions;

  constructor(options: MockStripeOptions = {}) {
    this.options = {
      throwError: false,
      customerId: 'cus_mock_123',
      subscriptionId: 'sub_mock_123',
      ...options,
    };
  }

  // Mock customers
  customers = {
    create: vi.fn().mockImplementation(async (params) => {
      if (this.options.throwError) {
        throw new Error('Mock Stripe error');
      }

      return {
        id: this.options.customerId,
        object: 'customer',
        email: params.email,
        metadata: params.metadata || {},
        created: Math.floor(Date.now() / 1000),
      };
    }),

    retrieve: vi.fn().mockImplementation(async (customerId) => {
      return {
        id: customerId,
        object: 'customer',
        email: 'test@example.com',
        metadata: {
          userId: 'user_123',
        },
      };
    }),

    update: vi.fn().mockImplementation(async (customerId, params) => {
      return {
        id: customerId,
        object: 'customer',
        ...params,
      };
    }),
  };

  // Mock subscriptions
  subscriptions = {
    create: vi.fn().mockImplementation(async (params) => {
      return {
        id: this.options.subscriptionId,
        object: 'subscription',
        customer: params.customer,
        items: {
          data: params.items || [],
        },
        status: 'active',
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
      };
    }),

    retrieve: vi.fn().mockImplementation(async (subscriptionId) => {
      return {
        id: subscriptionId,
        object: 'subscription',
        customer: this.options.customerId,
        status: 'active',
        items: {
          data: [
            {
              price: {
                id: 'price_mock_123',
                product: 'prod_mock_123',
                unit_amount: 2000,
                currency: 'jpy',
              },
            },
          ],
        },
      };
    }),

    update: vi.fn().mockImplementation(async (subscriptionId, params) => {
      return {
        id: subscriptionId,
        object: 'subscription',
        ...params,
      };
    }),

    cancel: vi.fn().mockImplementation(async (subscriptionId) => {
      return {
        id: subscriptionId,
        object: 'subscription',
        status: 'canceled',
        canceled_at: Math.floor(Date.now() / 1000),
      };
    }),
  };

  // Mock checkout sessions
  checkout = {
    sessions: {
      create: vi.fn().mockImplementation(async (params) => {
        return {
          id: 'cs_mock_' + Date.now(),
          object: 'checkout.session',
          url: 'https://checkout.stripe.com/mock/' + Date.now(),
          customer: params.customer,
          success_url: params.success_url,
          cancel_url: params.cancel_url,
          mode: params.mode || 'subscription',
          line_items: params.line_items,
          metadata: params.metadata || {},
        };
      }),

      retrieve: vi.fn().mockImplementation(async (sessionId) => {
        return {
          id: sessionId,
          object: 'checkout.session',
          customer: this.options.customerId,
          payment_status: 'paid',
          status: 'complete',
          subscription: this.options.subscriptionId,
        };
      }),
    },
  };

  // Mock products
  products = {
    create: vi.fn().mockImplementation(async (params) => {
      return {
        id: 'prod_mock_' + Date.now(),
        object: 'product',
        name: params.name,
        description: params.description,
        metadata: params.metadata || {},
      };
    }),

    list: vi.fn().mockImplementation(async () => {
      return {
        data: [
          {
            id: 'prod_freemium',
            name: 'Freemium',
            metadata: { tier: 'freemium' },
          },
          {
            id: 'prod_starter',
            name: 'Starter',
            metadata: { tier: 'starter' },
          },
          {
            id: 'prod_basic',
            name: 'Basic',
            metadata: { tier: 'basic' },
          },
          {
            id: 'prod_premium',
            name: 'Premium',
            metadata: { tier: 'premium' },
          },
        ],
      };
    }),
  };

  // Mock prices
  prices = {
    create: vi.fn().mockImplementation(async (params) => {
      return {
        id: 'price_mock_' + Date.now(),
        object: 'price',
        product: params.product,
        unit_amount: params.unit_amount,
        currency: params.currency,
        recurring: params.recurring,
      };
    }),

    list: vi.fn().mockImplementation(async () => {
      return {
        data: [
          {
            id: 'price_freemium',
            product: 'prod_freemium',
            unit_amount: 0,
            currency: 'jpy',
          },
          {
            id: 'price_starter',
            product: 'prod_starter',
            unit_amount: 1000,
            currency: 'jpy',
          },
          {
            id: 'price_basic',
            product: 'prod_basic',
            unit_amount: 2000,
            currency: 'jpy',
          },
          {
            id: 'price_premium',
            product: 'prod_premium',
            unit_amount: 5000,
            currency: 'jpy',
          },
        ],
      };
    }),
  };

  // Mock webhooks
  webhooks = {
    constructEvent: vi.fn().mockImplementation((payload, sig, secret) => {
      // Return a mock event based on the payload
      return {
        id: 'evt_mock_' + Date.now(),
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_mock_123',
            customer: this.options.customerId,
            subscription: this.options.subscriptionId,
          },
        },
      };
    }),
  };

  // Mock payment intents
  paymentIntents = {
    create: vi.fn().mockImplementation(async (params) => {
      return {
        id: 'pi_mock_' + Date.now(),
        object: 'payment_intent',
        amount: params.amount,
        currency: params.currency,
        status: 'requires_payment_method',
        client_secret: 'pi_mock_secret_' + Date.now(),
      };
    }),
  };
}

// Factory function for creating mock Stripe instances
export function createMockStripe(options?: MockStripeOptions) {
  return new MockStripe(options);
}

// Mock Stripe webhook events
export const mockWebhookEvents = {
  checkoutCompleted: {
    id: 'evt_mock_checkout',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_123',
        customer: 'cus_test_123',
        subscription: 'sub_test_123',
        payment_status: 'paid',
        metadata: {
          userId: 'user_123',
        },
      },
    },
  },
  subscriptionCreated: {
    id: 'evt_mock_sub_created',
    type: 'customer.subscription.created',
    data: {
      object: {
        id: 'sub_test_123',
        customer: 'cus_test_123',
        status: 'active',
        items: {
          data: [
            {
              price: {
                product: 'prod_test_123',
                unit_amount: 2000,
              },
            },
          ],
        },
      },
    },
  },
  subscriptionDeleted: {
    id: 'evt_mock_sub_deleted',
    type: 'customer.subscription.deleted',
    data: {
      object: {
        id: 'sub_test_123',
        customer: 'cus_test_123',
        status: 'canceled',
      },
    },
  },
  paymentSucceeded: {
    id: 'evt_mock_payment',
    type: 'payment_intent.succeeded',
    data: {
      object: {
        id: 'pi_test_123',
        amount: 2000,
        currency: 'jpy',
        customer: 'cus_test_123',
      },
    },
  },
};

// Helper to create mock Stripe error
export function createStripeError(code: string, message?: string) {
  const error: any = new Error(message || `Stripe error: ${code}`);
  error.type = 'StripeError';
  error.code = code;
  return error;
}