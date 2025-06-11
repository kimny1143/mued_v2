// Feature flags for progressive rollout
export const FEATURES = {
  // Enable database views for filtering active data
  USE_DB_VIEWS: process.env.NEXT_PUBLIC_USE_DB_VIEWS === 'true',
  
  // Enable v2 APIs that use database views
  USE_V2_APIS: process.env.NEXT_PUBLIC_USE_V2_APIS === 'true',
  
  // Enable improved JWT token parsing
  USE_IMPROVED_JWT: process.env.NEXT_PUBLIC_USE_IMPROVED_JWT === 'true',
} as const;

// Helper to check if running in production
export const isProduction = process.env.NODE_ENV === 'production';

// Helper to check if running in development
export const isDevelopment = process.env.NODE_ENV === 'development';

// Default feature settings based on environment
export const getFeatureDefaults = () => {
  if (isDevelopment) {
    return {
      USE_DB_VIEWS: true,
      USE_V2_APIS: true,
      USE_IMPROVED_JWT: true,
    };
  }
  
  // Production defaults - conservative approach
  return {
    USE_DB_VIEWS: false,
    USE_V2_APIS: false,
    USE_IMPROVED_JWT: false,
  };
};

// Get feature flag value with fallback
export const getFeature = (feature: keyof typeof FEATURES): boolean => {
  const envValue = FEATURES[feature];
  if (envValue !== undefined) {
    return envValue;
  }
  
  const defaults = getFeatureDefaults();
  return defaults[feature];
};