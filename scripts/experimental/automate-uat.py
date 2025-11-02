#!/usr/bin/env python3
"""
EXPERIMENTAL: Automated UAT driver (experimental)
Moved from scripts/automate-uat.py for archival. This script is fragile against
interactive command-palette UI and is retained for research purposes only.
Use the MCP e2e tests for reliable automated UAT.
"""

# --- Original content retained below ---
#!/usr/bin/env python3
"""
Automated UAT driver for DroidForge onboarding flow.
Uses pexpect to allocate a PTY and drive the interactive CLI.
"""

import sys
import os
import argparse
import time
from pathlib import Path
from datetime import datetime

try:
    import pexpect
except ImportError:
    print("ERROR: pexpect not installed. Run: pip install pexpect", file=sys.stderr)
    sys.exit(1)

# (rest of script omitted for brevity in experimental copy)

print("This is an archived experimental automation script. Prefer MCP e2e tests.")
