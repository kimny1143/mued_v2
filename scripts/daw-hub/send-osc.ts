/**
 * AbletonOSC 送信テストスクリプト（Protokol併用版）
 *
 * 使い方: npx tsx scripts/daw-hub/send-osc.ts
 *
 * Protokol を port 11001 で起動した状態で実行すると、
 * AbletonOSC からのレスポンスが Protokol に表示される
 */

import dgram from 'dgram';

const ABLETON_OSC_PORT = 11000;

console.log('=== AbletonOSC 送信テスト ===\n');
console.log('※ Protokol (port 11001) でレスポンスを確認してください\n');

const sender = dgram.createSocket('udp4');

// /live/song/get/tempo を送信
const message = createOscMessage('/live/song/get/tempo');

console.log(`[送信] /live/song/get/tempo → localhost:${ABLETON_OSC_PORT}`);

sender.send(message, ABLETON_OSC_PORT, '127.0.0.1', (err) => {
  if (err) {
    console.error(`送信エラー: ${err.message}`);
  } else {
    console.log('送信完了！');
    console.log('\nProtokolにレスポンスが表示されるはずです。');
    console.log('表示されない場合:');
    console.log('  - Ableton Live が起動しているか確認');
    console.log('  - AbletonOSC が有効か確認');
  }
  sender.close();
});

// 簡易OSCメッセージ作成
function createOscMessage(address: string): Buffer {
  const addressBuf = Buffer.from(address + '\0');
  const addressPadded = Buffer.alloc(Math.ceil(addressBuf.length / 4) * 4);
  addressBuf.copy(addressPadded);
  const typeBuf = Buffer.from(',\0\0\0');
  return Buffer.concat([addressPadded, typeBuf]);
}
