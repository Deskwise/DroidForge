# Complete Onboarding Guide

**New to DroidForge?** This comprehensive guide walks you through your first experience with DroidForge, from installation to having your first specialist droid team working on your project.

## What You'll Learn

- How DroidForge analyzes your repository
- The 10-data-point intelligent onboarding process
- How to choose the right development methodology
- Building and customizing your droid team
- Getting the most out of your specialist droids

## Prerequisites

Before starting, make sure you have:
- A Git repository with some code (any language/framework)
- Node.js 16+ installed
- Basic familiarity with command line tools

## Step 1: Start the Onboarding

```bash
# Navigate to your project directory
cd /path/to/your/project

# Start DroidForge onboarding
/forge-start
```

**What happens next:**
1. DroidForge scans your repository structure
2. Identifies technologies, frameworks, and patterns
3. Prepares intelligent questions about your project

## Step 2: Project Description (2-3 minutes)

### The Magic Question
DroidForge will ask: *"Tell me about your project. What are you building, who's it for, and what's your situation?"*

### Examples That Work Well
Provide context-rich descriptions:

✅ **Good examples:**
- "E-commerce site for handmade pottery, targeting craft enthusiasts, solo developer with 3-month timeline"
- "Internal tool for employee training tracking, 50-person company, team of 2 developers, needs HIPAA compliance"
- "iOS artillery game with physics, targeting casual gamers, 2-month deadline"

✅ **Bad examples:**
- "Website"
- "App"
- "Just a project"

### What DroidForge Extracts
From your description, DroidForge intelligently identifies:
- **Project type**: Web app, mobile game, API, etc.
- **Target audience**: Who will use it
- **Timeline**: Your deadline situation
- **Team size**: Solo, small team, or larger organization
- **Technical requirements**: Performance, security, scalability needs

## Step 3: Follow-up Questions (2-3 minutes)

Based on your project description, DroidForge asks targeted follow-up questions to fill in missing information.

### Experience Level
"How would you describe your coding experience?"
- Beginner, learning as I build
- Some experience, comfortable with basics
- Senior engineer, several years experience

### Quality vs Speed
"What's more important right now?"
- Speed - need to validate the idea quickly
- Quality - this will handle sensitive data/production use
- Balanced - need both speed and reliability

### Budget & Resources
"Any budget constraints or resource limitations?"
- Bootstrap startup, minimal costs preferred
- Some budget available but need to be cost-conscious
- Enterprise project, cost not a major factor

## Step 4: Methodology Selection (2 minutes)

### Understanding Your Options
DroidForge presents all 10 development methodologies. Don't worry - you'll only choose one that fits your situation.

### Recommended Methodologies
Based on your answers, DroidForge provides 2-3 specific recommendations:

**For beginners:** Agile or Lean Startup
**For experienced developers:** TDD or Domain-Driven Design
**For tight timelines:** Rapid Prototyping or Lean Startup
**For enterprise projects:** DevOps or Enterprise methodology

### Making Your Choice
Consider these factors:
- **Your experience level** with the methodology
- **Your project requirements** (security, performance, compliance)
- **Team size and collaboration needs**
- **Timeline and budget constraints**

## Step 5: Droid Team Generation (2 minutes)

### Recommended Team
DroidForge creates a team of specialist droids based on:
- Your project type and technologies
- Your chosen methodology
- Your team's needs and constraints

**Example team for a web application:**
- **df-orchestrator**: Coordinates all work and manages communication
- **df-frontend**: Handles UI/UX, React components, styling
- **df-backend**: Manages APIs, databases, server logic
- **df-test**: Creates and runs comprehensive tests
- **df-devops**: Handles deployment, CI/CD, infrastructure

### Customization
You can add custom droids for specific needs:
- SEO Specialist for marketing websites
- Security Specialist for sensitive applications
- Performance Specialist for high-traffic sites
- Mobile Specialist for multi-platform apps

## Step 6: Team Creation (1 minute)

DroidForge creates your team by:
1. **Analyzing your repository** structure and technologies
2. **Generating droid configurations** tailored to your project
3. **Installing CLI commands** for easy access
4. **Creating documentation** specific to your team

## Step 7: Getting Started (5 minutes)

### Your First Task
Try a simple task to get familiar:
```bash
/forge-task Create a README section explaining the project overview
```

### Using Individual Droids
Invoke specialists directly:
```bash
/df-frontend Add a navigation header component
/df-backend Create user authentication endpoints
/df-test Write test cases for the main functionality
```

### Viewing Your Team
Check your droid roster:
```bash
/forge-roster
```

### Getting Help
Access your team's handbook:
```bash
/forge-guide
```

## Understanding Your Droids

### Droid Roles & Responsibilities

**df-orchestrator**
- Coordinates all droid activities
- Manages task dependencies
- Handles communication between droids
- Makes high-level architectural decisions

