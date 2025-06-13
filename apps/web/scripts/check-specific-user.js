const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSpecificUser() {
  console.log('🔍 glasswerkskimny@gmail.comユーザーの詳細確認...\n');
  
  try {
    // 1. ユーザー情報取得
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(`
        *,
        roles (
          id,
          name,
          description
        )
      `)
      .eq('email', 'glasswerkskimny@gmail.com')
      .single();
    
    if (userError) {
      console.error('ユーザー取得エラー:', userError);
      return;
    }
    
    console.log('ユーザー情報:');
    console.log('  ID:', userData.id);
    console.log('  Email:', userData.email);
    console.log('  Name:', userData.name);
    console.log('  role_id:', userData.role_id);
    console.log('  現在のロール:', userData.roles);
    console.log('');
    
    // 2. 利用可能なロール一覧
    console.log('利用可能なロール:');
    const { data: rolesData, error: rolesError } = await supabase
      .from('roles')
      .select('*');
    
    if (!rolesError) {
      rolesData.forEach(role => {
        console.log(`  - ${role.id}: ${role.name} (${role.description})`);
      });
    }
    
    // 3. ロールをmentorに更新
    console.log('\n🔧 ロールをmentorに更新中...');
    const { data: updateData, error: updateError } = await supabase
      .from('users')
      .update({ role_id: 'mentor' })
      .eq('email', 'glasswerkskimny@gmail.com')
      .select();
    
    if (updateError) {
      console.error('更新エラー:', updateError);
    } else {
      console.log('✅ 更新成功!');
      
      // 更新後の確認
      const { data: updatedUser, error: fetchError } = await supabase
        .from('users')
        .select(`
          *,
          roles (
            id,
            name,
            description
          )
        `)
        .eq('email', 'glasswerkskimny@gmail.com')
        .single();
      
      if (!fetchError) {
        console.log('\n更新後のユーザー情報:');
        console.log('  role_id:', updatedUser.role_id);
        console.log('  ロール:', updatedUser.roles);
      }
    }
    
  } catch (error) {
    console.error('エラー:', error);
  }
}

checkSpecificUser();