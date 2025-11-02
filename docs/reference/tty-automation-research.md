# TTY/PTY Automation: Industry Approaches & Best Practices

## Executive Summary

This document covers industry-standard approaches for executing interactive CLI programs that require true TTY allocation (`[[ -t 0 ]]` guards) from headless or automated environments. It addresses pseudo-terminal (PTY) allocation, transcript capture during interactive sessions, and common pitfalls.

---

## The TTY Problem

### Why Interactive Programs Fail in Headless Environments

Interactive CLI programs often check if stdin is connected to a terminal:

```bash
# Shell guard
if [[ -t 0 ]]; then
  echo "Interactive mode"
else
  echo "Non-interactive - abort!"
  exit 1
fi
```

```python
# Python check
import sys
if sys.stdin.isatty():
    # Interactive features
else:
    raise RuntimeError("Must run from terminal")
```

```javascript
// Node.js check
if (process.stdin.isTTY) {
  // Interactive mode
} else {
  throw new Error("Requires TTY");
}
```

**The root cause:** Standard pipes (`|`), redirections (`<`), and background jobs don't provide a controlling terminal, so `isatty()` returns `false`.

---

## Industry Solutions for PTY Allocation

### 1. Unix `script` Command

**Overview:** The classic Unix utility for recording terminal sessions while preserving TTY semantics.

#### Basic Usage

```bash
# Record a session to typescript file
script typescript

# Non-interactive mode (runs command and exits)
script -c "your-interactive-command" output.log

# Log timing for replay
script -t 2>timing.log -c "droid" session.log

# Replay session with timing
scriptreplay -t timing.log session.log
```

#### Advanced Features (util-linux 2.35+)

```bash
# Separate input/output streams
script --log-in input.log --log-out output.log --log-timing timing.log -c "droid"

# Multi-stream format for complex analysis
script --logging-format advanced --log-io combined.log --log-timing timing.log

# Quiet mode (suppress "Script started" messages)
script -q -c "your-command" output.log

# Append to existing transcript
script -a -c "your-command" output.log

# Flush output immediately (real-time monitoring)
script -f output.log
```

#### Real-World Use Cases

```bash
# 1. CI/CD: Capture interactive installer output
script -q -c "npm install && npm run interactive-setup" ci-log.txt

# 2. Debugging: Record user session for support
script -t 2>timing.log user-session.log

# 3. Compliance: Log privileged operations
script -a /var/log/admin-sessions.log

# 4. Testing: Run interactive test suite
script -c "pytest --interactive" test-output.log
```

#### Pitfalls

- **Timing issues:** `script` may hang if the spawned program expects EOF but stdin is still open
- **Signal handling:** Child process may not receive signals cleanly (use `script -e` to propagate exit codes)
- **Buffering:** Output may be buffered; use `script -f` for real-time
- **Escape sequences:** ANSI codes are captured raw; filter with `col -b` or similar

---

### 2. Python `pty` Module

**Overview:** Pure Python module for spawning processes with pseudo-terminal control.

#### Basic Pattern

```python
import pty
import os
import sys

def spawn_with_pty(command):
    """Spawn command with PTY allocation."""
    def read(fd):
        data = os.read(fd, 1024)
        return data
    
    # pty.spawn handles TTY allocation automatically
    return pty.spawn(command, read)

# Usage
spawn_with_pty(['droid', 'exec', 'task description'])
```

#### Advanced: Capture Transcript While Maintaining Interactivity

