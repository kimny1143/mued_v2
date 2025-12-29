/**
 * AbletonOSC 疎通テストスクリプト
 *
 * 使い方: npx tsx scripts/daw-hub/test-osc.ts
 *
 * 前提条件:
 * - Ableton Live が起動中
 * - AbletonOSC が Control Surface として有効
 */

import OSC from 'osc-js';
import dgram from 'dgram';

const ABLETON_OSC_PORT = 11000; // AbletonOSCが受信するポート
const RESPONSE_PORT = 11001;   // AbletonOSCが送信するポート

console.log('=== AbletonOSC 疎通テスト ===\n');

// UDP受信ソケット（AbletonOSCからのレスポンスを受け取る）
const receiver = dgram.createSocket('udp4');

receiver.on('message', (msg, rinfo) => {
  console.log(`[受信] ${rinfo.address}:${rinfo.port} から ${msg.length} bytes`);

  // OSCメッセージをパース
  try {
    const osc = new OSC();
    const decoded = osc.readPacket(msg);
    console.log(`  アドレス: ${decoded.address}`);
    console.log(`  引数: ${JSON.stringify(decoded.args)}`);
  } catch (e) {
    console.log(`  (パース失敗: ${e})`);
    console.log(`  Raw: ${msg.toString('hex')}`);
  }
});

receiver.on('error', (err) => {
  console.error(`受信エラー: ${err.message}`);
  if (err.message.includes('EADDRINUSE')) {
    console.log('\n※ ポート11001が他のアプリ（Protokol等）で使用中です');
    console.log('  Protokolを閉じるか、このスクリプトで確認後Protokolで監視してください');
  }
  receiver.close();
  process.exit(1);
});

receiver.bind(RESPONSE_PORT, () => {
  console.log(`レスポンス受信待機中 (port ${RESPONSE_PORT})...\n`);

  // OSC送信
  const sender = dgram.createSocket('udp4');

  // /live/song/get/tempo を送信
  const message = createOscMessage('/live/song/get/tempo');

  console.log(`[送信] /live/song/get/tempo → localhost:${ABLETON_OSC_PORT}`);

  sender.send(message, ABLETON_OSC_PORT, '127.0.0.1', (err) => {
    if (err) {
      console.error(`送信エラー: ${err.message}`);
    } else {
      console.log('  送信完了。レスポンス待機中...\n');
    }
    sender.close();
  });
});

// 簡易OSCメッセージ作成
function createOscMessage(address: string): Buffer {
  // OSCアドレスを4バイト境界にパディング
  const addressBuf = Buffer.from(address + '\0');
  const addressPadded = Buffer.alloc(Math.ceil(addressBuf.length / 4) * 4);
  addressBuf.copy(addressPadded);

  // タイプタグ（引数なし）
  const typeBuf = Buffer.from(',\0\0\0');

  return Buffer.concat([addressPadded, typeBuf]);
}

// 5秒後にタイムアウト
setTimeout(() => {
  console.log('\n--- 5秒経過、タイムアウト ---');
  console.log('レスポンスがない場合の確認事項:');
  console.log('1. Ableton Live は起動していますか？');
  console.log('2. Preferences > Link/MIDI で AbletonOSC が選択されていますか？');
  console.log('3. "AbletonOSC: Listening for OSC on port 11000" のメッセージが出ていますか？');
  receiver.close();
  process.exit(0);
}, 5000);
