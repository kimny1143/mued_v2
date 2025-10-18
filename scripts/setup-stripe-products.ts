import Stripe from 'stripe';
import { config } from 'dotenv';

/**
 * Stripe Product & Price Setup Script
 *
 * Creates 4 subscription tiers on Stripe:
 * 1. Freemium (Free) - No Stripe product needed
 * 2. Starter ($9.99/month) - AI materials: 3/month, Reservations: 1/month
 * 3. Basic ($19.99/month) - AI materials: unlimited, Reservations: 5/month
 * 4. Premium ($49.99/month) - Everything unlimited
 */

config({ path: '.env.local' });

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is required');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Plan configurations (JPY pricing)
const plans = [
  {
    name: 'MUED Starter',
    id: 'starter',
    description: 'Perfect for getting started with AI-powered learning',
    price: 999, // ¥999/month
    features: [
      '3 AI-generated study materials per month',
      '1 mentor session per month',
      'Basic analytics',
      'Email support',
    ],
    metadata: {
      tier: 'starter',
      aiMaterialsLimit: '3',
      reservationsLimit: '1',
    },
  },
  {
    name: 'MUED Basic',
    id: 'basic',
    description: 'Unlimited AI materials for serious learners',
    price: 1999, // ¥1,999/month
    features: [
      'Unlimited AI-generated study materials',
      '5 mentor sessions per month',
      'Advanced analytics',
      'Priority email support',
      'Custom study plans',
    ],
    metadata: {
      tier: 'basic',
      aiMaterialsLimit: 'unlimited',
      reservationsLimit: '5',
    },
  },
  {
    name: 'MUED Premium',
    id: 'premium',
    description: 'Full access to all features for dedicated students',
    price: 4999, // ¥4,999/month
    features: [
      'Unlimited AI-generated study materials',
      'Unlimited mentor sessions',
      'Advanced analytics & insights',
      '24/7 priority support',
      'Custom study plans',
      '1-on-1 learning consultant',
      'Exclusive webinars & workshops',
    ],
    metadata: {
      tier: 'premium',
      aiMaterialsLimit: 'unlimited',
      reservationsLimit: 'unlimited',
    },
  },
];

async function setupStripeProducts() {
  console.log('🚀 Starting Stripe product setup...\n');

  for (const plan of plans) {
    try {
      console.log(`📦 Creating product: ${plan.name}...`);

      // Create product
      const product = await stripe.products.create({
        name: plan.name,
        description: plan.description,
        metadata: plan.metadata,
      });

      console.log(`✅ Product created: ${product.id}`);

      // Create price
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: plan.price,
        currency: 'jpy',
        recurring: {
          interval: 'month',
        },
        metadata: plan.metadata,
      });

      console.log(`✅ Price created: ${price.id}`);
      console.log(`   Amount: ¥${plan.price.toLocaleString()}/month`);
      console.log(`   Features: ${plan.features.join(', ')}`);
      console.log('');

      // Save to .env.local format (for reference)
      console.log(`# Add to .env.local:`);
      console.log(`STRIPE_PRICE_${plan.id.toUpperCase()}=${price.id}`);
      console.log('');
    } catch (error) {
      if (error instanceof Error) {
        console.error(`❌ Error creating ${plan.name}:`, error.message);
      }
    }
  }

  console.log('✨ Stripe product setup complete!\n');
  console.log('📋 Next steps:');
  console.log('1. Copy the STRIPE_PRICE_* variables to your .env.local');
  console.log('2. Update your subscription checkout flow to use these price IDs');
  console.log('3. Test the subscription flow in Stripe test mode');
}

// Run the setup
setupStripeProducts()
  .then(() => {
    console.log('\n✅ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  });
