const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

// API ルートの検索パターン
const API_ROUTE_PATTERN = /route\.(ts|js)$/;
// 動的フラグの宣言
const DYNAMIC_FLAG = "export const dynamic = 'force-dynamic';";

/**
 * ディレクトリ内のすべてのファイルを再帰的に検索
 */
async function findFiles(dir, pattern) {
  const dirents = await readdir(dir, { withFileTypes: true });
  
  const files = await Promise.all(
    dirents.map(async (dirent) => {
      const res = path.resolve(dir, dirent.name);
      return dirent.isDirectory()
        ? findFiles(res, pattern)
        : pattern.test(dirent.name)
          ? [res]
          : [];
    })
  );
  
  return files.flat();
}

/**
 * ファイルに動的フラグが含まれているか確認
 */
async function hasDynamicFlag(filePath) {
  try {
    const content = await readFile(filePath, 'utf-8');
    return content.includes(DYNAMIC_FLAG);
  } catch (error) {
    console.error(`${filePath} の読み込み中にエラーが発生しました:`, error);
    return false;
  }
}

/**
 * ファイルに動的フラグを追加
 */
async function addDynamicFlag(filePath) {
  try {
    const content = await readFile(filePath, 'utf-8');
    
    // すでにフラグがある場合はスキップ
    if (content.includes(DYNAMIC_FLAG)) {
      return;
    }
    
    // インポート文の後に動的フラグを挿入
    let updatedContent;
    
    // インポート文の後に挿入
    const lastImportIndex = content.lastIndexOf('import');
    
    if (lastImportIndex !== -1) {
      // 最後のインポート文の行末を見つける
      const lineEndIndex = content.indexOf('\n', lastImportIndex);
      if (lineEndIndex !== -1) {
        // 次の行が空白でない場合、空行を追加
        const nextLine = content.substring(lineEndIndex + 1, lineEndIndex + 2);
        const insertion = nextLine.trim() ? `\n\n${DYNAMIC_FLAG}\n` : `\n${DYNAMIC_FLAG}\n`;
        
        updatedContent = 
          content.substring(0, lineEndIndex + 1) +
          insertion +
          content.substring(lineEndIndex + 1);
      } else {
        // インポート文の行末が見つからない場合
        updatedContent = `${content}\n\n${DYNAMIC_FLAG}\n`;
      }
    } else {
      // インポート文がない場合、ファイルの先頭に追加
      updatedContent = `${DYNAMIC_FLAG}\n\n${content}`;
    }
    
    await writeFile(filePath, updatedContent, 'utf-8');
    console.log(`✅ ${path.relative(process.cwd(), filePath)} に動的フラグを追加しました`);
  } catch (error) {
    console.error(`${filePath} の更新中にエラーが発生しました:`, error);
  }
}

/**
 * メイン関数
 */
async function main() {
  console.log('APIルートに動的フラグを追加するスクリプトを実行中...');
  
  try {
    // APIディレクトリを検索
    const apiDir = path.join(process.cwd(), 'app', 'api');
    
    // APIディレクトリが存在するか確認
    try {
      await stat(apiDir);
    } catch (error) {
      console.error('APIディレクトリが見つかりません:', apiDir);
      process.exit(1);
    }
    
    // APIルートファイルをすべて検索
    const apiRouteFiles = await findFiles(apiDir, API_ROUTE_PATTERN);
    console.log(`🔍 ${apiRouteFiles.length} 件のAPIルートファイルを検出しました`);
    
    // フラグがまだ追加されていないファイルを特定
    const filesToUpdate = [];
    for (const file of apiRouteFiles) {
      if (!(await hasDynamicFlag(file))) {
        filesToUpdate.push(file);
      }
    }
    
    console.log(`🔄 ${filesToUpdate.length} 件のファイルを更新します`);
    
    // 動的フラグを追加
    for (const file of filesToUpdate) {
      await addDynamicFlag(file);
    }
    
    console.log('✨ 処理が完了しました');
  } catch (error) {
    console.error('エラーが発生しました:', error);
    process.exit(1);
  }
}

// スクリプト実行
main(); 