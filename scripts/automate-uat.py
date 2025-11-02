#!/usr/bin/env python3
"""
WARNING: This script used to automate the interactive CLI onboarding flow.
The interactive CLI uses a command-palette UI and non-deterministic LLM prompts
which make PTY automation fragile and high-maintenance. This file has been
replaced with a short stub that points users to the reliable MCP e2e tests.

If you really need to experiment with CLI automation, see:
  scripts/experimental/automate-uat.py

Recommended automated UAT (fast, reliable):
  npm test -- src/mcp/__tests__/e2e/onboarding.e2e.test.ts
"""

import sys

print("This script is deprecated and archived. Use MCP e2e tests instead.")
sys.exit(0)
    repo_path = Path(args.repo).resolve()
    if not repo_path.exists():
        print(f"ERROR: Repository not found: {repo_path}", file=sys.stderr)
        sys.exit(1)
    
    # Ensure log directory exists
    log_dir = Path(args.log_dir)
    log_dir.mkdir(parents=True, exist_ok=True)
    
    # Run automation
    exit_code, session_path, transcript_path = run_uat_automation(
        args.scenario,
        str(repo_path),
        str(log_dir),
        args.timeout
    )
    
    print("\n" + "=" * 60)
    print("UAT Automation Summary")
    print("=" * 60)
    print(f"Scenario:    {args.scenario}")
    print(f"Exit Code:   {exit_code}")
    print(f"Transcript:  {transcript_path}")
    if session_path:
        print(f"Session:     {session_path}")
    print("=" * 60)
    
    sys.exit(exit_code)


if __name__ == '__main__':
    main()
