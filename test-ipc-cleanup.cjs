// Best-effort IPC/socket cleanup for test runs to avoid lingering write-only handles.
// Loaded via NODE_OPTIONS during npm test.
const net = require('net');

const DEBUG = Boolean(process.env.DEBUG_IPC_CLEANUP);

function isSocket(handle) {
  return (
    handle &&
    typeof handle === 'object' &&
    (handle instanceof net.Socket || (handle.constructor && handle.constructor.name === 'Socket'))
  );
}

function isLikelyIpcSocket(handle) {
  if (!isSocket(handle)) {
    return false;
  }

  if (handle.destroyed) {
    return false;
  }

  if (handle.readyState && handle.readyState !== 'writeOnly') {
    return false;
  }

  // Avoid touching stdio fds.
  if (typeof handle.fd === 'number' && handle.fd >= 0 && handle.fd <= 2) {
    return false;
  }

  try {
    const address = typeof handle.address === 'function' ? handle.address() : null;
    if (address && (address.address || address.port)) {
      return false;
    }
  } catch (_) {
    // address() can throw on certain handle states; ignore.
  }

  if (handle.remoteAddress || handle.remotePort || handle.localAddress || handle.localPort) {
    return false;
  }

  return true;
}

function cleanupIpcSockets(reason = 'unknown') {
  let cleaned = 0;

  try {
    const handles = typeof process._getActiveHandles === 'function' ? process._getActiveHandles() : [];

    for (const handle of handles) {
      if (!isLikelyIpcSocket(handle)) {
        continue;
      }

      try {
        handle.destroy();
        cleaned += 1;
      } catch (err) {
        if (DEBUG) {
          console.warn(`[ipc-cleanup] Failed to destroy socket during ${reason}:`, err);
        }
      }
    }
  } catch (err) {
    if (DEBUG) {
      console.warn(`[ipc-cleanup] Failed to enumerate handles during ${reason}:`, err);
    }
  }

  if (DEBUG && cleaned > 0) {
    console.warn(`[ipc-cleanup] Destroyed ${cleaned} lingering socket(s) during ${reason}.`);
  }
}

function cleanupAndReemit(signal) {
  cleanupIpcSockets(signal);

  try {
    process.kill(process.pid, signal);
  } catch (_) {
    // If the signal cannot be re-emitted (already exiting), fall back to exit code semantics.
    if (signal === 'SIGINT') {
      process.exit(130);
    } else if (signal === 'SIGTERM') {
      process.exit(143);
    }
  }
}

process.once('beforeExit', () => cleanupIpcSockets('beforeExit'));
process.once('exit', () => cleanupIpcSockets('exit'));
process.once('SIGINT', () => cleanupAndReemit('SIGINT'));
process.once('SIGTERM', () => cleanupAndReemit('SIGTERM'));

module.exports = { cleanupIpcSockets };
