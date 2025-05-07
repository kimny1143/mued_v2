import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  stripe,
  getPrices,
  getPriceById,
  getSubscriptionPlans,
  getProducts,
  getProductsWithPrices,
  clearCache
} from './stripe';

// モック
vi.mock('stripe', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      prices: {
        list: vi.fn(),
        retrieve: vi.fn(),
      },
      products: {
        list: vi.fn(),
      }
    })),
  };
});

describe('Stripe Price API', () => {
  const mockPrice = {
    id: 'price_1234567890',
    active: true,
    currency: 'jpy',
    product: 'prod_1234567890',
    unit_amount: 1000,
    type: 'recurring',
    recurring: {
      interval: 'month',
      interval_count: 1,
    }
  };
  
  const mockMonthlyPrice = {
    ...mockPrice,
    id: 'price_monthly',
    recurring: {
      interval: 'month',
      interval_count: 1,
    }
  };
  
  const mockYearlyPrice = {
    ...mockPrice,
    id: 'price_yearly',
    recurring: {
      interval: 'year',
      interval_count: 1,
    }
  };
  
  const mockProduct = {
    id: 'prod_1234567890',
    name: 'プレミアムプラン',
    active: true,
    description: 'すべての機能にアクセス可能',
    images: [],
    metadata: {}
  };

  beforeEach(() => {
    // テスト前に毎回キャッシュをクリア
    clearCache();
    
    // モックの戻り値をリセット
    vi.resetAllMocks();
    
    // モックレスポンスを設定
    stripe.prices.list.mockResolvedValue({
      data: [mockPrice, mockMonthlyPrice, mockYearlyPrice],
      has_more: false,
      object: 'list',
      url: '/v1/prices'
    });
    
    stripe.prices.retrieve.mockResolvedValue(mockPrice);
    
    stripe.products.list.mockResolvedValue({
      data: [mockProduct],
      has_more: false,
      object: 'list',
      url: '/v1/products'
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getPrices', () => {
    it('料金一覧を取得できること', async () => {
      const prices = await getPrices();
      
      expect(stripe.prices.list).toHaveBeenCalledWith({
        active: true,
        expand: ['data.product'],
      });
      expect(prices).toHaveLength(3);
      expect(prices[0].id).toBe(mockPrice.id);
    });
    
    it('オプションを渡せること', async () => {
      const options = { limit: 10, type: 'recurring' };
      await getPrices(options);
      
      expect(stripe.prices.list).toHaveBeenCalledWith({
        active: true,
        expand: ['data.product'],
        limit: 10,
        type: 'recurring',
      });
    });
    
    it('キャッシュが機能すること', async () => {
      // 1回目のコール
      await getPrices();
      // 2回目のコール（キャッシュが使われるはず）
      await getPrices();
      
      // Stripe APIが1回だけ呼ばれていることを確認
      expect(stripe.prices.list).toHaveBeenCalledTimes(1);
    });
  });

  describe('getPriceById', () => {
    it('特定の料金プランを取得できること', async () => {
      const price = await getPriceById('price_1234567890');
      
      expect(stripe.prices.retrieve).toHaveBeenCalledWith('price_1234567890', {
        expand: ['product'],
      });
      expect(price.id).toBe(mockPrice.id);
    });
    
    it('キャッシュが機能すること', async () => {
      // 1回目のコール
      await getPriceById('price_1234567890');
      // 2回目のコール（キャッシュが使われるはず）
      await getPriceById('price_1234567890');
      
      // Stripe APIが1回だけ呼ばれていることを確認
      expect(stripe.prices.retrieve).toHaveBeenCalledTimes(1);
    });
  });

  describe('getSubscriptionPlans', () => {
    it('月額プランと年額プランを取得できること', async () => {
      const plans = await getSubscriptionPlans();
      
      expect(stripe.prices.list).toHaveBeenCalledWith({
        active: true,
        expand: ['data.product'],
        type: 'recurring',
      });
      expect(plans.monthly).toHaveLength(2); // mockPriceとmockMonthlyPrice
      expect(plans.yearly).toHaveLength(1);
      expect(plans.monthly[0].recurring?.interval).toBe('month');
      expect(plans.yearly[0].recurring?.interval).toBe('year');
    });
  });

  describe('getProducts', () => {
    it('製品カタログを取得できること', async () => {
      const products = await getProducts();
      
      expect(stripe.products.list).toHaveBeenCalledWith({
        active: true,
      });
      expect(products).toHaveLength(1);
      expect(products[0].id).toBe(mockProduct.id);
    });
    
    it('オプションを渡せること', async () => {
      const options = { limit: 20 };
      await getProducts(options);
      
      expect(stripe.products.list).toHaveBeenCalledWith({
        active: true,
        limit: 20,
      });
    });
  });

  describe('getProductsWithPrices', () => {
    it('製品と価格を結合して取得できること', async () => {
      stripe.prices.list.mockResolvedValueOnce({
        data: [{
          ...mockPrice,
          product: mockProduct.id
        }],
        has_more: false,
        object: 'list',
        url: '/v1/prices'
      });
      
      const productsWithPrices = await getProductsWithPrices();
      
      expect(stripe.products.list).toHaveBeenCalled();
      expect(stripe.prices.list).toHaveBeenCalled();
      expect(productsWithPrices).toHaveLength(1);
      expect(productsWithPrices[0].id).toBe(mockProduct.id);
      expect(productsWithPrices[0].prices).toHaveLength(1);
      expect(productsWithPrices[0].prices[0].id).toBe(mockPrice.id);
    });
  });

  describe('clearCache', () => {
    it('特定のキャッシュをクリアできること', async () => {
      // まず両方のキャッシュを事前に準備
      await getPrices();
      await getPriceById('price_1234567890');
      
      // prices全体のキャッシュをクリア
      clearCache('prices:{}');
      
      // getPricesを再度呼ぶとキャッシュがないので再度APIが呼ばれるはず
      await getPrices();
      expect(stripe.prices.list).toHaveBeenCalledTimes(2);
      
      // getPriceByIdは既にキャッシュがあるので、APIは呼ばれないはず
      await getPriceById('price_1234567890');
      expect(stripe.prices.retrieve).toHaveBeenCalledTimes(1);
    });
    
    it('全キャッシュをクリアできること', async () => {
      // まず両方のキャッシュを事前に準備
      await getPrices();
      await getPriceById('price_1234567890');
      
      // すべてのキャッシュをクリア
      clearCache();
      
      // 両方とも再度APIが呼ばれるはず
      await getPrices();
      await getPriceById('price_1234567890');
      
      expect(stripe.prices.list).toHaveBeenCalledTimes(2);
      expect(stripe.prices.retrieve).toHaveBeenCalledTimes(2);
    });
  });
}); 