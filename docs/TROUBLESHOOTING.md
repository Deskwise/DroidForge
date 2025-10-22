# DroidForge Troubleshooting Guide

## 🚨 Common Issues and Solutions

This guide helps you resolve common problems with DroidForge.

##  Installation Issues

### "Command not found: droidforge"

**Problem:** DroidForge command is not available after installation.

**Solutions:**
```bash
# Check if globally installed
npm list -g droidforge

# If not installed globally
npm install -g droidforge

# Check npm global path
npm config get prefix
# Add this to your PATH if missing

# Alternative: Use npx
npx droidforge --help
```

### "Permission denied" errors

**Problem:** Can't install DroidForge due to permissions.

**Solutions:**
```bash
# Fix npm permissions
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH

# Or use npx (no installation needed)
npx droidforge init
```

### Node.js version compatibility

**Problem:** DroidForge requires newer Node.js version.

**Solutions:**
```bash
# Check current version
node --version

# Use Node.js 16+ (recommended 18+)
nvm install 18
nvm use 18
npm install -g droidforge
```

##  Initialization Issues

### "Global orchestrator installation failed"

**Problem:** Error during `droidforge init` when installing orchestrator.

**Solutions:**
```bash
# Check directory permissions
ls -la ~/.droidforge/

# Create directory manually
mkdir -p ~/.droidforge/droids

# Force reinstall
droidforge init --force

# Check if orchestrator file exists
ls -la ~/.droidforge/droids/orchestrator.md
```

### "Project brief creation failed"

**Problem:** Can't create `.droidforge/project-brief.yaml`.

**Solutions:**
```bash
# Check directory structure
mkdir -p .droidforge

# Check permissions
ls -la .droidforge/

# Try manual creation
echo "project:" > .droidforge/project-brief.yaml

# Retry initialization
droidforge init --force
```

## 🗣 Interview Issues

### "Interview process seems stuck"

**Problem:** Interview prompts not appearing or responding.

**Solutions:**
```bash
# Cancel and restart
Ctrl+C
droidforge synthesize

# Use verbose mode
DEBUG=droidforge:* droidforge synthesize

# Check if project brief exists
ls -la .droidforge/project-brief.yaml

# Remove corrupted brief and retry
rm .droidforge/project-brief.yaml
droidforge synthesize
```

### "Invalid project brief structure"

**Problem:** YAML validation errors in project brief.

**Solutions:**
```bash
# Check YAML syntax
cat .droidforge/project-brief.yaml
# Or use:
yamllint .droidforge/project-brief.yaml

# Common issues:
# - Missing colons
# - Incorrect indentation
# - Missing quotes around special characters

# Regenerate with force flag
droidforge synthesize --force
```

##  Scanning Issues

### "No frameworks detected"

**Problem:** DroidForge doesn't recognize your project structure.

**Solutions:**
```bash
# Check what DroidForge sees
droidforge scan

# Ensure you have recognizable files:
# - package.json for Node.js
# - requirements.txt for Python
# - Cargo.toml for Rust
# - pom.xml for Java

# Add explicit framework indicators
echo '{"dependencies": {"express": "^4.18.0"}}' > package.json
droidforge scan
```

### "Script detection failed"

**Problem:** DroidForge doesn't find your build/deploy scripts.

**Solutions:**
```bash
# Check script detection
droidforge scan

# Ensure scripts directory exists
mkdir -p scripts
echo '#!/bin/bash\necho "Building..."' > scripts/build.sh
chmod +x scripts/build.sh

# Add npm scripts
npm pkg set scripts.build="tsc"
npm pkg set scripts.test="node --test"

# Rescan
droidforge scan
```

### "Performance is very slow"

**Problem:** DroidForge takes too long on large repositories.

**Solutions:**
```bash
# Use optimized scanning
droidforge synthesize --optimized

# Create .droidforgeignore file
echo "node_modules/\n.git/\ndist/\n*.log" > .droidforgeignore

# Clear cache if corrupted
rm -rf .droidforge/cache

# Limit scanning scope
# Move large unrelated folders outside project root
```

##  Droid Generation Issues

### "No droids generated"

**Problem:** Synthesis completes but no droid files are created.

**Solutions:**
```bash
# Check synthesis output
droidforge synthesize --dry-run

# Verify project brief exists
cat .droidforge/project-brief.yaml

# Check scan results
droidforge scan

# Ensure minimal project structure:
# - README.md or docs/prd/
# - package.json or equivalent
# - Source code directory

# Force regeneration
droidforge synthesize --force
```

