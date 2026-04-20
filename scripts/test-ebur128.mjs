/**
 * Golden test: run same algorithm as ebur128-processor.js on /tmp/test_1khz.wav
 * Expected: ≈ -1.1 LUFS (matching ffmpeg ebur128 reference)
 * Run: node scripts/test-ebur128.mjs
 */
import fs from 'fs';

function readWavF32(path) {
  const buf = fs.readFileSync(path);
  let i = 12;
  while (i < buf.length - 8) {
    const id = buf.slice(i, i + 4).toString('ascii');
    const sz = buf.readUInt32LE(i + 4);
    if (id === 'data') {
      const samples = sz / 4;
      const data = new Float32Array(samples);
      for (let j = 0; j < samples; j++) data[j] = buf.readFloatLE(i + 8 + j * 4);
      return data;
    }
    i += 8 + sz;
  }
  throw new Error('data chunk not found');
}

function computeKWeightingCoefficients(fs) {
  const f0 = 1681.974450955533, G = 3.999843853973347, Q = 0.7071752369554196;
  const K = Math.tan(Math.PI * f0 / fs);
  const Vh = Math.pow(10, G / 20);
  const Vb = Math.pow(Vh, 0.4996667741545416);
  const a0 = 1 + K / Q + K * K;
  const s1 = {
    b0: (Vh + Vb * K / Q + K * K) / a0, b1: 2 * (K * K - Vh) / a0,
    b2: (Vh - Vb * K / Q + K * K) / a0, a1: 2 * (K * K - 1) / a0,
    a2: (1 - K / Q + K * K) / a0,
  };
  const f1 = 38.13574584835530, Q2 = 0.5003270373238773;
  const K2 = Math.tan(Math.PI * f1 / fs);
  const a0b = 1 + K2 / Q2 + K2 * K2;
  const s2 = {
    b0: 1 / a0b, b1: -2 / a0b, b2: 1 / a0b,
    a1: 2 * (K2 * K2 - 1) / a0b, a2: (1 - K2 / Q2 + K2 * K2) / a0b,
  };
  return { s1, s2 };
}

const SR = 48000;
const raw = readWavF32('/tmp/test_1khz.wav');
const nSamples = raw.length / 2; // stereo interleaved

const chL = new Float64Array(nSamples);
const chR = new Float64Array(nSamples);
for (let i = 0; i < nSamples; i++) {
  chL[i] = raw[i * 2];
  chR[i] = raw[i * 2 + 1];
}

const c = computeKWeightingCoefficients(SR);
const channels = [chL, chR];
const bq = channels.map(() => [
  { x1: 0, x2: 0, y1: 0, y2: 0 },
  { x1: 0, x2: 0, y1: 0, y2: 0 },
]);

const blockSz = Math.round(SR * 0.1);
const absThresh = Math.pow(10, (-70 + 0.691) / 10);
let blockAccum = 0, blockN = 0;
const intBlocks = [];

for (let i = 0; i < nSamples; i++) {
  let chSum = 0;
  for (let ch = 0; ch < 2; ch++) {
    const x = channels[ch][i];
    const b1 = bq[ch][0];
    const y1 = c.s1.b0*x + c.s1.b1*b1.x1 + c.s1.b2*b1.x2 - c.s1.a1*b1.y1 - c.s1.a2*b1.y2;
    b1.x2 = b1.x1; b1.x1 = x; b1.y2 = b1.y1; b1.y1 = y1;
    const b2 = bq[ch][1];
    const y2 = c.s2.b0*y1 + c.s2.b1*b2.x1 + c.s2.b2*b2.x2 - c.s2.a1*b2.y1 - c.s2.a2*b2.y2;
    b2.x2 = b2.x1; b2.x1 = y1; b2.y2 = b2.y1; b2.y1 = y2;
    chSum += y2 * y2; // G=1.0 for L and R
  }
  blockAccum += chSum;
  blockN++;
  if (blockN >= blockSz) {
    const meanSq = blockAccum / blockN;
    blockAccum = 0; blockN = 0;
    if (meanSq >= absThresh) intBlocks.push(meanSq);
  }
}

const intAbsN = intBlocks.length;
if (intAbsN === 0) { console.log('Integrated: -70 LUFS (all silence)'); process.exit(0); }

const intAbsSum = intBlocks.reduce((s, v) => s + v, 0);
const gammaA = intAbsSum / intAbsN;
const relThresh = gammaA * Math.pow(10, -10 / 10);
const relBlocks = intBlocks.filter(b => b >= relThresh);
const relMean = relBlocks.reduce((s, v) => s + v, 0) / relBlocks.length;
const intLufs = -0.691 + 10 * Math.log10(relMean);

console.log(`Total blocks:    ${intBlocks.length}`);
console.log(`GammaA:          ${(-0.691 + 10*Math.log10(gammaA)).toFixed(2)} LUFS`);
console.log(`Rel-gated:       ${relBlocks.length}/${intAbsN} blocks`);
console.log(`Integrated:      ${intLufs.toFixed(2)} LUFS`);
console.log(`Expected:        -1.1 LUFS (ffmpeg ebur128)`);
console.log(`Diff:            ${(intLufs - (-1.1)).toFixed(2)} LUFS`);
