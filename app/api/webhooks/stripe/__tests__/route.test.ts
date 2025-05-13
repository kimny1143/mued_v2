import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { POST } from '../route';
import { supabaseAdmin } from '@/lib/supabase-admin';

// モック
vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
    insert: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    single: vi.fn(),
  }
}));

vi.mock('next/headers', () => {
  const headersModule = {
    headers: vi.fn().mockReturnValue(new Map([['stripe-signature', 'test_signature']]))
  };
  return headersModule;
});

vi.mock('stripe', () => {
  const mockStripe = {
    webhooks: {
      constructEvent: vi.fn()
    },
    subscriptions: {
      retrieve: vi.fn()
    },
    customers: {
      retrieve: vi.fn()
    }
  };
  return {
    default: vi.fn(() => mockStripe)
  };
});

describe('Stripe Webhook処理', () => {
  let mockReq: NextRequest;
  let mockStripeInstance: Stripe;
  const headersModule = vi.mocked(require('next/headers'));
  const mockSupabaseAdmin = vi.mocked(supabaseAdmin);
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // 環境変数の設定
    process.env.STRIPE_SECRET_KEY = 'test_sk_key';
    process.env.STRIPE_WEBHOOK_SECRET = 'test_webhook_secret';
    
    // リクエストのモック
    mockReq = new NextRequest('https://example.com/api/webhooks/stripe', {
      method: 'POST',
      body: JSON.stringify({ type: 'test' })
    });
    
    // Stripeインスタンスのモックを取得
    mockStripeInstance = new (Stripe as any)();
  });
  
  afterEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });

  it('署名がない場合は400エラーを返す', async () => {
    headersModule.headers.mockReturnValueOnce(new Map());
    
    const response = await POST(mockReq);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual(expect.objectContaining({ 
      error: expect.stringContaining('署名が必要') 
    }));
  });

  it('Webhookシークレットがない場合は500エラーを返す', async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    
    const response = await POST(mockReq);
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual(expect.objectContaining({ 
      error: expect.stringContaining('設定エラー') 
    }));
  });

  it('署名検証に失敗した場合は400エラーを返す', async () => {
    const stripeInstance = mockStripeInstance as unknown as { 
      webhooks: { constructEvent: ReturnType<typeof vi.fn> } 
    };
    stripeInstance.webhooks.constructEvent.mockImplementationOnce(() => {
      throw new Error('署名検証エラー');
    });
    
    const response = await POST(mockReq);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual(expect.objectContaining({ 
      error: expect.stringContaining('Webhook検証エラー') 
    }));
  });

  it('checkout.session.completedイベントを正常に処理する', async () => {
    const mockSession = {
      id: 'cs_test_123',
      mode: 'subscription',
      customer: 'cus_test_123',
      subscription: 'sub_test_123',
      metadata: { userId: 'user_test_123' }
    };
    
    const stripeInstance = mockStripeInstance as unknown as {
      webhooks: { constructEvent: ReturnType<typeof vi.fn> };
      subscriptions: { retrieve: ReturnType<typeof vi.fn> };
    };
    
    stripeInstance.webhooks.constructEvent.mockReturnValueOnce({
      type: 'checkout.session.completed',
      data: { object: mockSession }
    });
    
    stripeInstance.subscriptions.retrieve.mockResolvedValueOnce({
      id: 'sub_test_123',
      status: 'active',
      current_period_start: 1609459200,
      current_period_end: 1612137600,
      cancel_at_period_end: false,
      items: {
        data: [{
          price: {
            id: 'price_test_123',
            unit_amount: 1000,
            recurring: { interval: 'month' }
          }
        }]
      }
    } as any);
    
    // supabaseのモック
    mockSupabaseAdmin.maybeSingle.mockResolvedValueOnce({ data: null, error: null } as any);
    mockSupabaseAdmin.single.mockResolvedValueOnce({ data: { id: 1 }, error: null } as any);
    
    const response = await POST(mockReq);
    
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(expect.objectContaining({
      received: true,
      success: true,
      event: 'checkout.session.completed'
    }));
    
    // データベース更新が呼ばれたことを検証
    expect(mockSupabaseAdmin.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user_test_123',
        subscriptionId: 'sub_test_123'
      }),
      expect.any(Object)
    );
  });

  it('customer.subscription.updated イベントを正常に処理する', async () => {
    const mockSubscription = {
      id: 'sub_test_123',
      customer: 'cus_test_123',
      status: 'active',
      current_period_start: 1609459200,
      current_period_end: 1612137600,
      items: {
        data: [{
          price: {
            id: 'price_test_123'
          }
        }]
      }
    };
    
    const stripeInstance = mockStripeInstance as unknown as {
      webhooks: { constructEvent: ReturnType<typeof vi.fn> };
    };
    
    stripeInstance.webhooks.constructEvent.mockReturnValueOnce({
      type: 'customer.subscription.updated',
      data: { object: mockSubscription }
    });
    
    // supabaseのモック
    mockSupabaseAdmin.maybeSingle.mockResolvedValueOnce({ 
      data: { user_id: 'user_test_123' }, 
      error: null 
    } as any);
    mockSupabaseAdmin.upsert.mockResolvedValueOnce({ 
      data: { id: 1 }, 
      error: null 
    } as any);
    
    const response = await POST(mockReq);
    
    expect(response.status).toBe(200);
    expect(mockSupabaseAdmin.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user_test_123',
        subscriptionId: 'sub_test_123'
      }),
      expect.any(Object)
    );
  });

  it('customer.subscription.deleted イベントを正常に処理する', async () => {
    const mockSubscription = {
      id: 'sub_test_123',
      customer: 'cus_test_123'
    };
    
    const stripeInstance = mockStripeInstance as unknown as {
      webhooks: { constructEvent: ReturnType<typeof vi.fn> };
    };
    
    stripeInstance.webhooks.constructEvent.mockReturnValueOnce({
      type: 'customer.subscription.deleted',
      data: { object: mockSubscription }
    });
    
    // supabaseのモック
    mockSupabaseAdmin.maybeSingle.mockResolvedValueOnce({ 
      data: { user_id: 'user_test_123' }, 
      error: null 
    } as any);
    mockSupabaseAdmin.upsert.mockResolvedValueOnce({ 
      data: { id: 1 }, 
      error: null 
    } as any);
    
    const response = await POST(mockReq);
    
    expect(response.status).toBe(200);
    expect(mockSupabaseAdmin.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user_test_123',
        subscriptionId: 'sub_test_123',
        status: 'canceled'
      }),
      expect.any(Object)
    );
  });

  it('処理中に例外が発生した場合は500エラーを返す', async () => {
    const stripeInstance = mockStripeInstance as unknown as {
      webhooks: { constructEvent: ReturnType<typeof vi.fn> };
      subscriptions: { retrieve: ReturnType<typeof vi.fn> };
    };
    
    stripeInstance.webhooks.constructEvent.mockReturnValueOnce({
      type: 'checkout.session.completed',
      data: { object: {} }
    });
    
    // 例外を発生させる
    stripeInstance.subscriptions.retrieve.mockImplementationOnce(() => {
      throw new Error('テストエラー');
    });
    
    const response = await POST(mockReq);
    expect(response.status).toBe(500);
  });
}); 