# DroidForge UAT Automation with Expect

## What is Expect?

**Expect** is a tool for automating interactive command-line programs. Think of it as a robot that:
1. Types commands for you
2. Reads the screen output
3. Responds based on what it sees
4. Makes decisions based on patterns

It's perfect for automating testing of CLI tools like DroidForge!

## Installation

```bash
# Ubuntu/Debian
sudo apt-get install expect

# macOS
brew install expect

# Already installed? Check version:
expect -v
```

## How Expect Works (5-Minute Tutorial)

### Basic Syntax

```tcl
#!/usr/bin/expect -f

# 1. SPAWN: Start a program
spawn droid

# 2. EXPECT: Wait for specific output
expect ">"

# 3. SEND: Type a command (with \r for Enter)
send "/forge-start\r"

# 4. EXPECT (again): Wait for response
expect "What are you building"

# 5. SEND (again): Respond
send "My project description\r"

# 6. EOF: Wait for program to finish
expect eof
```

### Key Expect Commands

| Command | What It Does | Example |
|---------|--------------|---------|
| `spawn` | Launch a program | `spawn droid` |
| `expect` | Wait for text pattern | `expect ">"` |
| `send` | Type text + enter | `send "hello\r"` |
| `expect eof` | Wait for program exit | `expect eof` |
| `set timeout` | Max wait time | `set timeout 30` |

### Pattern Matching

Expect supports different pattern types:

```tcl
# 1. Exact string match
expect "Hello World"

# 2. Regex pattern (use -re flag)
expect -re "Project (type|kind|description)"

# 3. Multiple possibilities
expect {
    "Success" {
        puts "It worked!"
    }
    "Error" {
        puts "It failed!"
    }
    timeout {
        puts "Took too long"
    }
}
```

### Special Characters

```tcl
send "\r"     # Enter key
send "\x03"   # Ctrl+C
send "\t"     # Tab
send "\x1b"   # Escape
```

## Running the UAT Script

### Prerequisites

1. **cleanup-droidtest.sh must exist:**
   ```bash
   ls ~/.factory/cleanup-droidtest.sh
   ```

2. **droidtest repository must exist:**
   ```bash
   ls ~/code/droidtest
   ```

3. **Make script executable:**
   ```bash
   chmod +x scripts/automated-uat.exp
   ```

### Run Full UAT

```bash
cd ~/code/DroidForge
./scripts/automated-uat.exp
```

**What happens:**
1. ✨ Cleans up previous test runs
2. 📦 Installs latest DroidForge from npm
3. ❌ Tests MCP error message (without MCP installed)
4. ⚙️ Installs MCP server
5. 🚀 Runs full onboarding flow with test data
6. 📊 Generates detailed test report
7. 📝 Saves complete transcript

### Output Files

After running, you'll find:

```
reports/
├── uat-report-20251028-143022.md      # Test results summary
└── uat-transcript-20251028-143022.log # Complete console output
```

**Report contains:**
- ✅ Pass/Fail for each checkpoint
- 📊 Overall pass rate
- 🔍 Links to transcript for debugging
- 📋 Next steps recommendations

## Understanding the Test Checkpoints

The script validates 12 critical checkpoints:

### 1. **MCP Error Message** (Friendly)
- ✅ Shows: "💡 DroidForge Setup Required"
- ❌ Fails if: "ERROR: DroidForge MCP Server Not Registered"

### 2. **GET_STATUS Tool**
- ✅ Called at start of /forge-start

### 3. **SMART_SCAN Tool**
- ✅ Scans repository after status check

### 4. **Project Description Prompt**
- ✅ Asks: "What are you building?"

### 5. **RECORD_PROJECT_GOAL Tool**
- ✅ Records user's project description

### 6. **Methodology Names (Not Roles)**
- ✅ Shows: "1. Agile / Scrum"
- ❌ Fails if: "1. Sprint Coordinator"

### 7. **Recommendation Format**
- ✅ Uses consistent naming: "#2 TDD" or "Test-Driven Development"

### 8. **SELECT_METHODOLOGY Tool**
- ✅ Called after user selects methodology

### 9. **RECOMMEND_DROIDS Tool**
- ✅ Recommends specialist droid team

### 10. **Custom Droids Prompt**
- ✅ Asks about team customizations

### 11. **FORGE_ROSTER Tool**
- ✅ Creates the droid team

### 12. **Onboarding Completion**
- ✅ Shows completion message

## Customizing the Script

### Change Test Data

Edit these variables at the top:

```tcl
set project_description "Your test project description"
set methodology_choice "5"  # Kanban instead of TDD
set timeout 180  # Increase timeout to 3 minutes
```

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
