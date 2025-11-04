import { before, after } from 'node:test';

// WORKAROUND: Clean up tsx runtime IPC sockets before AND after tests
// The before() hook runs first and destroys lingering sockets from tsx
// The after() hook prints diagnostics for any remaining handles
before(() => {
  const anyProc = process as any;
  const handles: any[] = anyProc._getActiveHandles?.() ?? [];
  
  for (const h of handles) {
    try {
      if (h && h.constructor && h.constructor.name === 'Socket') {
        if (h === process.stdout || h === process.stderr || h === process.stdin) continue;
        if ((h.localAddress === null || h.localAddress === undefined) && 
            (h.remoteAddress === null || h.remoteAddress === undefined) &&
            h.readyState === 'writeOnly') {
          h.destroy();
        }
      }
    } catch (e) {
      // ignore
    }
  }
});

// Diagnostic: helps identify what keeps the Node event loop alive after tests.
// Prints active handles/requests and unrefs timers so the process can exit naturally.
after(() => {
  const anyProc = process as any;
  const handles: any[] = anyProc._getActiveHandles?.() ?? [];
  const requests: any[] = anyProc._getActiveRequests?.() ?? [];

  // WORKAROUND: Destroy lingering tsx runtime IPC sockets before printing diagnostics
  for (const h of handles) {
    try {
      if (h && h.constructor && h.constructor.name === 'Socket') {
        // Skip stdio
        if (h === process.stdout || h === process.stderr || h === process.stdin) continue;
        // Destroy write-only sockets with no addresses (IPC pipes from tsx runtime)
        if ((h.localAddress === null || h.localAddress === undefined) && 
            (h.remoteAddress === null || h.remoteAddress === undefined) &&
            h.readyState === 'writeOnly') {
          h.destroy();
        }
      }
    } catch (e) {
      // ignore
    }
  }

  try {
    // eslint-disable-next-line no-console
    console.error('ACTIVE_HANDLES:', handles.map(h => h?.constructor?.name));
    // Print extra socket info to help locate the origin of lingering handles
    for (const h of handles) {
      try {
        if (h && h.constructor && h.constructor.name === 'Socket') {
          // eslint-disable-next-line no-console
          console.error('SOCKET INFO:', {
            localAddress: h.localAddress ?? null,
            localPort: h.localPort ?? null,
            remoteAddress: h.remoteAddress ?? null,
            remotePort: h.remotePort ?? null,
            readyState: h.readyState ?? null
          });
        }
      } catch (e) {
        // ignore
      }
    }
    // eslint-disable-next-line no-console
    console.error('ACTIVE_REQUESTS:', requests.map(r => r?.constructor?.name));
  } catch {}

  // Best effort: unref timers so they don't hold the loop open
  // Best effort: unref any handle that exposes unref so it doesn't keep the loop alive
  for (const h of handles) {
    try { h?.unref?.(); } catch {}
  }
  
  // Removed: why-is-node-running and wtfnode calls (packages not in devDependencies)
  // Removed: last-resort socket destroy (moved to top of after() hook)
});

