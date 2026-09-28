import { Buffer } from 'buffer';
import zlib from 'zlib';

import { featuresOf, machineOf } from './fleet.js';
import { problem, refusal } from './kit.js';

const WIDTH = 320;
const HEIGHT = 200;
const BAND = 25;
const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const TRUECOLOUR = 2;
const BIT_DEPTH = 8;
const TONES = [
  [27, 30, 34],
  [13, 110, 253],
  [25, 135, 84],
  [255, 193, 7],
];
const NOT_RUNNING = {
  hyperweaver: 'Machine is not running — no framebuffer to capture',
  zoneweaver: 'Failed to capture screenshot',
};
const MISSING = { hyperweaver: 'Machine not found', zoneweaver: 'Zone not found' };

const CRC_TABLE = [...Array(256).keys()].map(index => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

const crcOf = bytes => {
  let value = 0xffffffff;
  bytes.forEach(byte => {
    value = CRC_TABLE[(value ^ byte) & 0xff] ^ (value >>> 8);
  });
  return (value ^ 0xffffffff) >>> 0;
};

const chunk = (type, data) => {
  const head = Buffer.alloc(4);
  head.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const tail = Buffer.alloc(4);
  tail.writeUInt32BE(crcOf(body));
  return Buffer.concat([head, body, tail]);
};

const header = () => {
  const data = Buffer.alloc(13);
  data.writeUInt32BE(WIDTH, 0);
  data.writeUInt32BE(HEIGHT, 4);
  data.writeUInt8(BIT_DEPTH, 8);
  data.writeUInt8(TRUECOLOUR, 9);
  return data;
};

const toneAt = (shift, line) => TONES[(Math.floor(line / BAND) + shift) % TONES.length];

const pixels = shift => {
  const row = 1 + WIDTH * 3;
  const data = Buffer.alloc(row * HEIGHT);
  for (let line = 0; line < HEIGHT; line += 1) {
    const [red, green, blue] = toneAt(shift, line);
    for (let column = 0; column < WIDTH; column += 1) {
      const at = line * row + 1 + column * 3;
      data[at] = red;
      data[at + 1] = green;
      data[at + 2] = blue;
    }
  }
  return data;
};

const frame = shift =>
  Buffer.concat([
    SIGNATURE,
    chunk('IHDR', header()),
    chunk('IDAT', zlib.deflateSync(pixels(shift))),
    chunk('IEND', Buffer.alloc(0)),
  ]);

const frames = { count: 0 };

const screenshot = ctx => {
  const { host, res } = ctx;
  if (!featuresOf(host).includes('machine-screenshot')) {
    return problem(404, 'Not Found');
  }
  const row = machineOf(host, decodeURIComponent(ctx.params.name));
  if (!row) {
    return refusal(404, MISSING[host.kind]);
  }
  if (row.status !== 'running') {
    return refusal(502, NOT_RUNNING[host.kind]);
  }
  frames.count += 1;
  const png = frame(frames.count);
  res.writeHead(200, {
    'Content-Type': 'image/png',
    'Content-Length': png.length,
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
  });
  res.end(png);
  return null;
};

/**
 * The screen of a running machine, `GET machines/{name}/vnc/screenshot`,
 * on a host that lists `machine-screenshot`: a PNG of coloured bands made
 * here, the bands moved one step a frame so a second read is seen to be
 * a new frame, written to the response as `image/png` with the agents'
 * no-cache headers; a machine that does not run answers 502 and a host
 * without the token 404.
 *
 * @param {Function} agentRoute - The router's `agentRoute`
 * @returns {void}
 */
export const mountScreenshot = agentRoute => {
  agentRoute('GET', 'machines/:name/vnc/screenshot', screenshot);
};