```python
import pty
import os
import sys
import select
import time

def interactive_session_with_logging(command, logfile):
    """
    Run interactive session with PTY, logging all I/O.
    User can still interact, and everything is captured.
    """
    master_fd, slave_fd = pty.openpty()
    
    pid = os.fork()
    if pid == 0:  # Child
        os.close(master_fd)
        os.setsid()
        os.dup2(slave_fd, 0)  # stdin
        os.dup2(slave_fd, 1)  # stdout
        os.dup2(slave_fd, 2)  # stderr
        os.close(slave_fd)
        os.execvp(command[0], command)
    
    # Parent
    os.close(slave_fd)
    
    with open(logfile, 'wb') as log:
        try:
            while True:
                # Multiplex: terminal input → child, child output → terminal + log
                ready, _, _ = select.select([sys.stdin, master_fd], [], [], 1.0)
                
                if sys.stdin in ready:
                    # User typed something
                    data = os.read(sys.stdin.fileno(), 1024)
                    if data:
                        os.write(master_fd, data)
                        log.write(b"[INPUT] " + data)
                
                if master_fd in ready:
                    # Child produced output
                    data = os.read(master_fd, 1024)
                    if not data:
                        break
                    os.write(sys.stdout.fileno(), data)
                    log.write(data)
                    log.flush()
        except OSError:
            pass
        finally:
            os.close(master_fd)
            os.waitpid(pid, 0)

# Usage
interactive_session_with_logging(['droid'], 'session.log')
```

#### Pitfalls

- **Platform-specific:** `pty` module only works on Unix-like systems
- **Raw mode:** Terminal echo and special chars (Ctrl+C) may need manual handling
- **Window size:** Must propagate `SIGWINCH` for full-screen apps like `vim`:

```python
import signal
import fcntl
import termios
import struct

def handle_resize(signum, frame):
    """Propagate terminal resize to child."""
    s = struct.pack("HHHH", 0, 0, 0, 0)
    size = fcntl.ioctl(sys.stdout.fileno(), termios.TIOCGWINSZ, s)
    fcntl.ioctl(master_fd, termios.TIOCSWINSZ, size)

signal.signal(signal.SIGWINCH, handle_resize)
```

---

### 3. `pexpect` (Python)

**Overview:** High-level Python library for automating interactive applications. Built on top of `pty`.

#### Basic Automation

```python
import pexpect

# Spawn interactive program
child = pexpect.spawn('ssh user@example.com')

# Wait for prompt and respond
child.expect('password:')
child.sendline('mypassword')

# Continue interaction
child.expect('$ ')
child.sendline('ls -la')

# Capture all output
output = child.before.decode()

child.close()
```

#### Advanced: Logging + Automation

```python
import pexpect
import sys

def automate_with_transcript(command, logfile):
    """
    Automate interactive program while logging full transcript.
    """
    with open(logfile, 'wb') as log:
        child = pexpect.spawn(command, encoding='utf-8', timeout=300)
        
        # Log all output to file AND stdout
        child.logfile_read = sys.stdout
        child.logfile = log
        
        try:
            # Automation: respond to prompts
            child.expect('What is your name?')
            child.sendline('Alice')
            
            child.expect('Choose methodology:')
            child.sendline('agile')
            
            # Wait for completion
            child.expect(pexpect.EOF)
        except pexpect.TIMEOUT:
            print(f"Timeout waiting for expected output")
        finally:
            child.close()
            return child.exitstatus

# Usage
exit_code = automate_with_transcript('droid', 'droid-session.log')
```

#### Real-World Patterns

```python
# 1. Flexible pattern matching
child.expect([
    'password:',           # Index 0
    'Are you sure.*yes',   # Index 1
    pexpect.TIMEOUT,       # Index 2
    pexpect.EOF            # Index 3
])

if child.match.group() == 0:
    child.sendline(password)
elif child.match.group() == 1:
    child.sendline('yes')

# 2. Debugging: see what's happening
child.logfile = sys.stdout  # Echo everything
child.setecho(True)         # See what you send

# 3. Interact mode: hand control to user
child.expect('Main menu:')
print("Automation complete, handing off to user...")
child.interact()  # User controls from here
```

#### Pitfalls

- **Pattern matching:** Regex patterns can be slow; use literal strings when possible
- **Buffer overflow:** Child output can fill buffer; read regularly:

```python
# BAD: pattern never appears due to buffer filling
child.expect('final output')

# GOOD: consume output as it arrives
while True:
    index = child.expect(['intermediate', 'final output', pexpect.TIMEOUT])
    if index == 1:
        break
```

