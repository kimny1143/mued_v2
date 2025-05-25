const https = require('https');

async function testWebhookDirect() {
  console.log('🧪 Webhookエンドポイントの直接テスト...\n');

  // Protection Bypassトークン
  const PROTECTION_BYPASS_SECRET = 'a6923b2e8badf9f16a2c029ba6422a61';
  
  // テスト用のWebhookペイロード（簡単なping）
  const testPayload = JSON.stringify({
    id: 'evt_test_webhook',
    object: 'event',
    api_version: '2020-08-27',
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: 'test_ping'
      }
    },
    livemode: false,
    pending_webhooks: 1,
    request: {
      id: 'req_test',
      idempotency_key: null
    },
    type: 'ping'
  });

  const options = {
    hostname: 'dev.mued.jp',
    port: 443,
    path: `/api/webhooks/stripe?x-vercel-protection-bypass=${PROTECTION_BYPASS_SECRET}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(testPayload),
      'stripe-signature': 'test_signature', // 実際のテストでは無効だが、エンドポイントの到達性をテスト
      'User-Agent': 'Stripe/1.0 (+https://stripe.com/docs/webhooks)'
    }
  };

  console.log('📡 リクエスト送信中...');
  console.log(`URL: https://${options.hostname}${options.path}`);
  console.log(`Method: ${options.method}`);
  console.log(`Headers:`, options.headers);

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      console.log(`\n📊 レスポンス:`);
      console.log(`ステータス: ${res.statusCode}`);
      console.log(`ヘッダー:`, res.headers);

      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log(`\n📄 レスポンスボディ:`);
        try {
          const jsonData = JSON.parse(data);
          console.log(JSON.stringify(jsonData, null, 2));
        } catch (e) {
          console.log(data);
        }

        if (res.statusCode === 200) {
          console.log('\n✅ Webhookエンドポイントは到達可能です');
        } else if (res.statusCode === 400) {
          console.log('\n⚠️  署名検証エラー（予想通り）- エンドポイントは動作しています');
        } else {
          console.log(`\n❌ 予期しないステータス: ${res.statusCode}`);
        }

        resolve(data);
      });
    });

    req.on('error', (error) => {
      console.error('\n❌ リクエストエラー:', error.message);
      reject(error);
    });

    req.write(testPayload);
    req.end();
  });
}

testWebhookDirect().catch(console.error); 