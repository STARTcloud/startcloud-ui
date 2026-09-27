import { Buffer } from 'buffer';
import { createHash } from 'crypto';

const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const OP_TEXT = 1;
const OP_BINARY = 2;
const OP_CLOSE = 8;
const OP_PING = 9;
const OP_PONG = 10;

const acceptKey = key => createHash('sha1').update(`${key}${WS_GUID}`).digest('base64');

const encodeFrame = (payload, opcode) => {
  const body = Buffer.from(payload);
  const first = 0x80 | opcode;
  if (body.length < 126) {
    return Buffer.concat([Buffer.from([first, body.length]), body]);
  }
  if (body.length < 65536) {
    const header = Buffer.alloc(4);
    header[0] = first;
    header[1] = 126;
    header.writeUInt16BE(body.length, 2);
    return Buffer.concat([header, body]);
  }
  const header = Buffer.alloc(10);
  header[0] = first;
  header[1] = 127;
  header.writeBigUInt64BE(BigInt(body.length), 2);
  return Buffer.concat([header, body]);
};

const lengthOf = buffer => {
  const short = buffer[1] & 0x7f;
  if (short === 126) {
    return buffer.length < 4 ? null : { length: buffer.readUInt16BE(2), offset: 4 };
  }
  if (short === 127) {
    return buffer.length < 10 ? null : { length: Number(buffer.readBigUInt64BE(2)), offset: 10 };
  }
  return { length: short, offset: 2 };
};

const readFrame = buffer => {
  const size = buffer.length < 2 ? null : lengthOf(buffer);
  if (!size) {
    return null;
  }
  const masked = (buffer[1] & 0x80) !== 0;
  const start = size.offset + (masked ? 4 : 0);
  const end = start + size.length;
  if (buffer.length < end) {
    return null;
  }
  const payload = Buffer.from(buffer.subarray(start, end));
  if (masked) {
    const mask = buffer.subarray(size.offset, size.offset + 4);
    payload.forEach((byte, index) => {
      payload[index] = byte ^ mask[index % 4];
    });
  }
  return { opcode: buffer[0] & 0x0f, payload, rest: buffer.subarray(end) };
};

/**
 * A WebSocket over an upgraded socket, text frames alone: the handshake
 * is answered, every text or binary frame received is handed to `onText`,
 * a ping is answered and a close frame closes the socket.
 *
 * @param {Object} options - `req`, `socket`, `onText` and `onClose`
 * @returns {{ send: Function, close: Function }} The connection
 */
export const openSocket = ({ req, socket, onText, onClose }) => {
  let pending = Buffer.alloc(0);
  const send = (payload, opcode = OP_TEXT) => {
    if (!socket.destroyed) {
      socket.write(encodeFrame(payload, opcode));
    }
  };
  const close = () => {
    send('', OP_CLOSE);
    socket.end();
  };
  const dispatch = received => {
    if (received.opcode === OP_CLOSE) {
      close();
    } else if (received.opcode === OP_PING) {
      send(received.payload, OP_PONG);
    } else if (received.opcode === OP_TEXT || received.opcode === OP_BINARY) {
      onText(received.payload.toString('utf8'));
    }
  };
  const drain = () => {
    let received = readFrame(pending);
    while (received) {
      pending = received.rest;
      dispatch(received);
      received = readFrame(pending);
    }
  };
  socket.write(
    [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${acceptKey(req.headers['sec-websocket-key'])}`,
      '',
      '',
    ].join('\r\n')
  );
  socket.on('data', chunk => {
    pending = Buffer.concat([pending, chunk]);
    drain();
  });
  socket.on('close', onClose);
  socket.on('error', () => socket.destroy());
  return { send, close };
};

export const refuseSocket = (socket, line) => {
  socket.write(`HTTP/1.1 ${line}\r\nConnection: close\r\n\r\n`);
  socket.destroy();
};