- **EOF handling:** Always check for `pexpect.EOF` or `pexpect.TIMEOUT` in expect lists
- **Unicode:** Use `encoding='utf-8'` parameter or handle bytes explicitly

---

### 4. Node.js `node-pty`

**Overview:** Node.js bindings for pseudo-terminal operations. Industry-standard for terminal emulators (VS Code terminal, Hyper, etc.).

#### Basic Usage

```javascript
const pty = require('node-pty');
const os = require('os');

const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';

// Spawn process with PTY
const ptyProcess = pty.spawn(shell, [], {
  name: 'xterm-color',
  cols: 80,
  rows: 30,
  cwd: process.env.HOME,
  env: process.env
});

// Handle output
ptyProcess.onData((data) => {
  process.stdout.write(data);
});

// Send input
ptyProcess.write('ls -la\r');

// Resize (important for full-screen apps)
ptyProcess.resize(100, 40);

// Cleanup
ptyProcess.kill();
```

#### Advanced: Interactive + Logging

```javascript
const pty = require('node-pty');
const fs = require('fs');

function spawnWithLogging(command, args, logPath) {
  const logStream = fs.createWriteStream(logPath, { flags: 'a' });
  
  const ptyProcess = pty.spawn(command, args, {
    name: 'xterm-256color',
    cols: process.stdout.columns || 80,
    rows: process.stdout.rows || 30,
    cwd: process.cwd(),
    env: process.env
  });

  // Bidirectional I/O with logging
  ptyProcess.onData((data) => {
    process.stdout.write(data);
    logStream.write(data);
  });

  process.stdin.on('data', (data) => {
    ptyProcess.write(data);
    logStream.write(`[INPUT] ${data}`);
  });

  // Handle resize
  process.stdout.on('resize', () => {
    ptyProcess.resize(
      process.stdout.columns,
      process.stdout.rows
    );
  });

  ptyProcess.onExit(({ exitCode, signal }) => {
    logStream.end();
    console.log(`\nProcess exited: code=${exitCode}, signal=${signal}`);
  });

  return ptyProcess;
}

// Usage
const child = spawnWithLogging('droid', ['exec', 'task'], 'session.log');
```

#### Cross-Platform Considerations

```javascript
const os = require('os');
const pty = require('node-pty');

const platform = os.platform();

let shell, args;
if (platform === 'win32') {
  shell = 'powershell.exe';  // or 'cmd.exe'
  args = [];
} else {
  shell = process.env.SHELL || '/bin/bash';
  args = [];
}

const ptyProcess = pty.spawn(shell, args, {
  name: platform === 'win32' ? 'windows-256color' : 'xterm-256color',
  // ... other options
});
```

#### Pitfalls

- **Native module:** Requires compilation (node-gyp); breaks on platform/Node version changes
- **Windows support:** Limited compared to Unix; ConPTY is newer and has quirks
- **Zombie processes:** Always attach exit handlers and call `kill()`
- **Memory leaks:** Detach event listeners when done:

```javascript
const dataHandler = (data) => { /* ... */ };
ptyProcess.onData(dataHandler);

// Later, cleanup
ptyProcess.removeListener('data', dataHandler);
ptyProcess.kill();
```

---

### 5. Go `creack/pty`

**Overview:** Lightweight, cross-platform PTY library for Go. Used by Docker, Kubernetes, and many terminal tools.

#### Basic Example

```go
package main

import (
    "io"
    "os"
    "os/exec"

    "github.com/creack/pty"
)

func main() {
    c := exec.Command("bash")
    
    // Start with PTY
    ptmx, err := pty.Start(c)
    if err != nil {
        panic(err)
    }
    defer ptmx.Close()
    
    // Copy I/O
    go io.Copy(ptmx, os.Stdin)
    io.Copy(os.Stdout, ptmx)
}
```

#### Advanced: Full Shell Emulation

