// Prismaクライアントの開発環境での接続問題を解決するためのユーティリティ

import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

// DATABASE_URLに既にpoolerが含まれているかチェック
const isPgBouncer = process.env.DATABASE_URL?.includes('pooler.supabase.com');
const isDevelopment = process.env.NODE_ENV === 'development';

// 開発環境用の追加設定
const getDevelopmentUrl = (url: string | undefined) => {
  if (!url || !isDevelopment) return url;
  
  // 既にpgbouncerを使用している場合は、さらに制限を追加
  if (isPgBouncer) {
    // statement_cache_sizeを0に設定してprepared statementを無効化
    return url.includes('?') 
      ? `${url}&statement_cache_size=0` 
      : `${url}?statement_cache_size=0`;
  }
  
  // pgbouncerを使用していない場合は、pgbouncerモードを追加
  return url.includes('?') 
    ? `${url}&pgbouncer=true&connection_limit=1&statement_cache_size=0` 
    : `${url}?pgbouncer=true&connection_limit=1&statement_cache_size=0`;
};

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: isDevelopment ? ['error', 'warn'] : ['error'],
    errorFormat: 'minimal',
    datasources: {
      db: {
        url: getDevelopmentUrl(process.env.DATABASE_URL),
      },
    },
  });
};

// グローバル変数を使用してシングルトンパターンを実装
const prisma = global.prisma || prismaClientSingleton();

if (isDevelopment) {
  global.prisma = prisma;
  
  // 開発環境でのクリーンアップ処理
  const cleanup = async () => {
    await prisma.$disconnect();
  };
  
  // プロセス終了時のクリーンアップ
  process.on('beforeExit', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);
}

export { prisma }; 