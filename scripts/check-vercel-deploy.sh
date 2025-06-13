#!/bin/bash

echo "=== Vercel Deployment Checker ==="
echo ""

# Check if turbo-ignore is working correctly
echo "1. Testing turbo-ignore for mobile app..."
cd apps/mobile
npx turbo-ignore @mued/mobile
MOBILE_EXIT_CODE=$?
if [ $MOBILE_EXIT_CODE -eq 0 ]; then
  echo "❌ Mobile: Would SKIP deployment (no changes detected)"
else
  echo "✅ Mobile: Would TRIGGER deployment (changes detected)"
fi
cd ../..

echo ""
echo "2. Testing turbo-ignore for web app..."
npx turbo-ignore @mued/web
WEB_EXIT_CODE=$?
if [ $WEB_EXIT_CODE -eq 0 ]; then
  echo "❌ Web: Would SKIP deployment (no changes detected)"
else
  echo "✅ Web: Would TRIGGER deployment (changes detected)"
fi

echo ""
echo "3. Checking Vercel project IDs..."
echo "Mobile project ID (from .vercel/project.json):"
if [ -f "apps/mobile/.vercel/project.json" ]; then
  cat apps/mobile/.vercel/project.json | grep projectId
else
  echo "⚠️  Mobile .vercel/project.json not found"
fi

echo ""
echo "Web project ID (from root .vercel/project.json):"
if [ -f ".vercel/project.json" ]; then
  cat .vercel/project.json | grep projectId
else
  echo "⚠️  Root .vercel/project.json not found"
fi

echo ""
echo "4. Checking recent git changes..."
echo "Files changed in last commit:"
git diff --name-only HEAD~1 HEAD | grep -E "(apps/mobile|apps/web)" | head -10

echo ""
echo "=== GitHub Secrets Required ==="
echo "Add these secrets to your GitHub repository:"
echo "- VERCEL_TOKEN (from https://vercel.com/account/tokens)"
echo "- VERCEL_ORG_ID: team_WMsn5mJNVlgsnLmUmeBZYuhY"
echo "- VERCEL_PROJECT_ID_MOBILE: prj_GdZKwN0HnGSWjeNQFXP1MrSEJyc0"
echo "- VERCEL_PROJECT_ID_WEB: prj_TiaMxHUDPsm4DCmoRKICZxJl1zFT"