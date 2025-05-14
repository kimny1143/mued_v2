import { PrismaClient } from '@prisma/client';

// サーバーレス環境に適した設定
const prismaClientSingleton = () => {
  return new PrismaClient({
    // 接続タイムアウトを増やす
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    },
    // エラーログを詳細に
    log: ['query', 'error', 'warn']
  });
};

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
} 