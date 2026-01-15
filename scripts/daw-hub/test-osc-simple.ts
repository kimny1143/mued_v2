import dgram from 'dgram';

const client = dgram.createSocket('udp4');
const server = dgram.createSocket('udp4');

// OSCメッセージを作成
function createOscMessage(address: string): Buffer {
  const addressBuf = Buffer.from(address + '\0');
  const addressPadded = Buffer.alloc(Math.ceil(addressBuf.length / 4) * 4);
  addressBuf.copy(addressPadded);

  const typeBuf = Buffer.from(',\0');
  const typePadded = Buffer.alloc(4);
  typeBuf.copy(typePadded);

  return Buffer.concat([addressPadded, typePadded]);
}

// 11001で応答を待機
server.on('message', (msg, rinfo) => {
  const address = msg.toString('utf8', 0, msg.indexOf(0));
  console.log('✅ 応答受信: ' + address + ' from ' + rinfo.address + ':' + rinfo.port);
  console.log('   Raw:', msg.slice(0, 50).toString('hex'));
  setTimeout(() => process.exit(0), 500);
});

server.on('error', (err) => {
  console.error('❌ 受信エラー:', err.message);
  process.exit(1);
});

server.bind(11001, () => {
  console.log('📡 ポート11001で待機中...');

  // 11000にクエリ送信
  const msg = createOscMessage('/live/song/get/tempo');
  client.send(msg, 11000, '127.0.0.1', (err) => {
    if (err) {
      console.error('❌ 送信エラー:', err);
    } else {
      console.log('📤 送信: /live/song/get/tempo → 127.0.0.1:11000');
    }
  });

  // 3秒タイムアウト
  setTimeout(() => {
    console.log('⏰ タイムアウト - 応答なし');
    process.exit(1);
  }, 3000);
});
