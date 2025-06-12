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
  
  // 開発環境では常にprepared statementを無効化
  const params = new URLSearchParams();
  
  if (url.includes('?')) {
    const [baseUrl, existingParams] = url.split('?');
    params.append('pgbouncer', 'true');
    params.append('statement_cache_size', '0');
    params.append('prepare_threshold', '0');
    
    // 既存のパラメータを維持
    const existing = new URLSearchParams(existingParams);
    existing.forEach((value, key) => {
      if (key !== 'pgbouncer' && key !== 'statement_cache_size' && key !== 'prepare_threshold') {
        params.set(key, value);
      }
    });
    
    return `${baseUrl}?${params.toString()}`;
  }
  
  // パラメータがない場合
  params.append('pgbouncer', 'true');
  params.append('statement_cache_size', '0');
  params.append('prepare_threshold', '0');
  
  return `${url}?${params.toString()}`;
};

const prismaClientSingleton = () => {
  const client = new PrismaClient({
    log: isDevelopment ? ['query', 'error', 'warn'] : ['error'],
    errorFormat: 'minimal',
    datasources: {
      db: {
        url: getDevelopmentUrl(process.env.DATABASE_URL),
      },
    },
  });

  // 開発環境では接続プールの設定を調整
  if (isDevelopment) {
    // $connectを明示的に呼び出して接続を確立
    client.$connect().catch((error) => {
      console.error('Failed to connect to database:', error);
    });
  }

  return client;
};

// グローバル変数を使用してシングルトンパターンを実装
const prisma = global.prisma || prismaClientSingleton();

if (isDevelopment) {
  global.prisma = prisma;
  
  // 開発環境でのクリーンアップ処理
  const cleanup = async () => {
    try {
      await prisma.$disconnect();
    } catch (error) {
      console.error('Error disconnecting Prisma:', error);
    }
  };
  
  // プロセス終了時のクリーンアップ
  process.on('beforeExit', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);
  
  // ホットリロード時の接続リセット（Next.js開発環境）
  if ((module as any).hot) {
    (module as any).hot.dispose(() => {
      cleanup();
    });
  }
}

export { prisma };