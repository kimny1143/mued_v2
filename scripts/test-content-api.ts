/**
 * Test Content API
 * コンテンツAPIをテスト
 */

import { NoteContentFetcher } from '../lib/plugins/note/note-content-fetcher';

async function testContentAPI() {
  console.log('🔍 Testing note.com content fetcher...\n');

  const noteFetcher = new NoteContentFetcher();

  try {
    const result = await noteFetcher.fetch({
      source: 'note',
      limit: 10,
      offset: 0,
      sortBy: 'date',
      sortOrder: 'desc',
    });

    console.log('✅ Fetch successful!\n');
    console.log('Response structure:');
    console.log(`  - success: ${result.success}`);
    console.log(`  - content count: ${result.content.length}`);
    console.log(`  - total: ${result.total}`);
    console.log(`  - sources: ${JSON.stringify(result.sources)}`);

    if (result.content.length > 0) {
      console.log('\n📄 First 3 items:');
      result.content.slice(0, 3).forEach((item, i) => {
        console.log(`\n${i + 1}. ${item.title}`);
        console.log(`   URL: ${item.url}`);
        console.log(`   Source: ${item.source}`);
        console.log(`   Tags: ${item.tags?.join(', ') || 'none'}`);
      });
    } else {
      console.log('\n⚠️  No content found');
    }

    if (result.error) {
      console.log('\n❌ Error:', result.error);
    }
  } catch (error) {
    console.error('❌ Failed to fetch content:', error);
  }
}

testContentAPI().catch(console.error);
