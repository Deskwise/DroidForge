# Performance Monitoring

## Analyzing Tool Performance

After running onboarding sessions, analyze performance:

```bash
npm run analyze
```

By default this reads from `~/.factory/droidforge/logs` directory. To analyze a specific file or directory, pass a path:

```bash
npm run analyze ~/.factory/droidforge/logs
```

## Interpreting Results

- **Avg(ms)**: Average execution time - watch for increases over time
- **Max(ms)**: Worst-case latency - should stay under 100ms for most tools
- **Errors**: Failed calls - investigate any non-zero counts

## Performance Targets

| Tool | Target Avg | Target Max |
|------|------------|------------|
| smart_scan (cached) | <10ms | <20ms |
| smart_scan (fresh) | <150ms | <300ms |
| record_onboarding_data | <5ms | <10ms |
| select_methodology | <5ms | <10ms |
| forge_roster | <50ms | <100ms |

## Regression Detection

Run analysis before and after code changes:

```bash
# Before changes
npm run analyze > before.txt

# Make changes, rebuild, test
npm run build && npm link
uat  # Complete a test session

# After changes
npm run analyze > after.txt

# Compare
diff before.txt after.txt
```

## Example Output

```
=== DroidForge Performance Report ===

Tool                          Calls  Errors  Avg(ms)  Min(ms)  Max(ms)
───────────────────────────────────────────────────────────────────────────
smart_scan                        2       0     55.0      10.0    100.0
forge_roster                      1       0     17.0      17.0     17.0
generate_user_guide               1       0     18.0      18.0     18.0
get_onboarding_progress           1       0     13.0      13.0     13.0
install_commands                  1       0     10.0      10.0     10.0
record_onboarding_data            4       0      3.0       1.0      7.0
select_methodology                3       3      0.0       0.0      0.0 (3 errors)
recommend_droids                  1       0      1.0       1.0      1.0
```

Key insights:
- `select_methodology` has 100% error rate (3/3 calls failed)
- `smart_scan` shows one cached (10ms) and one fresh (100ms) execution
- Most tools complete in <20ms
