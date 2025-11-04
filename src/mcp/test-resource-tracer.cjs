const fs = require('fs');
const path = require('path');
const async_hooks = require('async_hooks');
const os = require('os');

const outPath = process.env.DROIDFORGE_HANDLE_TRACE || path.join(os.tmpdir(), 'droidforge-handle-traces.jsonl');

function append(obj) {
  try {
    fs.appendFileSync(outPath, JSON.stringify(obj) + '\n', 'utf8');
  } catch (e) {
    // ignore write errors
  }
}

const hook = async_hooks.createHook({
  init(asyncId, type, triggerAsyncId) {
    try {
      if (
        type &&
        (type.toLowerCase().includes('tcp') ||
          type.toLowerCase().includes('pipe') ||
          type.toLowerCase().includes('tty') ||
          type.toLowerCase().includes('socket'))
      ) {
        const stack = new Error().stack;
        append({ timestamp: new Date().toISOString(), asyncId, type, triggerAsyncId, stack });
      }
    } catch (e) {}
  }
});

hook.enable();

append({ startedAt: new Date().toISOString(), pid: process.pid, argv: process.argv.slice(0, 3) });
