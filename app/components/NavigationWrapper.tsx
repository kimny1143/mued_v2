'use client';

import { useSession } from 'next-auth/react';
import { Navigation } from './Navigation';

export function NavigationWrapper() {
  const { data: session } = useSession();
  const isAuthenticated = !!session;

  return <Navigation isAuthenticated={isAuthenticated} />;
} 