/**
 * Debug script to get FabFilter Pro-Q4 parameter names and values
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

// Target: Track 3, Device 2 (Pro-Q 4) - adjust as needed
const TRACK_ID = 3;
const DEVICE_ID = 2;

interface ParamInfo {
  id: number;
  name: string;
  value: number;
  valueString: string;
}

const params: Map<number, ParamInfo> = new Map();
let expectedParams = 0;
let receivedCount = 0;

server.on('message', (msg) => {
  try {
    const { address, args } = parseOscMessage(msg);

    if (address === '/live/device/get/num_parameters') {
      const [trackId, deviceId, numParams] = args as [number, number, number];
      if (trackId === TRACK_ID && deviceId === DEVICE_ID) {
        expectedParams = numParams;
        console.log(`\nPro-Q 4 has ${numParams} parameters\n`);
        console.log('Fetching parameter details...\n');

        for (let i = 0; i < numParams; i++) {
          send('/live/device/get/parameter/name', [TRACK_ID, DEVICE_ID, i]);
          send('/live/device/get/parameter/value', [TRACK_ID, DEVICE_ID, i]);
          send('/live/device/get/parameter/value_string', [TRACK_ID, DEVICE_ID, i]);
        }
      }
    }

    if (address === '/live/device/get/parameter/name') {
      const [trackId, deviceId, paramId, name] = args as [number, number, number, string];
      if (trackId === TRACK_ID && deviceId === DEVICE_ID) {
        const existing = params.get(paramId) || { id: paramId, name: '', value: 0, valueString: '' };
        existing.name = name;
        params.set(paramId, existing);
        checkComplete();
      }
    }

    if (address === '/live/device/get/parameter/value') {
      const [trackId, deviceId, paramId, value] = args as [number, number, number, number];
      if (trackId === TRACK_ID && deviceId === DEVICE_ID) {
        const existing = params.get(paramId) || { id: paramId, name: '', value: 0, valueString: '' };
        existing.value = value;
        params.set(paramId, existing);
        checkComplete();
      }
    }

    if (address === '/live/device/get/parameter/value_string') {
      const [trackId, deviceId, paramId, valueString] = args as [number, number, number, string];
      if (trackId === TRACK_ID && deviceId === DEVICE_ID) {
        const existing = params.get(paramId) || { id: paramId, name: '', value: 0, valueString: '' };
        existing.valueString = valueString;
        params.set(paramId, existing);
        checkComplete();
      }
    }
  } catch (e) {
    // ignore
  }
});

function checkComplete() {
  // Check if we have all info for all params
  let complete = true;
  for (let i = 0; i < expectedParams; i++) {
    const p = params.get(i);
    if (!p || !p.name) {
      complete = false;
      break;
    }
  }

  if (complete && params.size === expectedParams) {
    printResults();
  }
}

function printResults() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('ID   │ Name                          │ Value      │ Display');
  console.log('─────┼───────────────────────────────┼────────────┼──────────────');

  const sorted = [...params.values()].sort((a, b) => a.id - b.id);
  for (const p of sorted) {
    const id = String(p.id).padStart(4);
    const name = p.name.padEnd(30).slice(0, 30);
    const value = p.value.toFixed(4).padStart(10);
    console.log(`${id} │ ${name} │ ${value} │ ${p.valueString}`);
  }

  console.log('═══════════════════════════════════════════════════════════════\n');

  // Analyze band structure
  analyzeBandStructure(sorted);

  setTimeout(() => process.exit(0), 500);
}

function analyzeBandStructure(params: ParamInfo[]) {
  console.log('\n📊 Band Structure Analysis:');
  console.log('───────────────────────────');

  // Look for patterns in parameter names
  const bandParams = params.filter(p => /Band \d+/.test(p.name) || /^\d+/.test(p.name));
  const globalParams = params.filter(p => !/Band \d+/.test(p.name) && !/^\d+/.test(p.name));

  console.log(`\nGlobal Parameters: ${globalParams.length}`);
  for (const p of globalParams) {
    console.log(`  ${p.id}: ${p.name} = ${p.valueString}`);
  }

  console.log(`\nBand-related Parameters: ${bandParams.length}`);

  // Group by band number
  const bands = new Map<string, ParamInfo[]>();
  for (const p of bandParams) {
    const match = p.name.match(/Band (\d+)/);
    if (match) {
      const bandNum = match[1];
      if (!bands.has(bandNum)) bands.set(bandNum, []);
      bands.get(bandNum)!.push(p);
    }
  }

  for (const [bandNum, bandParamsGroup] of bands) {
    console.log(`\n  Band ${bandNum}:`);
    for (const p of bandParamsGroup) {
      const paramType = p.name.replace(/Band \d+ /, '');
      console.log(`    ${paramType}: ${p.valueString} (id=${p.id})`);
    }
  }
}

server.on('error', (err) => {
  console.error('Error:', err.message);
  process.exit(1);
});

server.bind(11001, () => {
  console.log('🔍 Analyzing FabFilter Pro-Q 4 parameters...');
  console.log(`   Target: Track ${TRACK_ID}, Device ${DEVICE_ID}`);
  console.log('   (Adjust TRACK_ID and DEVICE_ID if needed)\n');

  send('/live/device/get/num_parameters', [TRACK_ID, DEVICE_ID]);

  setTimeout(() => {
    console.log('\n⏰ Timeout - printing partial results');
    printResults();
  }, 5000);
});
