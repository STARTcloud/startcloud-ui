import '@devolutions/iron-remote-desktop';
import {
  Backend,
  colorDepth,
  connectionInfo,
  displayControl,
  enableAudio,
  init,
  lossyCompression,
  resizeMode,
  sessionStats,
} from '@devolutions/iron-remote-desktop-rdp';

let ready = null;

/**
 * The browser-RDP client, IronRDP's element and its WASM, the one module
 * that imports them, so the console pane, its header and the full-window
 * page draw at once and the client is fetched only when a session host
 * asks for it, once per page: the WASM initialized and the backend, the
 * config extensions and the two extension readers of the connection
 * panel answered together.
 *
 * @returns {Promise<Object>} `Backend`, `colorDepth`, `connectionInfo`, `displayControl`, `enableAudio`, `lossyCompression`, `resizeMode` and `sessionStats`
 */
export const loadRdpClient = () => {
  ready ||= init('INFO').then(() => ({
    Backend,
    colorDepth,
    connectionInfo,
    displayControl,
    enableAudio,
    lossyCompression,
    resizeMode,
    sessionStats,
  }));
  return ready;
};
