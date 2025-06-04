'use client';

import { Navigation } from './Navigation';
import { useUser } from '@/lib/hooks/use-user';

export function NavigationWrapper() {
  const { isAuthenticated } = useUser();
  
  return <Navigation isAuthenticated={isAuthenticated} />;
} 