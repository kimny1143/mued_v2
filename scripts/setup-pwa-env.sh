#!/bin/bash

# PWA用のVercel環境変数設定スクリプト

echo "Setting up environment variables for mued-pwa project..."

cd apps/mobile

# Production環境の変数を設定
echo "Setting EXPO_PUBLIC_SUPABASE_URL..."
echo "https://zyesgfkhaqpbcbkhsutw.supabase.co" | npx vercel env add EXPO_PUBLIC_SUPABASE_URL production

echo "Setting EXPO_PUBLIC_SUPABASE_ANON_KEY..."
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5ZXNnZmtoYXFwYmNia2hzdXR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAzODI4MzMsImV4cCI6MjA1NTk1ODgzM30.klUvkzqCKp1vq3iVzSOsIDzwNCPBgkv9xoPPIi08_GU" | npx vercel env add EXPO_PUBLIC_SUPABASE_ANON_KEY production

echo "Setting EXPO_PUBLIC_API_URL..."
echo "https://mued-lms-fgm-glasswerks.vercel.app" | npx vercel env add EXPO_PUBLIC_API_URL production

echo "Setting EXPO_PUBLIC_VAPID_PUBLIC_KEY..."
echo "BHr6V0i27izMOqDA0V9EOMeH02nL8s45SY4uRS26iOKIFXZoCUkMn58KWfKSXNYOHzuLKc5rEN0xLzbOhHJi1Go" | npx vercel env add EXPO_PUBLIC_VAPID_PUBLIC_KEY production

# Preview環境にも同じ変数を設定
echo "Setting environment variables for preview..."
npx vercel env add EXPO_PUBLIC_SUPABASE_URL preview < <(echo "https://zyesgfkhaqpbcbkhsutw.supabase.co")
npx vercel env add EXPO_PUBLIC_SUPABASE_ANON_KEY preview < <(echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5ZXNnZmtoYXFwYmNia2hzdXR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAzODI4MzMsImV4cCI6MjA1NTk1ODgzM30.klUvkzqCKp1vq3iVzSOsIDzwNCPBgkv9xoPPIi08_GU")
npx vercel env add EXPO_PUBLIC_API_URL preview < <(echo "https://mued-lms-fgm-glasswerks.vercel.app")
npx vercel env add EXPO_PUBLIC_VAPID_PUBLIC_KEY preview < <(echo "BHr6V0i27izMOqDA0V9EOMeH02nL8s45SY4uRS26iOKIFXZoCUkMn58KWfKSXNYOHzuLKc5rEN0xLzbOhHJi1Go")

# Development環境にも同じ変数を設定
echo "Setting environment variables for development..."
npx vercel env add EXPO_PUBLIC_SUPABASE_URL development < <(echo "https://zyesgfkhaqpbcbkhsutw.supabase.co")
npx vercel env add EXPO_PUBLIC_SUPABASE_ANON_KEY development < <(echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5ZXNnZmtoYXFwYmNia2hzdXR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAzODI4MzMsImV4cCI6MjA1NTk1ODgzM30.klUvkzqCKp1vq3iVzSOsIDzwNCPBgkv9xoPPIi08_GU")
npx vercel env add EXPO_PUBLIC_API_URL development < <(echo "https://mued-lms-fgm-glasswerks.vercel.app")
npx vercel env add EXPO_PUBLIC_VAPID_PUBLIC_KEY development < <(echo "BHr6V0i27izMOqDA0V9EOMeH02nL8s45SY4uRS26iOKIFXZoCUkMn58KWfKSXNYOHzuLKc5rEN0xLzbOhHJi1Go")

echo "Environment variables setup complete!"
echo "Verifying..."
npx vercel env ls

cd ../..