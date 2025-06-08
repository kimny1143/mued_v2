#!/usr/bin/env node

// 環境に応じてvercel.jsonを生成するスクリプト
const fs = require('fs');
const path = require('path');

const config = {
  buildCommand: "npm run build",
  outputDirectory: "build",
  framework: null,
  installCommand: "npm install",
  devCommand: "npm start",
  ignoreCommand: "cd ../.. && git diff HEAD^ HEAD --quiet apps/mobile",
  rewrites: [
    {
      source: "/api/:path*",
      // 環境変数API_PROXY_TARGETが設定されていればそれを使用、なければ開発環境をデフォルト
      destination: process.env.API_PROXY_TARGET || "https://mued-lms-fgm-git-develop-glasswerks.vercel.app/api/:path*"
    }
  ],
  headers: [
    {
      source: "/(.*)",
      headers: [
        {
          key: "X-Frame-Options",
          value: "SAMEORIGIN"
        },
        {
          key: "X-Content-Type-Options",
          value: "nosniff"
        }
      ]
    }
  ],
  env: {
    "REACT_APP_SUPABASE_URL": "@supabase-url",
    "REACT_APP_SUPABASE_ANON_KEY": "@supabase-anon-key"
  }
};

// vercel.jsonを生成
fs.writeFileSync(
  path.join(__dirname, '..', 'vercel.json'),
  JSON.stringify(config, null, 2)
);

console.log('Generated vercel.json with API proxy target:', config.rewrites[0].destination);