import { PrismaClient } from '@prisma/client';

// PrismaClientのグローバルインスタンスを宣言
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// 開発環境でのホットリロード時に複数のインスタンスが作成されるのを防ぐ
export const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
} 