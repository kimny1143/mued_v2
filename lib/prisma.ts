import { PrismaClient } from '@prisma/client';

// 環境変数 (PrismaのログレベルはPrismaClient.logで設定)
const isDev = process.env.NODE_ENV !== 'production';

/**
 * PrismaClientのシングルトンインスタンスを作成する関数
 * サーバーレス環境での接続問題に対応するための設定を含む
 */
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

export { prisma };

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// このファイルが開発環境でホットリロードされた際に
// データベース接続をクリーンアップする
// Vercelのようなサーバーレス環境では必要ない
// if (process.env.NODE_ENV !== 'production') {
//   process.on('beforeExit', async () => {
//     await prisma.$disconnect();
//   });
// } 