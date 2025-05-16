// 環境変数生成スクリプト
// 使用法: npx tsx scripts/gen-env.ts [環境名]
// 例: npx tsx scripts/gen-env.ts production

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// 色の定義
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

// 引数チェック
const env = process.argv[2];
if (!env) {
  console.error(`${RED}エラー: 環境名を指定してください。${RESET}`);
  console.log('使用法: npx tsx scripts/gen-env.ts [development|staging|production]');
  process.exit(1);
}

// 有効な環境名かチェック
const validEnvs = ['development', 'staging', 'production'];
if (!validEnvs.includes(env)) {
  console.error(`${RED}エラー: 無効な環境名です。development, staging, productionのいずれかを指定してください。${RESET}`);
  process.exit(1);
}

console.log(`${YELLOW}環境 '${env}' の環境変数ファイルを生成します...${RESET}`);

// ファイルパスの設定
const ENV_TEMPLATE = `.env.${env}.template`;
const VERCEL_ENV_FILE = env === 'development' ? '.env.local' : `.env.${env}.local`;
const HEROKU_ENV_FILE = `ai-service/.env.${env === 'development' ? '' : env + '.'}heroku`;
const VERCEL_ENV = env === 'production' ? 'production' : env === 'staging' ? 'preview' : 'development';

// テンプレートファイルの存在チェック
if (!fs.existsSync(ENV_TEMPLATE)) {
  console.error(`${RED}エラー: テンプレートファイル '${ENV_TEMPLATE}' が見つかりません。${RESET}`);
  process.exit(1);
}

console.log(`${YELLOW}テンプレートファイル '${ENV_TEMPLATE}' から環境変数を読み込んでいます...${RESET}`);

// テンプレートファイルを読み込む
const template = fs.readFileSync(ENV_TEMPLATE, 'utf8');

// 環境変数を解析する
const envVars: Record<string, string> = {};
const lines = template.split('\n');

for (const line of lines) {
  const trimmedLine = line.trim();
  if (trimmedLine && !trimmedLine.startsWith('#')) {
    const equalIndex = trimmedLine.indexOf('=');
    if (equalIndex > 0) {
      const key = trimmedLine.substring(0, equalIndex).trim();
      const value = trimmedLine.substring(equalIndex + 1).trim();
      envVars[key] = value;
    }
  }
}

// Vercel環境変数ファイルの生成
function generateVercelEnvFile() {
  console.log(`${YELLOW}Vercel用環境変数ファイル '${VERCEL_ENV_FILE}' を生成しています...${RESET}`);
  
  let vercelContent = '';
  
  // Vercel用の環境変数をフィルタリング
  for (const [key, value] of Object.entries(envVars)) {
    if (!key.startsWith('HEROKU_')) {
      vercelContent += `${key}=${value}\n`;
    }
  }
  
  fs.writeFileSync(VERCEL_ENV_FILE, vercelContent);
  console.log(`${GREEN}Vercel用環境変数ファイルを生成しました: ${VERCEL_ENV_FILE}${RESET}`);
}

// Heroku環境変数ファイルの生成
function generateHerokuEnvFile() {
  console.log(`${YELLOW}Heroku用環境変数ファイル '${HEROKU_ENV_FILE}' を生成しています...${RESET}`);
  
  // AIサービスディレクトリが存在するか確認
  if (!fs.existsSync('ai-service')) {
    fs.mkdirSync('ai-service', { recursive: true });
  }
  
  let herokuContent = '';
  
  // Heroku用の環境変数をフィルタリング
  for (const [key, value] of Object.entries(envVars)) {
    if (key.startsWith('HEROKU_') || key.startsWith('AI_') || 
        ['DATABASE_URL', 'OPENAI_API_KEY', 'NEXT_PUBLIC_AI_SERVICE_URL'].includes(key)) {
      // HEROKUプレフィックスを削除（Herokuではプレフィックス不要）
      const herokuKey = key.startsWith('HEROKU_') ? key.substring(7) : key;
      herokuContent += `${herokuKey}=${value}\n`;
    }
  }
  
  fs.writeFileSync(HEROKU_ENV_FILE, herokuContent);
  console.log(`${GREEN}Heroku用環境変数ファイルを生成しました: ${HEROKU_ENV_FILE}${RESET}`);
}

// 環境変数チェックスクリプトを実行
function runEnvCheck() {
  console.log(`${YELLOW}環境変数のフォーマットをチェックしています...${RESET}`);
  try {
    execSync('node scripts/check-env.js', { stdio: 'inherit' });
    console.log(`${GREEN}環境変数チェックが完了しました。${RESET}`);
  } catch (error) {
    console.error(`${RED}環境変数チェックでエラーが発生しました。${RESET}`);
    console.error(error);
  }
}

// メイン実行
try {
  generateVercelEnvFile();
  generateHerokuEnvFile();
  runEnvCheck();
  console.log(`${GREEN}環境変数ファイル生成が完了しました。${RESET}`);
} catch (error) {
  console.error(`${RED}エラーが発生しました:${RESET}`, error);
  process.exit(1);
} 