### "Conflict resolution errors"

**Problem:** Droid generation stops due to unresolved conflicts.

**Solutions:**
```bash
# Check conflict report
droidforge synthesize --dry-run

# Manually resolve conflicts in .droidforge/droids/
# Each droid should have unique file patterns

# Remove conflicting droids and retry
rm .droidforge/droids/conflicting-droid.md
droidforge synthesize
```

### "Droid files are invalid"

**Problem:** Generated droid files have syntax errors.

**Solutions:**
```bash
# Check YAML frontmatter
head -20 .droidforge/droids/dev.md

# Common YAML issues:
# - Missing quotes in values
# - Incorrect indentation (use 2 spaces)
# - Missing required fields (name, role, tools, scope)

# Regenerate specific droid
rm .droidforge/droids/dev.md
droidforge synthesize --force
```

##  Factory CLI Integration Issues

### "factory: command not found"

**Problem:** Can't use generated droids with Factory CLI.

**Solutions:**
```bash
# Install Factory CLI
npm install -g @factory/cli

# Verify installation
factory --version

# Check droid recognition
factory droids list

# Alternative: Use direct file paths
factory use .droidforge/droids/dev.md "Hello world"
```

### "Droids not listed in Factory"

**Problem:** Factory CLI doesn't show your droids.

**Solutions:**
```bash
# Check droid directory
ls -la .droidforge/droids/

# Verify manifest
cat .droidforge/droids-manifest.json

# Check droid file format
head -10 .droidforge/droids/dev.md
# Must have YAML frontmatter with proper fields

# Regenerate manifest
droidforge init --force
```

### "Tool access denied errors"

**Problem:** Droids can't access files or run commands.

**Solutions:**
```bash
# Check droid permissions
cat .droidforge/droids/dev.md | grep "tools:"

# Ensure tools are properly formatted:
# tools: ["file:src/**/*", "command:npm run build"]

# Check file permissions
ls -la src/
chmod -R +r src/

# Update droid with correct tools
# Edit .droidforge/droids/dev.md manually
```

## 🧪 Testing Issues

### "Tests failing after droid changes"

**Problem:** Existing tests break after droid generation.

**Solutions:**
```bash
# Check what droids changed
git diff .droidforge/droids/

# Review test changes
git diff tests/

# Revert problematic changes
git checkout HEAD -- .droidforge/droids/problematic-droid.md

# Regenerate with conservative settings
droidforge synthesize --dry-run
# Review changes before applying
```

### "Integration tests not working"

**Problem:** End-to-end tests fail with new droids.

**Solutions:**
```bash
# Run specific test to see failure
npm test -- --grep "droid"

# Check test environment
DEBUG=droidforge:* npm test

# Mock droid interactions in tests
# Add test-specific droid configurations

# Update test expectations
# Droids may work differently than manual processes
```

##  Performance Issues

### "Memory usage too high"

**Problem:** DroidForge consumes excessive memory.

**Solutions:**
```bash
# Use optimized mode
droidforge synthesize --optimized

# Limit concurrent operations
export NODE_OPTIONS="--max-old-space-size=2048"
droidforge synthesize

# Clear cache regularly
rm -rf .droidforge/cache

# Use .droidforgeignore
echo "large-assets/\n*.mp4\nnode_modules/" > .droidforgeignore
```

### "Disk space running out"

**Problem:** DroidForge cache grows too large.

**Solutions:**
```bash
# Check cache size
du -sh .droidforge/cache/

# Clear old cache
rm -rf .droidforge/cache/*

# Set up automatic cache cleaning
# Add to package.json:
# "scripts": {
#   "clean-cache": "rm -rf .droidforge/cache/*"
# }

# Limit cache retention in droidforge config
echo '{"cache": {"maxAge": "7d", "maxSize": "100MB"}}' > .droidforgerc.json
```

##  Network Issues

### "Can't download orchestrator"

**Problem:** Network timeout during orchestrator installation.

**Solutions:**
```bash
# Check internet connection
curl -I https://raw.githubusercontent.com

# Use manual installation
mkdir -p ~/.droidforge/droids
curl -o ~/.droidforge/droids/orchestrator.md \
  https://raw.githubusercontent.com/Deskwise/DroidForge/main/droids/orchestrator.md

# Or use offline mode
export DROIDFORGE_OFFLINE=true
droidforge init
```

