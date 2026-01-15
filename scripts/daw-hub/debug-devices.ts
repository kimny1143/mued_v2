/**
 * Debug script to list all devices on all tracks
 */
import dgram from 'dgram';

const client = dgram.createSocket('udp4');
const server = dgram.createSocket('udp4');

function createOscMessage(address: string, args: number[] = []): Buffer {
  const buffers: Buffer[] = [];

  const addressBuf = Buffer.from(address + '\0');
  const addressPadded = Buffer.alloc(Math.ceil(addressBuf.length / 4) * 4);
  addressBuf.copy(addressPadded);
  buffers.push(addressPadded);

  let typeTag = ',';
  for (const arg of args) {
    typeTag += 'i';
  }
  const typeBuf = Buffer.from(typeTag + '\0');
  const typePadded = Buffer.alloc(Math.ceil(typeBuf.length / 4) * 4);
  typeBuf.copy(typePadded);
  buffers.push(typePadded);

  for (const arg of args) {
    const buf = Buffer.alloc(4);
    buf.writeInt32BE(arg, 0);
    buffers.push(buf);
  }

  return Buffer.concat(buffers);
}

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

function send(address: string, args: number[] = []) {
  const msg = createOscMessage(address, args);
  client.send(msg, 11000, '127.0.0.1');
}

let numTracks = 0;
const deviceInfo: Map<string, { name: string; numParams: number }> = new Map();
let pendingRequests = 0;

server.on('message', (msg) => {
  try {
    const { address, args } = parseOscMessage(msg);

    if (address === '/live/song/get/num_tracks') {
      numTracks = args[0] as number;
      console.log(`\n=== トラック数: ${numTracks} ===\n`);

      for (let i = 0; i < numTracks; i++) {
        send('/live/track/get/name', [i]);
        send('/live/track/get/num_devices', [i]);
        pendingRequests += 2;
      }
    }

    if (address === '/live/track/get/name') {
      const [trackId, name] = args as [number, string];
      console.log(`Track ${trackId}: "${name}"`);
      pendingRequests--;
    }

    if (address === '/live/track/get/num_devices') {
      const [trackId, numDevices] = args as [number, number];
      console.log(`  → デバイス数: ${numDevices}`);
      pendingRequests--;

      for (let d = 0; d < numDevices; d++) {
        send('/live/device/get/name', [trackId, d]);
        send('/live/device/get/num_parameters', [trackId, d]);
        pendingRequests += 2;
      }
    }

    if (address === '/live/device/get/name') {
      const [trackId, deviceId, name] = args as [number, number, string];
      const key = `${trackId}:${deviceId}`;
      const existing = deviceInfo.get(key) || { name: '', numParams: 0 };
      existing.name = name;
      deviceInfo.set(key, existing);
      console.log(`    Device ${deviceId}: "${name}"`);
      pendingRequests--;
    }

    if (address === '/live/device/get/num_parameters') {
      const [trackId, deviceId, numParams] = args as [number, number, number];
      const key = `${trackId}:${deviceId}`;
      const existing = deviceInfo.get(key) || { name: '', numParams: 0 };
      existing.numParams = numParams;
      deviceInfo.set(key, existing);
      console.log(`      → パラメータ数: ${numParams}`);
      pendingRequests--;
    }

    // Check if done
    if (pendingRequests <= 0) {
      setTimeout(() => {
        console.log('\n=== サマリー ===\n');
        for (const [key, info] of deviceInfo) {
          const [trackId, deviceId] = key.split(':');
          console.log(`Track ${trackId} Device ${deviceId}: ${info.name} (${info.numParams} params)`);
        }
        process.exit(0);
      }, 1000);
    }
  } catch (e) {
    // ignore
  }
});

server.on('error', (err) => {
  console.error('Error:', err.message);
  process.exit(1);
});

server.bind(11001, () => {
  console.log('デバイス情報を取得中...\n');
  send('/live/song/get/num_tracks');

  setTimeout(() => {
    console.log('\nタイムアウト');
    process.exit(1);
  }, 10000);
});
