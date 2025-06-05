const fs = require('fs');
const path = require('path');

// ダッシュボード配下のすべてのpage.tsxファイルを検索
const dashboardDir = path.join(__dirname, '../app/dashboard');

function addDynamicExport(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // すでにdynamic exportがある場合はスキップ
  if (content.includes("export const dynamic")) {
    console.log(`✓ Already has dynamic export: ${filePath}`);
    return;
  }
  
  // クライアントコンポーネントの場合は、'use client'の後に追加
  if (content.includes("'use client'")) {
    const lines = content.split('\n');
    const clientIndex = lines.findIndex(line => line.includes("'use client'"));
    
    if (clientIndex !== -1) {
      lines.splice(clientIndex + 1, 0, '', '// このページは動的である必要があります（認証チェックのため）', "export const dynamic = 'force-dynamic';");
      
      const newContent = lines.join('\n');
      fs.writeFileSync(filePath, newContent);
      console.log(`✅ Added dynamic export to client component: ${filePath}`);
    }
    return;
  }
  
  // import文の後に dynamic export を追加
  const lines = content.split('\n');
  let lastImportIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('import ')) {
      lastImportIndex = i;
    }
  }
  
  if (lastImportIndex !== -1) {
    lines.splice(lastImportIndex + 1, 0, '', '// このページは動的である必要があります（認証チェックのため）', "export const dynamic = 'force-dynamic';");
    
    const newContent = lines.join('\n');
    fs.writeFileSync(filePath, newContent);
    console.log(`✅ Added dynamic export to: ${filePath}`);
  }
}

function processDirectory(dir) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // ディレクトリの場合は再帰的に処理
      processDirectory(fullPath);
    } else if (item === 'page.tsx' || item === 'page.ts') {
      // page.tsxまたはpage.tsファイルを処理
      addDynamicExport(fullPath);
    }
  }
}

// 実行
console.log('Adding dynamic exports to dashboard pages...');
processDirectory(dashboardDir);
console.log('Done!');