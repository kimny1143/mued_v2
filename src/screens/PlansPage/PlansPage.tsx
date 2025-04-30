import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { CheckIcon } from "lucide-react";
import { DashboardLayout } from "../../components/DashboardLayout";
import { products } from "../../stripe-config";
import { createCheckoutSession } from "../../lib/stripe";

export function PlansPage() {
  const handlePurchase = async (priceId: string, mode: 'payment' | 'subscription') => {
    try {
      const checkoutUrl = await createCheckoutSession(priceId, mode);
      window.location.href = checkoutUrl;
    } catch (error) {
      console.error('Error creating checkout session:', error);
    }
  };

  // Filter subscription plans and sort them in the desired order
  const subscriptionPlans = products
    .filter(product => product.mode === 'subscription')
    .sort((a, b) => {
      const order = {
        'Basic Subscription': 1,
        'Starter Subscription': 2,
        'Premium Subscription': 3
      };
      return order[a.name as keyof typeof order] - order[b.name as keyof typeof order];
    });

  const features = {
    'Basic Subscription': [
      'Limited course access',
      'Email support',
      'Learning resources',
      'Basic tools',
      'Progress tracking'
    ],
    'Starter Subscription': [
      'Access to basic courses',
      'Standard support',
      'Community access',
      'Basic learning tools',
      'Monthly progress report'
    ],
    'Premium Subscription': [
      'Unlimited access to all courses',
      'Priority support',
      'Live group sessions',
      'Advanced learning tools',
      'Progress tracking'
    ]
  };

  return (
    <DashboardLayout title="Choose Your Plan">
      <div className="text-center mb-12">
        <p className="text-gray-600 text-lg">
          Select the perfect subscription to enhance your musical journey
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {subscriptionPlans.map((product) => {
          const isStarterPlan = product.name === 'Starter Subscription';
          return (
            <Card 
              key={product.id} 
              className={`flex flex-col p-6 relative transform transition-all duration-300 hover:scale-105 hover:shadow-xl ${
                isStarterPlan 
                  ? 'border-2 border-blue-500 shadow-lg' 
                  : 'hover:border-gray-300'
              }`}
            >
              {isStarterPlan && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                  Recommended
                </div>
              )}
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-2">{product.name}</h3>
                <p className="text-gray-600 mb-4">{product.description}</p>
                <div className="text-3xl font-bold">
                  {product.priceId === 'price_1RJUpJDLJ4SvE3u2Lwg8MvTS' && '$29/mo'}
                  {product.priceId === 'price_1RJUolDLJ4SvE3u2lcg7C895' && '$19/mo'}
                  {product.priceId === 'price_1RJUntDLJ4SvE3u2a1TdJcn7' && '$9/mo'}
                </div>
              </div>

              <div className="flex-grow">
                <ul className="space-y-3 mb-8">
                  {features[product.name as keyof typeof features].map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <CheckIcon className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Button
                className={`w-full ${isStarterPlan ? 'bg-blue-500 hover:bg-blue-600' : ''}`}
                onClick={() => handlePurchase(product.priceId, product.mode)}
              >
                Get Started
              </Button>
            </Card>
          );
        })}
      </div>
    </DashboardLayout>
  );
}