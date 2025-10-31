# DroidForge UAT Workflow

There is now **one** supported path for spinning up a clean manual test session:

```
~/code/DroidForge/scripts/uat
```

(An alias named `uat` points at that script, so you can just type `uat` from any shell.)

The script performs the exact prep that lived across the old Expect/bash fragments:

1. **Clean slate** – runs `~/.factory/cleanup-droidtest.sh` if it exists, otherwise purges `.droidforge`, generated docs, and droid directories in the target repo.  
2. **Install or reuse DroidForge** – installs `droidforge@latest` globally unless you set `DF_UAT_SKIP_INSTALL=1` (useful when you already npm-linked a local build).  
3. **Refresh MCP registration** – removes any stale entry and re-adds the stdio server via `droid mcp add droidforge droidforge-mcp-server --type stdio`.  
4. **Launch the CLI** – enters `~/code/droidtest` (or another repo you point it at) and execs `droid`, handing control to you. The banner reminds you to run `/forge-start`.

## Usage

```bash
# default (cleans, installs latest, launches in ~/code/droidtest)
uat

# skip npm install step (after npm link / local build)
DF_UAT_SKIP_INSTALL=1 uat

# run against a different repo
DF_UAT_REPO=~/code/another-playground uat
```

Logs from the pre-flight steps are captured under `~/.factory/uat/<timestamp>-prep.log` in case you need to check what happened before `droid` launched.

## Optional: Automated Guard Rail

`npm run uat` still runs the TypeScript harness (`scripts/uat-onboarding-flow.ts`). That path does **not** launch `droid`; it just exercises the scripted onboarding flow and fails if any of the gates regress (vision follow-ups, checklist order, roster forging, etc.). Keep using it for quick smoke checks, then use `uat` when you want a clean interactive session.

## What Was Removed

- `scripts/automated-uat.exp`  
- `scripts/automated-uat2.exp`  
- `scripts/tmp_rovodev_run-uat.sh`  
- `scripts/tmp_rovodev_uat-setup.sh`

Those files scattered the workflow across multiple entry points and generated root-level transcripts. Everything above replaces them with a single maintained experience.

### Add More Checkpoints

Add after existing checkpoints:

```tcl
# New checkpoint: Check for specific recommendation
expect {
    -re "TDD.*physics" {
        log_output "✓ Intelligent recommendation for game"
        set checkpoint_smart "PASS"
    }
    timeout {
        log_output "✗ No smart recommendation"
        set checkpoint_smart "FAIL"
    }
}
```

### Debug Mode

Run with expect debug output:

```bash
expect -d scripts/automated-uat.exp
```

## Common Issues

### "spawn: command not found"

**Problem:** `expect` not installed

**Solution:**
```bash
sudo apt-get install expect
```

### "timeout" on every checkpoint

**Problem:** Droid not launching or responding

**Solutions:**
```bash
# 1. Check droid works manually:
droid

# 2. Increase timeout in script:
set timeout 300  # 5 minutes

# 3. Check MCP server is actually installed:
/mcp list
```

### Script exits immediately

**Problem:** cleanup-droidtest.sh not found

**Solution:**
```bash
# Create the cleanup script or edit this line:
set cleanup_script "/path/to/your/cleanup-script.sh"
```

### "Permission denied"

**Problem:** Script not executable

**Solution:**
```bash
chmod +x scripts/automated-uat.exp
```

## Advanced: Writing Your Own Expect Scripts

### Example 1: Simple Test

```tcl
#!/usr/bin/expect -f

spawn droid
expect ">"
send "/forge-start\r"

expect {
    "DroidForge" {
        puts "SUCCESS: DroidForge responded"
        exit 0
    }
    timeout {
        puts "FAIL: No response"
        exit 1
    }
}
```

### Example 2: Loop Through Choices

```tcl
# Test all 10 methodologies
for {set i 1} {$i <= 10} {incr i} {
    spawn droid
    expect ">"
    send "/forge-start\r"
    
    # ... wait for methodology prompt ...
    
    send "$i\r"
    
    expect {
        "SELECT_METHODOLOGY" {
            puts "Methodology $i: PASS"
        }
        timeout {
            puts "Methodology $i: FAIL"
        }
    }
    
    # Exit droid
    send "\x03"
    expect eof
}
```

### Example 3: Capture and Validate Output

```tcl
# Capture output into variable
expect -re "methodology: (.*)\r" {
    set methodology $expect_out(1,string)
    puts "Selected: $methodology"
    
    if {$methodology == "tdd"} {
        puts "✓ Correct methodology"
    } else {
        puts "✗ Wrong methodology: $methodology"
    }
}
```

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: DroidForge UAT

on: [push, pull_request]

jobs:
  uat:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install Expect
        run: sudo apt-get install -y expect
      
      - name: Install Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Run UAT
        run: |
          chmod +x scripts/automated-uat.exp
          ./scripts/automated-uat.exp
      
      - name: Upload Report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: uat-report
          path: uat-report-*.md
```

## Learning Resources

- [Expect Manual](https://www.tcl.tk/man/expect5.31/expect.1.html)
- [Expect Tutorial](https://www.admin-magazine.com/Articles/Automating-with-Expect-Scripts)
- [Expect Examples](https://wiki.tcl-lang.org/page/Expect)

## Troubleshooting Tips

1. **Add debug output:**
   ```tcl
   exp_internal 1  # At top of script
   ```

2. **See what expect sees:**
   ```tcl
   log_user 1  # Show all output
   ```

3. **Increase verbosity:**
   ```tcl
   set exp_internal_logfile "debug.log"
   exp_internal 1
   ```

4. **Test patterns interactively:**
   ```bash
   expect -c 'spawn droid; interact'
   ```

## Next Steps

1. ✅ Run the script: `./scripts/automated-uat.exp`
2. 📊 Review the generated report
3. 🔧 Fix any failing tests
4. 🔄 Re-run until 100% pass rate
5. 📝 Add more test scenarios as needed

---

**Questions or Issues?**
- Check the transcript file for detailed output
- Enable debug mode: `expect -d scripts/automated-uat.exp`
- Manually test the flow to compare behavior
