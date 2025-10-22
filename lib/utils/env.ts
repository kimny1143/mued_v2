// 環境変数の検証ユーティリティ

export function getRequiredEnv(key: string): string {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export function validateStripeConfig() {
  return {
    secretKey: getRequiredEnv("STRIPE_SECRET_KEY"),
    webhookSecret: getRequiredEnv("STRIPE_WEBHOOK_SECRET"),
  };
}

export function validateClerkConfig() {
  return {
    webhookSecret: getRequiredEnv("CLERK_WEBHOOK_SECRET"),
  };
}

export function validateDatabaseConfig() {
  return {
    url: getRequiredEnv("DATABASE_URL"),
  };
}
