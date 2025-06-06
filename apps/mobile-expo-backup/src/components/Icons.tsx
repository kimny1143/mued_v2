import React from 'react';
import { Platform } from 'react-native';

// Conditional imports based on platform
let IconComponents: any = {};

if (Platform.OS === 'web') {
  // For web, we'll use simple SVG icons or emoji fallbacks
  IconComponents = {
    Home: ({ size = 24, color = '#000' }: any) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    Calendar: ({ size = 24, color = '#000' }: any) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    User: ({ size = 24, color = '#000' }: any) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
    Settings: ({ size = 24, color = '#000' }: any) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v6m0 6v6m4.22-10.22l4.24-4.24m-4.24 14.14l4.24 4.24M20 12h-6m-6 0H2m4.22-4.22L2 3.54m4.22 14.14L2 21.46" />
      </svg>
    ),
  };
} else {
  // For native, use lucide-react-native
  const LucideIcons = require('lucide-react-native');
  IconComponents = {
    Home: LucideIcons.Home,
    Calendar: LucideIcons.Calendar,
    User: LucideIcons.User,
    Settings: LucideIcons.Settings,
  };
}

export const { Home, Calendar, User, Settings } = IconComponents;