```go
package main

import (
    "io"
    "log"
    "os"
    "os/exec"
    "os/signal"
    "syscall"

    "github.com/creack/pty"
    "golang.org/x/term"
)

func main() {
    c := exec.Command("droid")

    // Start with PTY
    ptmx, err := pty.Start(c)
    if err != nil {
        log.Fatal(err)
    }
    defer func() { _ = ptmx.Close() }()

    // Handle window size changes
    ch := make(chan os.Signal, 1)
    signal.Notify(ch, syscall.SIGWINCH)
    go func() {
        for range ch {
            if err := pty.InheritSize(os.Stdin, ptmx); err != nil {
                log.Printf("error resizing pty: %s", err)
            }
        }
    }()
    ch <- syscall.SIGWINCH // Initial resize

    // Set stdin to raw mode
    oldState, err := term.MakeRaw(int(os.Stdin.Fd()))
    if err != nil {
        panic(err)
    }
    defer func() { _ = term.Restore(int(os.Stdin.Fd()), oldState) }()

    // Bidirectional I/O
    go func() { _, _ = io.Copy(ptmx, os.Stdin) }()
    _, _ = io.Copy(os.Stdout, ptmx)
}
```

#### Pitfalls

- **Raw mode:** Must restore terminal state on exit (use `defer`)
- **Signal propagation:** Child may not receive Ctrl+C; set up signal forwarding
- **Non-blocking I/O:** For deadlines/timeouts, call `syscall.SetNonblock` manually

---

### 6. Docker `-it` Flags

**Overview:** Docker's standard way to allocate PTY for containerized interactive programs.

#### Usage

```bash
# -i: Keep STDIN open
# -t: Allocate pseudo-TTY
docker run -it ubuntu bash

# Run interactive command in existing container
docker exec -it my-container /bin/bash

# Detach without killing: Ctrl+P, Ctrl+Q
```

#### Advanced: Logging + Interaction

```bash
# 1. Run with logging
docker run -it --name session ubuntu bash 2>&1 | tee session.log

# 2. View logs later
docker logs session

# 3. Attach to running container (gets PTY automatically if -t was used)
docker attach session

# 4. Debugging: see raw TTY allocation
docker inspect session | grep -i tty
```

#### Pitfalls

- **Log driver conflicts:** Some log drivers (json-file) conflict with `-t` flag
- **Detach sequence:** Default is Ctrl+P, Ctrl+Q; may conflict with application shortcuts
- **Exit on detach:** Without `--sig-proxy=false`, Ctrl+C kills container

---

### 7. Expect (TCL)

**Overview:** The original automation tool by Don Libes (1990). Still widely used for legacy systems and complex automation.

#### Basic Pattern

```tcl
#!/usr/bin/expect -f

set timeout 60

# Spawn interactive program
spawn droid

# Automation sequence
expect "What is your name?"
send "Alice\r"

expect "Choose methodology:"
send "agile\r"

expect eof
```

#### Advanced: Logging + Error Handling

```tcl
#!/usr/bin/expect -f

# Logging
log_file -a session.log
log_user 1  # Echo to stdout

set timeout 120

spawn droid exec "onboarding task"

expect {
    -re "password:" {
        send "$env(MY_PASSWORD)\r"
        exp_continue
    }
    -re "Choose.*methodology" {
        send "tdd\r"
        exp_continue
    }
    timeout {
        puts "ERROR: Timeout waiting for expected output"
        exit 1
    }
    eof {
        puts "Session completed successfully"
    }
}

# Capture exit code
lassign [wait] pid spawnid os_error_flag exit_code
exit $exit_code
```

#### Real-World: SSH Automation

```tcl
#!/usr/bin/expect -f

set timeout 30
set host [lindex $argv 0]
set username [lindex $argv 1]
set password [lindex $argv 2]

spawn ssh $username@$host

expect {
    "Are you sure you want to continue connecting" {
        send "yes\r"
        exp_continue
    }
    "password:" {
        send "$password\r"
    }
}

expect "$ "
send "sudo systemctl restart nginx\r"

expect "password for"
send "$password\r"

expect "$ "
send "exit\r"

expect eof
```

#### Pitfalls

