import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';

export function CancelPage() {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 space-y-4">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">Payment Cancelled</h1>
          <p className="text-gray-600">
            Your payment was cancelled. You will be redirected to the home page in {countdown} seconds.
          </p>
        </div>
        <div className="flex justify-center">
          <Button onClick={() => navigate('/')}>
            Return to Home Now
          </Button>
        </div>
      </Card>
    </div>
  );
}