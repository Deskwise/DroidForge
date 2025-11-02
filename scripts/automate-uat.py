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


# Canned UAT scenarios matching docs/project/uat-onboarding-scenarios.md
PROMPT_TIMEOUT = 300  # Increased for LLM processing time

SCENARIOS = {
    'saas': {
        'name': 'SaaS Analytics Dashboard',
        'projectVision': 'Build a multi-tenant analytics dashboard for marketing teams to track campaign performance in real time.',
        'targetAudience': 'Mid-sized marketing agencies serving retail clients.',
        'timelineConstraints': 'MVP in 10 weeks to align with industry conference debut.',
        'qualityVsSpeed': 'Favor quality—stakeholders expect polished UI and reliable data.',
        'teamSize': '6-person squad (PM, designer, 3 engineers, QA).',
        'experienceLevel': 'Mostly mid-level developers new to data visualization.',
        'budgetConstraints': '$180K cap for initial launch.',
        'deploymentRequirements': 'Cloud-hosted on AWS with multi-region redundancy.',
        'securityRequirements': 'Must be SOC 2–ready; enforce SSO and audit logging.',
        'scalabilityNeeds': 'Support 500 concurrent agency accounts with bursty load.',
        'methodology': 'agile',
        'successSignal': 'Marketing leads trust the dashboards and celebrate real-time insights.',
        'summaryConfirmation': 'Looks good.',
        'experienceChoice': '2',
        'qualityChoice': '2',
        'budgetChoice': '2',
        'doubleCheckConfirmation': 'Looks good.',
        'methodologySelection': '1',
        'customDroids': ''
    },
    'mobile': {
        'name': 'Mobile Wellness Companion',
        'projectVision': 'Deliver a daily wellness companion app with habit tracking, mood journaling, and guided meditations.',
        'targetAudience': 'Busy professionals aged 25-40 seeking balance.',
        'timelineConstraints': 'Soft launch in 6 weeks, full release in 12.',
        'qualityVsSpeed': 'Balanced; ship quickly but maintain smooth UX.',
        'teamSize': '4 developers plus a part-time product designer.',
        'experienceLevel': 'Senior backend engineer, others junior mobile devs.',
        'budgetConstraints': 'Operating on $75K seed funding.',
        'deploymentRequirements': 'Native apps in Apple App Store and Google Play with separate CI pipelines.',
        'securityRequirements': 'HIPAA-lite mindset—encrypt mood journal entries and enforce secure auth.',
        'scalabilityNeeds': 'Start with 20K users, roadmap to 100K within a year.',
        'methodology': 'rapid',
        'successSignal': 'Users build lasting wellness habits through daily nudges and guided sessions.',
        'summaryConfirmation': 'Looks good.',
        'experienceChoice': '2',
        'qualityChoice': '3',
        'budgetChoice': '1',
        'doubleCheckConfirmation': 'Looks good.',
        'methodologySelection': '4',
        'customDroids': ''
    },
    'iot': {
        'name': 'Embedded IoT Firmware',
        'projectVision': 'Create firmware for an in-car sensor hub that aggregates tire pressure, temperature, and vibration data.',
        'targetAudience': 'Automotive OEMs integrating advanced driver telemetry.',
        'timelineConstraints': 'Hardware pilot in 16 weeks for 2026 model previews.',
        'qualityVsSpeed': 'Quality-critical; automotive validation requires zero regressions.',
        'teamSize': '5 engineers (2 embedded, 2 systems, 1 test) plus compliance officer.',
        'experienceLevel': 'Highly experienced in C/C++ but limited Rust exposure.',
        'budgetConstraints': '$320K allocated for firmware milestone.',
        'deploymentRequirements': 'Runs on ARM Cortex-M7 with OTA update support.',
        'securityRequirements': 'Must pass ISO 21434 threat assessments and secure boot.',
        'scalabilityNeeds': 'Firmware must handle 50 sensors per vehicle without latency spikes.',
        'methodology': 'tdd',
        'successSignal': 'OEM partners trust the telemetry stability during pilot programs.',
        'summaryConfirmation': 'Looks good.',
        'experienceChoice': '3',
        'qualityChoice': '2',
        'budgetChoice': '3',
        'doubleCheckConfirmation': 'Looks good.',
        'methodologySelection': '2',
        'customDroids': ''
    }
}


SPINNER_CHARS = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

NOISE_PATTERNS = [
    r'.*Thinking.*',
    r'.*Streaming.*',
    r'.*Invoking tools.*',
    r'.*Auto \(High\).*',
    r'.*Z\.AI.*',
    r'.*shift\+tab.*',
    r'.*IDE ◌.*',
    r'.*MCP .*',
    r'.*\? for help.*',
    r'.*\[⏱.*'
] + [rf'.*{char}.*' for char in SPINNER_CHARS]

