/**
 * DAW Hub - AbletonOSC リスナー（デバウンス付き）
 *
 * パラメータ変更を500msデバウンスして出力
 * 将来的にはAPIにPOSTする
 *
 * 使い方:
 *   npx tsx scripts/daw-hub/index.ts
 */

import dgram from 'dgram';

// 設定
const CONFIG = {
  abletonSendPort: 11000,
  abletonReceivePort: 11001,
  debounceMs: 500,
  maxTracksToMonitor: 10,
  maxParamsPerDevice: 30,
  // API設定
  apiUrl: process.env.DAW_HUB_API_URL || 'http://localhost:3000/api/muednote/daw-log',
  apiKey: process.env.DAW_HUB_API_KEY || 'dev_daw_key_kimny',
};

// デバウンス用マップ
interface PendingChange {
  value: number;
  valueString: string;
  timer: NodeJS.Timeout;
  trackId: number;
  deviceId: number;
  paramId: number;
}
const pendingChanges = new Map<string, PendingChange>();

// API送信カウンター
let apiSentCount = 0;
let apiErrorCount = 0;

// ログ出力 + API送信
async function emitLog(data: {
  timestamp: Date;
  trackId: number;
  deviceId: number;
  paramId: number;
  value: number;
  valueString: string;
}) {
  const time = data.timestamp.toLocaleTimeString('ja-JP');
  console.log(
    `\x1b[32m[LOG]\x1b[0m ${time} | Track:${data.trackId} Device:${data.deviceId} Param:${data.paramId} → ${data.valueString}`
  );

  // APIにPOST
  try {
    const response = await fetch(CONFIG.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-DAW-API-Key': CONFIG.apiKey,
      },
      body: JSON.stringify({
        timestamp: data.timestamp.toISOString(),
        daw: 'ableton',
        action: data.deviceId === -1 ? (data.paramId === 0 ? 'track_volume' : 'track_pan') : 'parameter_change',
        track_id: data.trackId,
        device_id: data.deviceId,
        param_id: data.paramId,
        value: data.value,
        value_string: data.valueString,
      }),
    });

    if (response.ok) {
      apiSentCount++;
      process.stdout.write(`\x1b[90m  → API sent (${apiSentCount} total)\x1b[0m\n`);
    } else {
      apiErrorCount++;
      console.error(`\x1b[31m  → API error: ${response.status}\x1b[0m`);
    }
  } catch (error) {
    apiErrorCount++;
    console.error(`\x1b[31m  → API error: ${error}\x1b[0m`);
  }
}

// デバウンス処理
function handleParameterChange(
  trackId: number,
  deviceId: number,
  paramId: number,
  value: number,
  valueString: string
) {
  const key = `${trackId}:${deviceId}:${paramId}`;

  const existing = pendingChanges.get(key);
  if (existing) {
    clearTimeout(existing.timer);
  }

  const timer = setTimeout(() => {
    emitLog({
      timestamp: new Date(),
      trackId,
      deviceId,
      paramId,
      value,
      valueString,
    });
    pendingChanges.delete(key);
  }, CONFIG.debounceMs);

  pendingChanges.set(key, {
    value,
    valueString,
    timer,
    trackId,
    deviceId,
    paramId,
  });
}

