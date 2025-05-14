import { PrismaClient } from '@prisma/client';

// 環境変数 (PrismaのログレベルはPrismaClient.logで設定)
const isDev = process.env.NODE_ENV !== 'production';

/**
 * PrismaClientのシングルトンインスタンスを作成する関数
 * サーバーレス環境での接続問題に対応するための設定を含む
 */
const prismaClientSingleton = () => {
  // Prismaクライアントの作成 (開発環境ではログを有効化)
  const client = new PrismaClient({
    log: isDev ? ['query', 'error', 'warn'] : ['error'],
  });

  // 接続エラー対策: アプリケーションの起動時に接続を確立
  if (isDev) {
    console.log('Prisma クライアント初期化 - 開発環境');
  }

  return client;
};

// Prismaクライアントをグローバルに格納するための型定義
type GlobalWithPrisma = typeof globalThis & {
  prisma: PrismaClient | undefined;
};

// グローバルオブジェクトの取得
const globalForPrisma = globalThis as GlobalWithPrisma;

// 既存のクライアントを使用するか、新規作成
export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

// 開発環境ではホットリロード間でインスタンスを保持
if (isDev) {
  globalForPrisma.prisma = prisma;
}

// このファイルが開発環境でホットリロードされた際に
// データベース接続をクリーンアップする
// Vercelのようなサーバーレス環境では必要ない
// if (process.env.NODE_ENV !== 'production') {
//   process.on('beforeExit', async () => {
//     await prisma.$disconnect();
//   });
// } 