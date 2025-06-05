const webpush = require('web-push');

// Generate VAPID keys
const vapidKeys = webpush.generateVAPIDKeys();

console.log('VAPID鍵を生成しました:\n');
console.log('公開鍵 (EXPO_PUBLIC_VAPID_PUBLIC_KEY):');
console.log(vapidKeys.publicKey);
console.log('\n秘密鍵 (サーバー側で使用):');
console.log(vapidKeys.privateKey);
console.log('\n');
console.log('使い方:');
console.log('1. 公開鍵を apps/mobile/.env の EXPO_PUBLIC_VAPID_PUBLIC_KEY に設定');
console.log('2. 秘密鍵は安全に保管し、サーバー側の環境変数に設定');