### "Proxy/firewall issues"

**Problem:** Corporate network blocks downloads.

**Solutions:**
```bash
# Configure npm proxy
npm config set proxy http://proxy.company.com:8080
npm config set https-proxy http://proxy.company.com:8080

# Use alternative registry
npm config set registry http://registry.npmjs.org/

# Manual mode
# Download orchestrator.md manually and place in ~/.droidforge/droids/
```

##  Configuration Issues

### "Custom configuration not working"

**Problem:** `.droidforgerc.json` settings ignored.

**Solutions:**
```bash
# Check config syntax
cat .droidforgerc.json
jsonlint .droidforgerc.json

# Verify config location
ls -la .droidforgerc.json ~/.droidforgerc.json

# Reset to defaults
rm .droidforgerc.json
droidforge init

# Use environment variables instead
export DROIDFORGE_CACHE_DIR=/tmp/droidforge-cache
export DROIDFORGE_LOG_LEVEL=debug
```

### "Environment variables not recognized"

**Problem:** Custom environment variables have no effect.

**Solutions:**
```bash
# Check available variables
env | grep DROIDFORGE

# Set variables properly
export DROIDFORGE_LOG_LEVEL=debug
export DROIDFORGE_CACHE_TTL=3600
export DROIDFORGE_MAX_CONCURRENT=4

# Verify with debug mode
DEBUG=droidforge:* droidforge scan

# Use .env file for project-specific settings
echo "DROIDFORGE_LOG_LEVEL=debug" > .env
```

## 🚨 Recovery Procedures

### Complete Reset

**When all else fails, perform a complete reset:**

```bash
# Backup current configuration
cp -r .droidforge .droidforge.backup

# Remove all DroidForge files
rm -rf .droidforge
rm AGENTS.md
rm docs/droid-guide.md
rm .droidforgeignore .droidforgerc.json

# Start fresh
droidforge init --force

# Restore if needed
rm -rf .droidforge
mv .droidforge.backup .droidforge
```

### Selective Recovery

**Recover specific components:**

```bash
# Regenerate only droids
rm .droidforge/droids/*
droidforge synthesize --force

# Regenerate only documentation
rm AGENTS.md docs/droid-guide.md
droidforge init

# Clear only cache
rm -rf .droidforge/cache
```

## 📞 Getting Help

### Debug Mode

Enable comprehensive logging:

```bash
# Full debug output
DEBUG=droidforge:* droidforge synthesize

# Specific component debugging
DEBUG=droidforge:scan droidforge scan
DEBUG=droidforge:analysis droidforge synthesize
DEBUG=droidforge:synthesis droidforge synthesize
```

### Report Issues

When reporting problems, include:

```bash
# System information
node --version
npm --version
droidforge --version

# Project structure
find . -maxdepth 2 -type f -name "*.json" -o -name "*.md" -o -name "*.yaml"

# Error details
droidforge synthesize 2>&1 | tee droidforge-error.log

# Debug output
DEBUG=droidforge:* droidforge synthesize > debug.log 2>&1
```

### Community Support

- [GitHub Issues](https://github.com/Deskwise/DroidForge/issues)
- [Discord Community](https://discord.gg/droidforge)
- [Documentation](https://docs.droidforge.ai/droidforge)

##  Prevention Tips

### Best Practices

1. **Regular Backups**: Back up `.droidforge/` directory regularly
2. **Version Control**: Commit `.droidforge/` to git (excluding cache)
3. **Incremental Updates**: Use `--dry-run` before major changes
4. **Performance Monitoring**: Use `--optimized` flag for large projects
5. **Documentation**: Keep `docs/droid-guide.md` updated

### Maintenance Schedule

```bash
# Weekly maintenance
droidforge reanalyze --dry-run  # Check for needed updates
rm -rf .droidforge/cache/*         # Clear old cache

# Monthly maintenance
droidforge synthesize --optimized  # Full regeneration
npm update droidforge              # Update DroidForge version

# After major project changes
droidforge reanalyze               # Update droids for new structure
```

---

**Still having issues?** Check the [Advanced Configuration Guide](./ADVANCED.md) or [Community Examples](https://github.com/Deskwise/DroidForge/examples) for more specific solutions.