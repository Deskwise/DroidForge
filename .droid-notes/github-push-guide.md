# GitHub Push Guide for Droid Remote Environment

## Problem
When trying to push to GitHub using `git push`, you get:
```
fatal: could not read Username for 'https://github.com': No such device or address
```

## Solution
Configure git to use GitHub CLI (`gh`) as the credential helper:

```bash
# Set up credential helper (one-time setup)
git config --global credential.helper '!gh auth git-credential'

# Then push normally
git push -u origin <branch-name>
```

## Why This Works
- The remote environment has GitHub CLI (`gh`) pre-authenticated
- Regular git commands don't have direct credential access
- The `gh auth git-credential` command bridges git and gh authentication

## Full Workflow Example
```bash
# 1. Create feature branch
git checkout -b feature/my-feature

# 2. Make changes and commit
git add .
git commit -m "feat: Add new feature"

# 3. Configure credential helper (if not already set)
git config --global credential.helper '!gh auth git-credential'

# 4. Push branch
git push -u origin feature/my-feature

# 5. Create PR using GitHub CLI
gh pr create \
  --base develop \
  --head feature/my-feature \
  --title "feat: Add new feature" \
  --body "Description of changes"
```

## Verify Authentication
```bash
# Check gh is authenticated
gh auth status

# Should show: ✓ Logged in to github.com
```

## Remember
- Always configure credential helper BEFORE first push attempt
- Use `gh pr create` for creating PRs programmatically
- The environment already has gh authenticated - just need to wire it up to git

---
Created: 2025-10-23
Last Updated: 2025-10-23