**Specialist Droids**
- Each focuses on a specific domain (frontend, backend, testing, etc.)
- Works within defined file patterns
- Follows project-specific guidelines
- Reports progress and results

### Droid Capabilities

**File Access Control**
Droids can only modify files within their assigned patterns:
```json
{
  "name": "frontend-specialist",
  "filePatterns": [
    "src/components/**",
    "src/pages/**",
    "src/styles/**"
  ]
}
```

**Context Awareness**
Each droid understands:
- Your project's goals and vision
- The chosen development methodology
- Your technical preferences and constraints
- Team composition and coordination needs

### Autonomy Levels

**L1 (Interactive)**
- Confirms each action before proceeding
- Best for learning and exploration
- Used during initial setup and small tasks

**L2 (Semi-Autonomous)**
- Batches confirmations for efficiency
- Good for routine development tasks
- Balances safety with productivity

**L3 (Fully Autonomous)**
- Operates without confirmations
- Used for complex, well-understood tasks
- Maximizes productivity once trust is established

## Best Practices

### Writing Effective Tasks

**Be Specific**
✅ "Create a login form with email/password fields and validation"
❌ "Add login"

**Provide Context**
✅ "Implement a contact form for the homepage that saves to the database"
❌ "Add a form"

**Set Clear Expectations**
✅ "Write tests for the user registration API endpoint"
❌ "Test the API"

### Managing Your Team

**Use the Orchestrator First**
- Start with `/forge-task` for most requests
- Let the orchestrator distribute work appropriately
- Use direct droid invocation for specialized needs

**Monitor Progress**
```bash
/forge-status    # Check current execution status
/forge-logs      # View detailed operation logs
/forge-roster    # See your current team
```

**Provide Feedback**
- DroidForge learns from your preferences
- Adjust autonomy levels based on trust and performance
- Customize droid configurations as needs evolve

### Common Workflows

**Feature Development**
1. Describe the feature to the orchestrator
2. Droids coordinate to implement the feature
3. Review and test the results
4. Refine based on feedback

**Bug Fixes**
1. Report the issue to the appropriate specialist
2. Droids analyze and fix the problem
3. Run tests to verify the solution
4. Deploy the fix

**Code Review**
1. Commit changes to a branch
2. Request review from quality specialist
3. Address any feedback or issues
4. Merge when approved

## Troubleshooting

### Common Issues

**"Droid not responding"**
- Check `/forge-status` for execution state
- Review logs with `/forge-logs`
- Try restarting the droid with `/forge-restart <droid-name>`

**"Task failed"**
- Review the error message carefully
- Check if the task scope is clear
- Try breaking large tasks into smaller ones
- Adjust droid autonomy level if needed

**"Unexpected behavior"**
- Review droid guidelines and file patterns
- Check if proper context was provided
- Verify the chosen methodology fits your project
- Consult team handbook for best practices

### Getting Help

**Documentation**
- Team handbook: `/forge-guide`
- Project documentation: `docs/DroidForge_user_guide_en.md`
- Online docs: [DroidForge Documentation](https://github.com/Deskwise/DroidForge/docs)

**Community Support**
- GitHub Issues: Report bugs and feature requests
- GitHub Discussions: Ask questions and share experiences
- Discord: Real-time chat and support

**Professional Support**
- For enterprise customers: enterprise@droidforge.com
- Training and consultation services available

## Advanced Usage

### Custom Methodologies
Create project-specific workflows:
- Define your own development phases
- Set custom quality gates
- Establish team communication protocols

### Multi-Repository Projects
Manage droids across multiple repositories:
- Share droid configurations
- Coordinate cross-repo dependencies
- Maintain consistent standards

### Integration & Automation
Connect DroidForge with your existing tools:
- CI/CD pipeline integration
- Version control hooks
- Project management tools
- Monitoring and alerting systems

## Next Steps

After completing onboarding:
1. **Explore your team handbook** for detailed droid information
2. **Try a few simple tasks** to build confidence
3. **Customize droid configurations** as you learn more about your needs
4. **Join the community** to share experiences and learn best practices
5. **Provide feedback** to help improve DroidForge for everyone

## Quick Reference

### Essential Commands
```bash
/forge-start      # Start the onboarding process
/forge-task       # Delegate a task to your team
/forge-roster     # View your current droid team
/forge-status     # Check execution status
/forge-guide      # Access team handbook
/forge-cleanup    # Remove all droids when done
```

### Communication Patterns
- **Start with the orchestrator** for most requests
- **Invoke specialists directly** for domain-specific needs
- **Provide clear, contextual instructions**
- **Monitor progress and provide feedback**

---

*Ready to revolutionize your development workflow? Start with `/forge-start` and discover the power of AI-driven team development.*