'use client';

import { useEffect } from 'react';
import { captureFirstTouch } from '@/lib/dial/first-touch-client';

/**
 * Records first-touch acquisition attribution on the first /dial landing (first-wins).
 * Mounted once in the /dial layout. Renders nothing.
 */
export function FirstTouchTracker() {
  useEffect(() => {
    captureFirstTouch();
  }, []);
  return null;
}