PROMPT_SEQUENCE = [
    {
        'label': 'Project Vision',
        'key': 'projectVision',
        'patterns': [r'(?i)tell me about your project', r'Project Description & Context', r'what are you building']
    },
    {
        'label': 'Target Audience',
        'key': 'targetAudience',
        'patterns': [r'(?i)who.?s playing', r'Audience & match style', r'Who will be using']
    },
    {
        'label': 'Success Signal',
        'key': 'successSignal',
        'patterns': [r'(?i)what moments would make you high-five', r'Success signal', r'what would success look like']
    },
    {
        'label': 'Summary Confirmation',
        'key': 'summaryConfirmation',
        'patterns': [r'Confirm or correct my understanding', r'(?i)did I miss anything', r'Looks good']
    },
    {
        'label': 'Experience Level',
        'key': 'experienceChoice',
        'patterns': [r'(?i)how would you describe your coding experience', r'Your coding experience:', r'(?i)what level of experience']
    },
    {
        'label': 'Quality vs Speed',
        'key': 'qualityChoice',
        'patterns': [r'(?i)what.?s more important right now', r'Priority preference:', r'(?i)quality.*speed']
    },
    {
        'label': 'Security Requirements',
        'key': 'securityRequirements',
        'patterns': [r'(?i)any security requirements', r'Security requirements', r'(?i)security.*sensitive']
    },
    {
        'label': 'Deployment Requirements',
        'key': 'deploymentRequirements',
        'patterns': [r'(?i)where do you want to deploy', r'Deployment preferences', r'(?i)hosting']
    },
    {
        'label': 'Scalability Needs',
        'key': 'scalabilityNeeds',
        'patterns': [r'(?i)how many users do you expect', r'Scalability expectations', r'(?i)scale']
    },
    {
        'label': 'Budget Constraints',
        'key': 'budgetChoice',
        'patterns': [r'(?i)any budget constraints', r'Budget situation:', r'(?i)budget']
    },
    {
        'label': 'Team Size',
        'key': 'teamSize',
        'patterns': [r'(?i)are you solo or working with a team', r'Team size', r'(?i)team']
    },
    {
        'label': 'Timeline Constraints',
        'key': 'timelineConstraints',
        'patterns': [r'(?i)any timeline constraints', r'Timeline constraints', r'(?i)deadline']
    },
    {
        'label': 'Double Check Confirmation',
        'key': 'doubleCheckConfirmation',
        'patterns': [r'Quick double-check before we pick a methodology', r'Anything to correct or clarify', r'(?i)any adjustments']
    },
    {
        'label': 'Methodology Selection',
        'key': 'methodologySelection',
        'patterns': [r'(?i)choose your development approach', r'(?i)which methodology', r'(?i)would you like to proceed']
    },
    {
        'label': 'Custom Droids',
        'key': 'customDroids',
        'patterns': [r'Optional: Add Custom Specialist Droids', r'(?i)custom.*specialist']
    }
]

FINAL_PROMPTS = [
    {
        'label': 'Roster Build Start',
        'patterns': [r'Building your specialist droid team']
    },
    {
        'label': 'Roster Forge',
        'patterns': [r'Creating your specialist droids now']
    },
    {
        'label': 'Roster Complete',
        'patterns': [r'Done! Your specialist droid team is ready']
    }
]


