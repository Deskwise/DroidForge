# Publishing DroidForge to npm

## Quick Fix (Local)
1. Ensure you are logged in: `npm login`
   - If your account uses 2FA for publishing, run: `npm publish --otp <CODE>`
2. Verify auth: `npm whoami`
3. Publish: `npm publish --access public`

## Token-based Auth (Recommended)
Use an npm automation token and `.npmrc` with environment variable.

1. Create an npm Automation Token in your npm account settings
2. Copy `.npmrc.example` to `.npmrc`:

```
//registry.npmjs.org/:_authToken=${NPM_TOKEN}
registry=https://registry.npmjs.org/
always-auth=true
```

3. Export the token in your shell:

```
export NPM_TOKEN=your-token-here
```

4. Publish:

```
npm publish --access public
```

## 2FA Considerations
- If your account enforces 2FA for publish, use OTP: `npm publish --otp <CODE>`
- For CI, prefer an Automation Token (no OTP). Store as `NPM_TOKEN` secret.

## Troubleshooting
- Error: `ENEEDAUTH` → Login or set NPM_TOKEN
- Error: `deprecations must be strings` → Try again after auth. If persists:
  - Ensure `package.json` does not include a `deprecated` or `deprecations` field that is not a string
  - Clear cache: `npm cache clean --force`
  - Update npm: `npm i -g npm@latest`
- Dry run: `npm publish --dry-run`

## GitHub Actions Release
The `.github/workflows/release.yml` workflow can publish on tags. Ensure repository secrets:
- `NPM_TOKEN` (npm automation token)
- `NODE_AUTH_TOKEN` (alias to NPM_TOKEN if workflow uses this)

Then push a tag like `v1.7.0` to trigger.