// OSCメッセージ作成
function createOscMessage(address: string, args: (string | number)[] = []): Buffer {
  const buffers: Buffer[] = [];

  const addressBuf = Buffer.from(address + '\0');
  const addressPadded = Buffer.alloc(Math.ceil(addressBuf.length / 4) * 4);
  addressBuf.copy(addressPadded);
  buffers.push(addressPadded);

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

  const addressEnd = buffer.indexOf(0, offset);
  const address = buffer.toString('utf8', offset, addressEnd);
  offset = Math.ceil((addressEnd + 1) / 4) * 4;

  const typeTagEnd = buffer.indexOf(0, offset);
  const typeTag = buffer.toString('utf8', offset + 1, typeTagEnd);
  offset = Math.ceil((typeTagEnd + 1) / 4) * 4;

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

// パラメータ値のキャッシュ（value_string用）
const paramValueCache = new Map<string, number>();

// メイン
async function main() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║       DAW Hub - MUEDnote Logger        ║');
  console.log('╚════════════════════════════════════════╝\n');

  const receiver = dgram.createSocket('udp4');
  const sender = dgram.createSocket('udp4');

  function send(address: string, args: (string | number)[] = []) {
    const msg = createOscMessage(address, args);
    sender.send(msg, CONFIG.abletonSendPort, '127.0.0.1');
  }

  // 受信ハンドラ
  receiver.on('message', (msg) => {
    try {
      const { address, args } = parseOscMessage(msg);

      // パラメータ値変更
      if (address === '/live/device/get/parameter/value') {
        const [trackId, deviceId, paramId, value] = args as [number, number, number, number];
        const key = `${trackId}:${deviceId}:${paramId}`;
        paramValueCache.set(key, value);
      }

      // パラメータ値文字列（これがきたらデバウンス処理）
      if (address === '/live/device/get/parameter/value_string') {
        const [trackId, deviceId, paramId, valueString] = args as [number, number, number, string];
        const key = `${trackId}:${deviceId}:${paramId}`;
        const value = paramValueCache.get(key) ?? 0;
        handleParameterChange(trackId, deviceId, paramId, value, valueString);
      }

      // トラック数取得 → リスナー登録開始
      if (address === '/live/song/get/num_tracks') {
        const numTracks = args[0] as number;
        console.log(`トラック検出: ${numTracks}本`);

        for (let i = 0; i < Math.min(numTracks, CONFIG.maxTracksToMonitor); i++) {
          send('/live/track/get/num_devices', [i]);
          send('/live/track/start_listen/volume', [i]);
          send('/live/track/start_listen/panning', [i]);
        }
      }

      // デバイス数取得 → パラメータリスナー登録
      if (address === '/live/track/get/num_devices') {
        const [trackId, numDevices] = args as [number, number];
        if (numDevices > 0) {
          console.log(`  Track ${trackId}: ${numDevices}デバイス`);
          for (let d = 0; d < numDevices; d++) {
            send('/live/device/get/num_parameters', [trackId, d]);
          }
        }
      }

      // パラメータ数取得 → 各パラメータにリスナー登録
      if (address === '/live/device/get/num_parameters') {
        const [trackId, deviceId, numParams] = args as [number, number, number];
        for (let p = 0; p < Math.min(numParams, CONFIG.maxParamsPerDevice); p++) {
          send('/live/device/start_listen/parameter/value', [trackId, deviceId, p]);
        }
      }

      // トラックVolume変更
      if (address === '/live/track/get/volume') {
        const [trackId, value] = args as [number, number];
        const db = 20 * Math.log10(value);
        handleParameterChange(trackId, -1, 0, value, `${db.toFixed(1)} dB`);
      }

      // トラックPan変更
      if (address === '/live/track/get/panning') {
        const [trackId, value] = args as [number, number];
        const pan = value === 0 ? 'C' : value > 0 ? `${Math.round(value * 50)}R` : `${Math.round(-value * 50)}L`;
        handleParameterChange(trackId, -1, 1, value, pan);
      }
    } catch (e) {
      // パースエラーは無視
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
  receiver.bind(CONFIG.abletonReceivePort, () => {
    console.log(`OSC受信中 (port ${CONFIG.abletonReceivePort})`);
    console.log(`デバウンス: ${CONFIG.debounceMs}ms\n`);
    console.log('接続中...\n');

    send('/live/song/get/num_tracks');

    setTimeout(() => {
      console.log('\n────────────────────────────────────────');
      console.log('準備完了！Abletonでパラメータを操作してください');
      console.log('Ctrl+C で終了');
      console.log('────────────────────────────────────────\n');
    }, 1000);
  });

  // 終了処理
  process.on('SIGINT', () => {
    console.log('\n\n終了中...');
    receiver.close();
    sender.close();
    process.exit(0);
  });
}

main().catch(console.error);