- **Regex performance:** TCL regex can be slow; use `-ex` for exact matches
- **Timeout handling:** Always include timeout case in expect blocks
- **TCL syntax:** Archaic; harder to maintain than Python/JavaScript alternatives
- **Debugging:** Use `exp_internal 1` to see what Expect is matching

---

## Comparative Matrix

| Tool | Language | Platform | Complexity | Best For |
|------|----------|----------|------------|----------|
| `script` | Shell | Unix | Low | Quick recording, CI/CD |
| Python `pty` | Python | Unix | Medium | Custom automation logic |
| `pexpect` | Python | Unix/Windows* | Low | Rapid prototyping, testing |
| `node-pty` | Node.js | Cross-platform | Medium | Embedding in Node apps |
| Go `pty` | Go | Cross-platform | Medium | High-performance tools |
| Docker `-it` | Any | Docker | Low | Containerized workflows |
| Expect | TCL | Unix | Medium | Legacy systems, complex dialogues |

*pexpect Windows support is limited; use `pexpect.popen_spawn` for basic cases

---

## Transcript Capture Best Practices

### 1. Separate Input/Output Streams

**Why:** Easier to analyze automation behavior vs. program output.

```bash
# script (modern)
script --log-in input.log --log-out output.log -c "droid"

# pexpect
with open('input.log', 'w') as inp, open('output.log', 'w') as out:
    child.logfile_send = inp
    child.logfile_read = out
```

### 2. Timestamp Everything

```python
import time

def timestamped_log(data, logfile):
    timestamp = time.strftime('%Y-%m-%d %H:%M:%S')
    logfile.write(f"[{timestamp}] {data}\n")
```

### 3. Structured Logging (JSONL)

```python
import json
import time

def log_event(event_type, data, logfile):
    entry = {
        'timestamp': time.time(),
        'type': event_type,
        'data': data
    }
    logfile.write(json.dumps(entry) + '\n')
    logfile.flush()

# Usage
with open('session.jsonl', 'w') as log:
    log_event('spawn', {'command': 'droid'}, log)
    log_event('send', {'input': '/forge-start'}, log)
    log_event('output', {'text': 'Welcome to DroidForge'}, log)
```

### 4. Strip ANSI Codes (When Needed)

```python
import re

def strip_ansi(text):
    ansi_escape = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')
    return ansi_escape.sub('', text)

# Usage
clean_output = strip_ansi(raw_output)
```

```bash
# Shell alternative
cat output.log | col -b > clean.log
```

---

## Common Pitfalls & Solutions

### 1. Hanging on EOF

**Problem:** Program waits for input that never comes.

**Solution:**

```python
# pexpect: always check for EOF/TIMEOUT
child.expect([expected_pattern, pexpect.EOF, pexpect.TIMEOUT])
```

```bash
# script: ensure command exits cleanly
script -c "your-command < /dev/null" output.log
```

### 2. Buffering Issues

**Problem:** Output appears in bursts, not real-time.

**Solution:**

```python
# Force unbuffered output
child.logfile.flush()

# Or use -u flag for Python subprocesses
child = pexpect.spawn('python -u script.py')
```

```bash
# script: flush immediately
script -f output.log -c "your-command"
```

### 3. Terminal Size Mismatch

**Problem:** Full-screen apps (vim, tmux) render incorrectly.

**Solution:**

```python
import signal
import fcntl
import termios
import struct

def resize_pty(master_fd):
    s = struct.pack("HHHH", 0, 0, 0, 0)
    size = fcntl.ioctl(0, termios.TIOCGWINSZ, s)
    fcntl.ioctl(master_fd, termios.TIOCSWINSZ, size)

signal.signal(signal.SIGWINCH, lambda sig, frame: resize_pty(master_fd))
```

### 4. Signal Handling

**Problem:** Ctrl+C doesn't reach child process.

**Solution:**

```python
# pexpect: use interact() for user control
child.interact()

# pty: set up signal forwarding
import signal
signal.signal(signal.SIGINT, lambda sig, frame: child.kill(signal.SIGINT))
```

### 5. Race Conditions

**Problem:** Sending input before program is ready.

**Solution:**

