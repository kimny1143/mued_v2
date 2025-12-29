/**
 * AbletonOSC リスナースクリプト
 *
 * パラメータ変更をリアルタイムで受信してコンソールに出力
 *
 * 使い方:
 *   npx tsx scripts/daw-hub/listener.ts
 *
 * 前提:
 *   - Ableton Live 起動中
 *   - AbletonOSC が有効
 *   - Protokol は閉じておく（port 11001 の競合を避ける）
 */

import dgram from 'dgram';

const ABLETON_SEND_PORT = 11000;   // AbletonOSCへ送信
const ABLETON_RECEIVE_PORT = 11001; // AbletonOSCから受信

// OSCメッセージ作成ヘルパー
function createOscMessage(address: string, args: (string | number)[] = []): Buffer {
  const buffers: Buffer[] = [];

  // アドレス（null終端 + 4バイト境界パディング）
  const addressBuf = Buffer.from(address + '\0');
  const addressPadded = Buffer.alloc(Math.ceil(addressBuf.length / 4) * 4);
  addressBuf.copy(addressPadded);
  buffers.push(addressPadded);

  // タイプタグ
  let typeTag = ',';
  for (const arg of args) {
    if (typeof arg === 'number') {
      typeTag += Number.isInteger(arg) ? 'i' : 'f';
    } else {
      typeTag += 's';
    }
  }
  const typeBuf = Buffer.from(typeTag + '\0');
  const typePadded = Buffer.alloc(Math.ceil(typeBuf.length / 4) * 4);
  typeBuf.copy(typePadded);
  buffers.push(typePadded);

  // 引数
  for (const arg of args) {
    if (typeof arg === 'number') {
      const buf = Buffer.alloc(4);
      if (Number.isInteger(arg)) {
        buf.writeInt32BE(arg, 0);
      } else {
        buf.writeFloatBE(arg, 0);
      }
      buffers.push(buf);
    } else {
      const strBuf = Buffer.from(arg + '\0');
      const strPadded = Buffer.alloc(Math.ceil(strBuf.length / 4) * 4);
      strBuf.copy(strPadded);
      buffers.push(strPadded);
    }
  }

  return Buffer.concat(buffers);
}

// OSCメッセージ解析
function parseOscMessage(buffer: Buffer): { address: string; args: (number | string)[] } {
  let offset = 0;

  // アドレス読み取り
  const addressEnd = buffer.indexOf(0, offset);
  const address = buffer.toString('utf8', offset, addressEnd);
  offset = Math.ceil((addressEnd + 1) / 4) * 4;

  // タイプタグ読み取り
  const typeTagEnd = buffer.indexOf(0, offset);
  const typeTag = buffer.toString('utf8', offset + 1, typeTagEnd); // skip ','
  offset = Math.ceil((typeTagEnd + 1) / 4) * 4;

  // 引数読み取り
  const args: (number | string)[] = [];
  for (const type of typeTag) {
    if (type === 'i') {
      args.push(buffer.readInt32BE(offset));
      offset += 4;
    } else if (type === 'f') {
      args.push(buffer.readFloatBE(offset));
      offset += 4;
    } else if (type === 's') {
      const strEnd = buffer.indexOf(0, offset);
      args.push(buffer.toString('utf8', offset, strEnd));
      offset = Math.ceil((strEnd + 1) / 4) * 4;
    }
  }

  return { address, args };
}

// メイン
async function main() {
  console.log('=== AbletonOSC リスナー ===\n');

  const receiver = dgram.createSocket('udp4');
  const sender = dgram.createSocket('udp4');

  // 受信ハンドラ
  receiver.on('message', (msg) => {
    try {
      const { address, args } = parseOscMessage(msg);
      const timestamp = new Date().toLocaleTimeString('ja-JP');

      // パラメータ変更を色付きで表示
      if (address.includes('parameter')) {
        console.log(`\x1b[36m[${timestamp}]\x1b[0m ${address}`);
        console.log(`  → ${args.join(', ')}`);
      } else {
        console.log(`[${timestamp}] ${address} → ${args.join(', ')}`);
      }
    } catch (e) {
      console.log(`[parse error] ${e}`);
    }
  });

  receiver.on('error', (err) => {
    console.error(`エラー: ${err.message}`);
    if (err.message.includes('EADDRINUSE')) {
      console.log('\n※ port 11001 が使用中です。Protokol を閉じてください。');
    }
    process.exit(1);
  });

  // 受信開始
  receiver.bind(ABLETON_RECEIVE_PORT, () => {
    console.log(`受信待機中 (port ${ABLETON_RECEIVE_PORT})...\n`);

    // まずトラック一覧を取得
    console.log('トラック情報を取得中...\n');
    send('/live/song/get/num_tracks');

    // 少し待ってからリスナー登録
    setTimeout(() => {
      console.log('リスナー登録中...');
      console.log('※ Abletonでパラメータを動かすとイベントが表示されます\n');
      console.log('Ctrl+C で終了\n');
      console.log('-------------------------------------------\n');

      // 全トラックのデバイスパラメータ変更をリッスン
      // まず特定のトラック(0)の全デバイスをリッスン
      send('/live/track/get/num_devices', [0]);
    }, 500);
  });

  function send(address: string, args: (string | number)[] = []) {
    const msg = createOscMessage(address, args);
    sender.send(msg, ABLETON_SEND_PORT, '127.0.0.1');
  }

  // トラック/デバイス情報受信時にリスナーを登録
  let numTracks = 0;
  let trackDevices: Map<number, number> = new Map();

  receiver.on('message', (msg) => {
    try {
      const { address, args } = parseOscMessage(msg);

      if (address === '/live/song/get/num_tracks') {
        numTracks = args[0] as number;
        console.log(`トラック数: ${numTracks}`);

        // 各トラックのデバイス数を取得 + Volume/Panリスナー登録
        for (let i = 0; i < Math.min(numTracks, 10); i++) { // 最大10トラック
          send('/live/track/get/num_devices', [i]);
          // トラックのVolume/Panは常に存在するのでリッスン
          send('/live/track/start_listen/volume', [i]);
          send('/live/track/start_listen/panning', [i]);
        }
        console.log('トラックのVolume/Panリスナー登録完了');
      }

      if (address === '/live/track/get/num_devices') {
        const trackId = args[0] as number;
        const numDevices = args[1] as number;
        trackDevices.set(trackId, numDevices);

        if (numDevices > 0) {
          console.log(`Track ${trackId}: ${numDevices} デバイス`);

          // 各デバイスのパラメータリスナーを登録
          for (let d = 0; d < numDevices; d++) {
            // パラメータ数を取得
            send('/live/device/get/num_parameters', [trackId, d]);
          }
        }
      }

      if (address === '/live/device/get/num_parameters') {
        const trackId = args[0] as number;
        const deviceId = args[1] as number;
        const numParams = args[2] as number;

        // 各パラメータにリスナーを登録（最大20パラメータ）
        for (let p = 0; p < Math.min(numParams, 20); p++) {
          send('/live/device/start_listen/parameter/value', [trackId, deviceId, p]);
        }
      }
    } catch (e) {
      // パースエラーは無視
    }
  });

  // 終了処理
  process.on('SIGINT', () => {
    console.log('\n\nリスナー停止中...');
    // リスナー解除は省略（Abletonが管理）
    receiver.close();
    sender.close();
    process.exit(0);
  });
}

main().catch(console.error);