def run_uat_automation(scenario_name, repo_path, log_dir, timeout=600):
    """
    Automate UAT onboarding flow using pexpect.
    
    Args:
        scenario_name: Key from SCENARIOS dict
        repo_path: Absolute path to test repository
        log_dir: Directory for session logs
        timeout: Max seconds to wait for prompts
    
    Returns:
        (exit_code, session_log_path, transcript_path)
    """
    if scenario_name not in SCENARIOS:
        raise ValueError(f"Unknown scenario: {scenario_name}. Choose from: {list(SCENARIOS.keys())}")
    
    scenario = SCENARIOS[scenario_name]
    timestamp = datetime.now().strftime('%Y%m%d-%H%M%S')
    
    # Prepare log files
    transcript_path = Path(log_dir) / f'uat-{scenario_name}-{timestamp}.log'
    session_json_pattern = f'{repo_path}/.droidforge/session/*.json'
    
    print(f"Starting UAT automation: {scenario['name']}")
    print(f"Repository: {repo_path}")
    print(f"Transcript: {transcript_path}")
    print(f"Scenario: {scenario_name}")
    print("-" * 60)
    
    # Spawn droid with PTY
    child = pexpect.spawn(
        'droid',
        cwd=repo_path,
        encoding='utf-8',
        timeout=timeout,
        echo=False
    )
    
    # Log everything to file (both input and output)
    with open(transcript_path, 'w') as log:
        child.logfile = log  # Captures both reads and writes
        
        try:
            def expect_prompt(patterns, label):
                combined = list(patterns) + NOISE_PATTERNS + [pexpect.TIMEOUT]
                print(f"  Waiting for: {label}")
                print(f"  Patterns: {patterns[:2]}")  # Debug: show first 2 patterns
                while True:
                    idx = child.expect(combined, timeout=PROMPT_TIMEOUT)
                    if idx < len(patterns):
                        print(f"  ✓ Matched pattern {idx}: {patterns[idx][:50]}")
                        print(f"  [DEBUG] child.before: {child.before[-200:] if child.before else 'None'}")
                        print(f"  [DEBUG] child.after: {child.after[:100] if child.after else 'None'}")
                        return child.after
                    if idx >= len(patterns) and idx < len(combined) - 1:
                        # Matched noise pattern, keep waiting
                        continue
                    if idx == len(combined) - 1:
                        print(f"  ✗ Timeout waiting for: {label}")
                        print(f"  Last 500 chars: {child.before[-500:]}")
                        raise pexpect.TIMEOUT(f'{label} prompt not found within timeout')

            def send_answer(value):
                text = '' if value is None else str(value)
                print(f"  Sending: {text[:100]}")
                print(f"  [DEBUG] Full value length: {len(text)} chars")
                child.sendline(text)
                time.sleep(1.0)  # Increased delay for LLM processing

            def advance_to_first_prompt():
                """Wait for first real prompt, dismissing any palette UI once."""
                # First, wait for droid to be fully ready
                try:
                    # Look for the actual first prompt text
                    first_prompt_patterns = PROMPT_SEQUENCE[0]['patterns']
                    print("Waiting for first onboarding prompt...")
                    idx = child.expect(first_prompt_patterns + [pexpect.TIMEOUT], timeout=60)
                    if idx < len(first_prompt_patterns):
                        print(f"✓ Found first prompt: {first_prompt_patterns[idx][:50]}")
                        return True
                    print("⚠ First prompt not found, may need palette dismissal")
                    # If we see palette UI, send Enter ONCE and wait again
                    child.send('\r')
                    time.sleep(2)
                    idx = child.expect(first_prompt_patterns + [pexpect.TIMEOUT], timeout=30)
                    if idx < len(first_prompt_patterns):
                        print(f"✓ Found first prompt after dismissal")
                        return True
                    return False
                except pexpect.TIMEOUT:
                    print("⚠ Timeout waiting for first prompt")
                    return False

            # Wait for droid to be ready
            print("Waiting for Droid prompt...")
            child.expect('>', timeout=30)
            print("✓ Droid ready")

            # Start onboarding
            print("\nStarting onboarding with /forge-start...")
            child.sendline('/forge-start')

            first_prompt_ready = advance_to_first_prompt()

            # Walk through onboarding sequence
            for idx, step in enumerate(PROMPT_SEQUENCE):
                value = scenario.get(step['key'], '')
                print(f"\n[Step {idx+1}/{len(PROMPT_SEQUENCE)}] {step['label']}")
                
                # Skip expect for first prompt if already matched
                if not (idx == 0 and first_prompt_ready):
                    try:
                        expect_prompt(step['patterns'], step['label'])
                    except pexpect.TIMEOUT:
                        print(f"  ⚠ Skipping {step['label']} - not found in output")
                        continue
                
                send_answer(value)

            # Check for roster completion
            print("\n[Final Phase] Waiting for roster completion...")
            for final in FINAL_PROMPTS:
                try:
                    print(f"  Looking for: {final['label']}")
                    expect_prompt(final['patterns'], final['label'])
                    print(f"  ✓ Found: {final['label']}")
                except pexpect.TIMEOUT:
                    print(f"  ⚠ Skipping {final['label']} - may complete elsewhere")
                    continue

            print("\nExiting droid...")
            child.sendline('exit')
            child.expect(pexpect.EOF, timeout=10)

            exit_code = child.wait()
            print(f"\n✓ UAT completed successfully (exit code: {exit_code})")

            return (exit_code, None, transcript_path)
            
        except pexpect.TIMEOUT as e:
            print(f"\n✗ TIMEOUT waiting for expected output", file=sys.stderr)
            print(f"Last output:\n{child.before}", file=sys.stderr)
            child.close(force=True)
            return (1, None, transcript_path)
            
        except pexpect.EOF as e:
            print(f"\n✗ Unexpected EOF - droid exited early", file=sys.stderr)
            print(f"Last output:\n{child.before}", file=sys.stderr)
            child.close(force=True)
            return (2, None, transcript_path)
            
        except Exception as e:
            print(f"\n✗ Automation failed: {e}", file=sys.stderr)
            child.close(force=True)
            return (3, None, transcript_path)
            
        finally:
            if child.isalive():
                child.close(force=True)


def main():
    parser = argparse.ArgumentParser(
        description='Automate DroidForge UAT onboarding scenarios',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
Available scenarios:
  saas   - SaaS Analytics Dashboard (Agile)
  mobile - Mobile Wellness Companion (Rapid)
  iot    - Embedded IoT Firmware (TDD)

Example:
  python scripts/automate-uat.py saas ~/test-repo
        '''
    )
    parser.add_argument(
        'scenario',
        choices=list(SCENARIOS.keys()),
        help='UAT scenario to run'
    )
    parser.add_argument(
        'repo',
        help='Path to test repository'
    )
    parser.add_argument(
        '--log-dir',
        default=os.path.expanduser('~/.factory/uat'),
        help='Directory for session logs (default: ~/.factory/uat)'
    )
    parser.add_argument(
        '--timeout',
        type=int,
        default=600,
        help='Timeout in seconds (default: 600)'
    )
    
    args = parser.parse_args()
    
    # Validate repo path
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