```python
# Always wait for prompt
child.expect('Ready>')
child.sendline('command')

# NOT this:
child.sendline('command')  # May be sent too early!
```

### 6. Exit Code Propagation

**Problem:** Automation succeeds even when child fails.

**Solution:**

```bash
# script: propagate exit code
script -e -c "your-command" output.log
exit_code=$?
```

```python
# pexpect: check exit status
child.close()
if child.exitstatus != 0:
    raise RuntimeError(f"Command failed with code {child.exitstatus}")
```

---

## CI/CD Specific Considerations

### GitHub Actions

```yaml
# Problem: No TTY by default
- name: Run interactive script
  run: script -q -c "your-command" output.log
  
# Or use expect
- name: Automate with expect
  run: expect automation.exp
```

### GitLab CI

```yaml
# Use script for TTY allocation
test:
  script:
    - script -q -c "npm run interactive-test" ci-log.txt
```

### Jenkins

```groovy
// Use Expect plugin or script command
sh 'script -q -c "droid exec task" jenkins-log.txt'
```

### Docker in CI

```yaml
# Allocate PTY in CI container
- docker run -it --rm my-image /bin/bash -c "interactive-command"
```

---

## Security Considerations

### 1. Credential Logging

**Problem:** Passwords/secrets appear in transcripts.

**Solution:**

```python
# Disable logging for sensitive input
child.logfile = None
child.sendline(secret_password)
child.logfile = original_logfile
```

```bash
# Expect: use stty -echo
send "stty -echo\r"
expect "$ "
send "$password\r"
send "stty echo\r"
```

### 2. Log File Permissions

```bash
# Restrictive permissions
touch session.log
chmod 600 session.log  # Owner read/write only
```

### 3. Sanitize Before Sharing

```python
import re

def sanitize_log(logfile):
    with open(logfile, 'r') as f:
        content = f.read()
    
    # Remove common secret patterns
    sanitized = re.sub(r'password[=:]\s*\S+', 'password=REDACTED', content, flags=re.IGNORECASE)
    sanitized = re.sub(r'token[=:]\s*\S+', 'token=REDACTED', sanitized, flags=re.IGNORECASE)
    
    return sanitized
```

---

## DroidForge-Specific Implementation

Your current UAT script demonstrates best practices:

```bash
# scripts/uat excerpt
if [[ ! -t 0 ]]; then
  error "stdin is not a TTY. Run 'uat' from an interactive terminal."
  exit 2
fi
```

### Recommended Approach

For automated testing with transcript capture:

```bash
#!/usr/bin/env bash
# Enhanced UAT with script-based logging

script -q -f -c "droid" "$HOME/.factory/sessions/uat-$(date +%s).log"
```

For programmatic automation:

```python
# Python automation harness
import pexpect
import sys

child = pexpect.spawn('droid', encoding='utf-8', timeout=300)
child.logfile_read = sys.stdout

try:
    child.expect('>')
    child.sendline('/forge-start')
    
    child.expect('What is your project name?')
    child.sendline('Test Project')
    
    # ... continue automation ...
    
    child.expect(pexpect.EOF)
finally:
    child.close()
    print(f"Exit code: {child.exitstatus}")
```

---

## References

- **Unix script(1):** https://man7.org/linux/man-pages/man1/script.1.html
- **Python pty:** https://docs.python.org/3/library/pty.html
- **pexpect:** https://pexpect.readthedocs.io/
- **node-pty:** https://github.com/microsoft/node-pty
- **creack/pty:** https://github.com/creack/pty
- **Expect:** https://core.tcl-lang.org/expect/

---

## Summary Recommendations

1. **Quick recording (CI/CD):** Use `script -q -c "command" log.txt`
2. **Python automation:** Use `pexpect` for rapid development
3. **Node.js embedding:** Use `node-pty` for terminal emulators
4. **High-performance Go tools:** Use `creack/pty`
5. **Legacy systems:** Use `expect` (TCL)
6. **Always:** Handle EOF/TIMEOUT, propagate exit codes, sanitize logs
