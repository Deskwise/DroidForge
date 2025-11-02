---
title: UAT Onboarding Validation
description: Automated and manual UAT approaches for validating onboarding flow.
---

# UAT Onboarding Validation

## Automated UAT (Recommended)

Run the e2e test suite to validate the complete onboarding flow including methodology confirmation:

```bash
npm test -- src/mcp/__tests__/e2e/onboarding.e2e.test.ts
```

**What it validates:**
- ✅ Smart scan detects repo signals
- ✅ Project goal recording
- ✅ Core discovery fields (audience, timeline, quality, team, experience)
- ✅ Delivery fields (budget, deployment, security, scalability)
- ✅ Methodology confirmation flag persistence
- ✅ Methodology selection
- ✅ Droid recommendations
- ✅ Roster forging
- ✅ Session state transitions

**Runtime:** ~30 seconds for full suite

This tests the MCP layer directly (what AI agents use) and is the industry-standard approach for validating AI-driven workflows.

## Manual UAT Scenarios

For end-to-end CLI validation, use these canned project briefs. Each covers the ten canonical discovery fields.

### 1. SaaS Analytics Dashboard (Web)
- **Project Vision**: Build a multi-tenant analytics dashboard for marketing teams to track campaign performance in real time.
- **Target Audience**: Mid-sized marketing agencies serving retail clients.
- **Timeline Constraints**: MVP in 10 weeks to align with industry conference debut.
- **Quality vs Speed**: Favor quality—stakeholders expect polished UI and reliable data.
- **Team Size**: 6-person squad (PM, designer, 3 engineers, QA).
- **Experience Level**: Mostly mid-level developers new to data visualization.
- **Budget Constraints**: $180K cap for initial launch.
- **Deployment Requirements**: Cloud-hosted on AWS with multi-region redundancy.
- **Security Requirements**: Must be SOC 2–ready; enforce SSO and audit logging.
- **Scalability Needs**: Support 500 concurrent agency accounts with bursty load.

### 2. Mobile Wellness Companion (iOS/Android)
- **Project Vision**: Deliver a daily wellness companion app with habit tracking, mood journaling, and guided meditations.
- **Target Audience**: Busy professionals aged 25-40 seeking balance.
- **Timeline Constraints**: Soft launch in 6 weeks, full release in 12.
- **Quality vs Speed**: Balanced; ship quickly but maintain smooth UX.
- **Team Size**: 4 developers plus a part-time product designer.
- **Experience Level**: Senior backend engineer, others junior mobile devs.
- **Budget Constraints**: Operating on $75K seed funding.
- **Deployment Requirements**: Native apps in Apple App Store and Google Play with separate CI pipelines.
- **Security Requirements**: HIPAA-lite mindset—encrypt mood journal entries and enforce secure auth.
- **Scalability Needs**: Start with 20K users, roadmap to 100K within a year.

### 3. Embedded IoT Firmware (Automotive)
- **Project Vision**: Create firmware for an in-car sensor hub that aggregates tire pressure, temperature, and vibration data.
- **Target Audience**: Automotive OEMs integrating advanced driver telemetry.
- **Timeline Constraints**: Hardware pilot in 16 weeks for 2026 model previews.
- **Quality vs Speed**: Quality-critical; automotive validation requires zero regressions.
- **Team Size**: 5 engineers (2 embedded, 2 systems, 1 test) plus compliance officer.
- **Experience Level**: Highly experienced in C/C++ but limited Rust exposure.
- **Budget Constraints**: $320K allocated for firmware milestone.
- **Deployment Requirements**: Runs on ARM Cortex-M7 with OTA update support.
- **Security Requirements**: Must pass ISO 21434 threat assessments and secure boot.
- **Scalability Needs**: Firmware must handle 50 sensors per vehicle without latency spikes.

### 4. FinTech Reconciliation Service (Backend)
- **Project Vision**: Build an automated reconciliation service that matches bank transactions with ERP records nightly.
- **Target Audience**: Finance teams at mid-market SaaS companies.
- **Timeline Constraints**: Go-live in 8 weeks to replace manual spreadsheets.
- **Quality vs Speed**: Prioritize accuracy and auditability over rapid delivery.
- **Team Size**: 3 backend engineers, 1 data analyst, shared DevOps support.
- **Experience Level**: Senior engineers but new to financial compliance.
- **Budget Constraints**: $150K for initial rollout.
- **Deployment Requirements**: Containerized microservice running on Azure Kubernetes Service.
- **Security Requirements**: PCI-DSS alignment, encrypted at rest/in transit, fine-grained IAM.
- **Scalability Needs**: Reconcile 2M transactions nightly with growth to 5M.

### 5. Education VR Experience (XR)
- **Project Vision**: Develop an interactive VR lab where students explore historical engineering feats.
- **Target Audience**: High school STEM programs with VR-ready labs.
- **Timeline Constraints**: Demo unit for spring curriculum planning in 14 weeks.
- **Quality vs Speed**: Balanced—engaging experience with limited bug tolerance.
- **Team Size**: 7-person team (XR lead, 2 Unity devs, 2 3D artists, educator, QA).
- **Experience Level**: Senior XR lead, rest mid-level moving from 2D games to VR.
- **Budget Constraints**: $210K grant funding earmarked for content and hardware.
- **Deployment Requirements**: Target Meta Quest 3 and PC-powered headsets; offline mode needed.
- **Security Requirements**: FERPA compliant user data handling; limited analytics collection.
- **Scalability Needs**: Support simultaneous sessions for up to 30 students with shared assets.

---

## CLI Automation Status

CLI automation via `scripts/automate-uat.py` is **not recommended** due to:
- Interactive command palette UI requires arrow key navigation (fragile in pexpect)
- LLM-driven conversational prompts are non-deterministic
- Test maintenance cost exceeds manual testing for AI-conversational flows

For automated validation, use the MCP e2e tests shown above.

**Manual CLI testing:** Run `droid` and use the scenarios above. Takes 3-5 minutes per scenario.

**Tip:** Pair each scenario with a different methodology during manual UAT to exercise the onboarding guardrails (e.g., Agile for SaaS, Rapid for mobile, Lean for IoT).
