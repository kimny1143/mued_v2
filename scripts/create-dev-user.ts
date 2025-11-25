#!/usr/bin/env npx tsx
/**
 * 開発用ユーザーをデータベースに作成するスクリプト
 * kimny1143@gmail.com を開発用ユーザーとして登録
 */

import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set in environment variables');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

async function createDevUser() {
  console.log('🚀 Creating development user...\n');

  try {
    // Check if user already exists
    const existingUser = await sql`
      SELECT id, email, role, created_at
      FROM users
      WHERE email = 'kimny1143@gmail.com'
    `;

    if (existingUser.length > 0) {
      console.log('✅ Development user already exists:');
      console.log(`   ID: ${existingUser[0].id}`);
      console.log(`   Email: ${existingUser[0].email}`);
      console.log(`   Role: ${existingUser[0].role}`);
      console.log(`   Created: ${existingUser[0].created_at}`);
      return existingUser[0];
    }

    // Create new user
    console.log('📝 Creating new development user...');

    const newUser = await sql`
      INSERT INTO users (
        clerk_id,
        email,
        name,
        role,
        subscription_plan,
        subscription_status
      ) VALUES (
        'dev_clerk_kimny',
        'kimny1143@gmail.com',
        'Development User',
        'admin',
        'studio',
        'active'
      ) RETURNING *
    `;

    if (newUser.length > 0) {
      console.log('\n✅ Development user created successfully!');
      console.log(`   ID: ${newUser[0].id}`);
      console.log(`   Email: ${newUser[0].email}`);
      console.log(`   Name: ${newUser[0].name}`);
      console.log(`   Role: ${newUser[0].role}`);
      console.log(`   Plan: ${newUser[0].subscription_plan}`);

      // Create initial user preferences for MUEDnote
      console.log('\n📝 Creating MUEDnote preferences...');

      await sql`
        INSERT INTO muednote_v3.user_preferences (
          user_id,
          auto_process_fragments,
          auto_tag_fragments,
          auto_summarize,
          theme,
          default_view,
          fragments_per_page
        ) VALUES (
          ${newUser[0].id},
          true,
          true,
          true,
          'dark',
          'timeline',
          20
        )
        ON CONFLICT (user_id) DO NOTHING
      `;

      console.log('✅ User preferences created');

      // Create a default project
      console.log('\n📝 Creating default project...');

      const project = await sql`
        INSERT INTO muednote_v3.projects (
          user_id,
          name,
          description,
          color,
          icon
        ) VALUES (
          ${newUser[0].id},
          'デフォルトプロジェクト',
          '未分類のFragmentを保存',
          '#6366F1',
          '📝'
        ) RETURNING *
      `;

      if (project.length > 0) {
        console.log('✅ Default project created');
        console.log(`   ID: ${project[0].id}`);
        console.log(`   Name: ${project[0].name}`);
      }

      // Create some initial tags
      console.log('\n📝 Creating initial tags...');

      const tags = [
        { name: 'TODO', color: '#EF4444', description: 'やることリスト' },
        { name: 'アイデア', color: '#10B981', description: '新しいアイデア' },
        { name: '重要', color: '#F59E0B', description: '重要な項目' },
        { name: 'メモ', color: '#6366F1', description: '一般的なメモ' },
        { name: 'バグ', color: '#DC2626', description: 'バグや問題' },
      ];

      for (const tag of tags) {
        await sql`
          INSERT INTO muednote_v3.tags (
            user_id,
            name,
            color,
            description,
            is_system
          ) VALUES (
            ${newUser[0].id},
            ${tag.name},
            ${tag.color},
            ${tag.description},
            false
          )
          ON CONFLICT (user_id, name) DO NOTHING
        `;
      }

      console.log('✅ Initial tags created');

      console.log('\n🎉 Development environment setup complete!');
      console.log('\n📌 You can now:');
      console.log('   1. Login with kimny1143@gmail.com in the Tauri app');
      console.log('   2. Create and save Fragments');
      console.log('   3. Use the API with dev_token_kimny');

      return newUser[0];
    }

  } catch (error) {
    console.error('❌ Error creating development user:', error);
    process.exit(1);
  }
}

// Run the script
createDevUser().then(() => {
  console.log('\n✨ Done!');
  process.exit(0);
});