'use client';

import { useUser } from '@/lib/hooks/use-user';

import { Navigation } from './Navigation';


export function NavigationWrapper() {
  const { isAuthenticated } = useUser();
  
  return <Navigation isAuthenticated={isAuthenticated} />;
} 