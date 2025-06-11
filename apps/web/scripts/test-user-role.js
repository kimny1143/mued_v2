#!/usr/bin/env node
/**
 * ユーザーのロールを直接確認するテストスクリプト
 */

const { createClient } = require('@supabase/supabase-js');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env.local' });

const prisma = new PrismaClient();
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testUserRole() {
  const email = 'glasswerkskimny@gmail.com';
  
  console.log('🔍 ユーザーロール確認テスト\n');
  
  try {
    // 1. Prismaでユーザー情報を取得
    console.log('1️⃣ Prismaでユーザー情報を取得:');
    const prismaUser = await prisma.users.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role_id: true,
        roles: {
          select: {
            id: true,
            name: true,
            description: true
          }
        }
      }
    });
    
    if (prismaUser) {
      console.log('✅ Prismaで取得成功:');
      console.log(`  - ID: ${prismaUser.id}`);
      console.log(`  - Email: ${prismaUser.email}`);
      console.log(`  - Name: ${prismaUser.name}`);
      console.log(`  - Role ID: ${prismaUser.role_id}`);
      console.log(`  - Role Name: ${prismaUser.roles?.name || 'NULL'}`);
      console.log(`  - Role Description: ${prismaUser.roles?.description || 'NULL'}`);
    } else {
      console.log('❌ Prismaでユーザーが見つかりません');
    }
    
    // 2. Supabaseで直接確認
    console.log('\n2️⃣ Supabaseで直接確認:');
    const { data: supabaseUser, error } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        email,
        name,
        role_id,
        roles (
          id,
          name,
          description
        )
      `)
      .eq('email', email)
      .single();
    
    if (supabaseUser && !error) {
      console.log('✅ Supabaseで取得成功:');
      console.log(`  - ID: ${supabaseUser.id}`);
      console.log(`  - Email: ${supabaseUser.email}`);
      console.log(`  - Name: ${supabaseUser.name}`);
      console.log(`  - Role ID: ${supabaseUser.role_id}`);
      console.log(`  - Role Name: ${supabaseUser.roles?.name || 'NULL'}`);
      console.log(`  - Role Description: ${supabaseUser.roles?.description || 'NULL'}`);
    } else {
      console.log('❌ Supabaseエラー:', error);
    }
    
    // 3. Auth情報の確認
    console.log('\n3️⃣ Auth.users情報の確認:');
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
    const authUser = authUsers?.users?.find(u => u.email === email);
    
    if (authUser) {
      console.log('✅ Auth userが見つかりました:');
      console.log(`  - Auth ID: ${authUser.id}`);
      console.log(`  - Email: ${authUser.email}`);
      console.log(`  - Created: ${authUser.created_at}`);
      console.log(`  - Last Sign In: ${authUser.last_sign_in_at}`);
      console.log(`  - Metadata:`, authUser.user_metadata);
    }
    
    // 4. 全ロールの確認
    console.log('\n4️⃣ 全ロールの確認:');
    const roles = await prisma.roles.findMany();
    console.table(roles.map(r => ({
      ID: r.id,
      Name: r.name,
      Description: r.description
    })));
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testUserRole();