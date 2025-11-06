import Stripe from 'stripe';
import { config } from 'dotenv';

/**
 * Check if Stripe Price IDs in .env.local are valid
 */

config({ path: '.env.local' });

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is required');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const priceIds = {
  starter: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER,
  basic: process.env.NEXT_PUBLIC_STRIPE_PRICE_BASIC,
  premium: process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM,
};

async function checkStripePrices() {
  console.log('🔍 Checking Stripe Price IDs...\n');

  for (const [tier, priceId] of Object.entries(priceIds)) {
    if (!priceId) {
      console.log(`❌ ${tier.toUpperCase()}: Not configured in .env.local`);
      continue;
    }

    try {
      const price = await stripe.prices.retrieve(priceId);
      const product = await stripe.products.retrieve(price.product as string);

      console.log(`✅ ${tier.toUpperCase()}: Valid`);
      console.log(`   Price ID: ${priceId}`);
      console.log(`   Product: ${product.name}`);
      console.log(`   Amount: ¥${price.unit_amount?.toLocaleString()}/month`);
      console.log(`   Status: ${price.active ? 'Active' : 'Inactive'}`);
      console.log('');
    } catch (error) {
      if (error instanceof Stripe.errors.StripeError) {
        console.log(`❌ ${tier.toUpperCase()}: Invalid (${error.message})`);
        console.log(`   Price ID: ${priceId}`);
        console.log('');
      }
    }
  }

  console.log('✨ Check complete!\n');
  console.log('💡 If any prices are invalid, run: npx tsx scripts/setup-stripe-products.ts');
}

checkStripePrices()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Check failed:', error);
    process.exit(1);
  });
