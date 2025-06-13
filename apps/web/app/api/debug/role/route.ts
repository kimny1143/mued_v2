import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server/auth';
import { prisma } from '@/lib/prisma';
import { createServiceClient } from '@/lib/supabase/service';

// 動的レンダリングを強制（cookiesを使用するため）
export const dynamic = 'force-dynamic';

// デバッグ用：ロール情報を確認するエンドポイント
export async function GET(request: NextRequest) {
  try {
    // 1. getServerSession()の結果
    const session = await getServerSession();
    
    // 2. 直接Prismaで確認
    let prismaUser = null;
    if (session?.user?.id) {
      prismaUser = await prisma.users.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          email: true,
          role_id: true,
          roles: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });
    }
    
    // 3. 直接Supabaseで確認
    let supabaseUser = null;
    if (session?.user?.id) {
      const supabase = createServiceClient();
      const { data } = await supabase
        .from('users')
        .select(`
          id,
          email,
          role_id,
          roles (
            id,
            name
          )
        `)
        .eq('id', session.user.id)
        .single();
      supabaseUser = data;
    }
    
    // 4. 環境変数の確認
    const envInfo = {
      USE_OPTIMIZED_SESSION: process.env.NEXT_PUBLIC_USE_OPTIMIZED_SESSION,
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV
    };
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      session: {
        exists: !!session,
        user: session?.user,
        role: session?.role
      },
      prisma: {
        user: prismaUser,
        roleName: prismaUser?.roles?.name,
        roleNameLowerCase: prismaUser?.roles?.name?.toLowerCase()
      },
      supabase: {
        user: supabaseUser,
        roleName: supabaseUser?.roles?.name,
        roleNameLowerCase: supabaseUser?.roles?.name?.toLowerCase()
      },
      environment: envInfo,
      debug: {
        sessionFunction: getServerSession.toString().substring(0, 200) + '...',
        hasToLowerCase: getServerSession.toString().includes('toLowerCase()')
      }
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('[Debug Role API Error]', error);
    return NextResponse.json({
      error: 'デバッグ情報の取得中にエラーが発生しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}