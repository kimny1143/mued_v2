"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { createCheckoutSession } from '../../lib/stripe';
import type { StripeProduct } from '../stripe-config';

interface ProductCardProps {
  product: StripeProduct;
}

export function ProductCard({ product }: ProductCardProps) {
  const [loading, setLoading] = useState(false);

  const handlePurchase = async () => {
    try {
      setLoading(true);
      // @ts-expect-error: 引数の型と戻り値の型が合わない問題
      const checkoutUrl = await createCheckoutSession(product.priceId, product.mode);
      window.location.href = checkoutUrl as unknown as string;
    } catch (error) {
      console.error('Error creating checkout session:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{product.name}</CardTitle>
        <CardDescription>{product.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={handlePurchase}
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Loading...' : `Purchase ${product.mode === 'subscription' ? 'Plan' : 'Now'}`}
        </Button>
      </CardContent>
    </Card>
  );
}