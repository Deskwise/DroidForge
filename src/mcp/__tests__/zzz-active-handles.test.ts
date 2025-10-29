import { after } from 'node:test';

// Diagnostic: helps identify what keeps the Node event loop alive after tests.
// Prints active handles/requests and unrefs timers so the process can exit naturally.
after(() => {
  const anyProc = process as any;
  const handles: any[] = anyProc._getActiveHandles?.() ?? [];
  const requests: any[] = anyProc._getActiveRequests?.() ?? [];

  try {
    // eslint-disable-next-line no-console
    console.error('ACTIVE_HANDLES:', handles.map(h => h?.constructor?.name));
    // eslint-disable-next-line no-console
    console.error('ACTIVE_REQUESTS:', requests.map(r => r?.constructor?.name));
  } catch {}

  // Best effort: unref timers so they don't hold the loop open
  for (const h of handles) {
    try { h?.unref?.(); } catch {}
  }
});

