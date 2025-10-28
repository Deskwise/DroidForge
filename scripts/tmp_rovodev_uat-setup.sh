#!/bin/bash

# DroidForge UAT Environment Setup Script
# This script sets up the UAT testing environments and data collection

set -e

echo "🔧 Setting up DroidForge UAT Environment..."

# Create UAT directory structure
mkdir -p uat-testing/{environments,test-projects,results,feedback}

# Environment 1: Clean Development Setup
echo "📦 Setting up Clean Environment..."
mkdir -p uat-testing/environments/clean
cat > uat-testing/environments/clean/setup.sh << 'EOF'
#!/bin/bash
# Clean environment setup
npm cache clean --force
rm -rf ~/.droidforge
rm -rf node_modules package-lock.json
npm install -g tsx typescript
echo "✅ Clean environment ready"
EOF

# Environment 2: Complex Existing Setup  
echo "🔧 Setting up Complex Environment..."
mkdir -p uat-testing/environments/complex
cat > uat-testing/environments/complex/setup.sh << 'EOF'
#!/bin/bash
# Complex environment with existing tools
npm install -g @angular/cli create-react-app vue-cli
npm install -g eslint prettier husky
npm install -g jest mocha cypress
echo "✅ Complex environment ready"
EOF

# Test Projects Setup
echo "📁 Creating UAT test projects..."

# Small React Project
mkdir -p uat-testing/test-projects/small-react
cat > uat-testing/test-projects/small-react/package.json << 'EOF'
{
  "name": "small-react-project",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test"
  }
}
EOF

# Large Enterprise Project Structure
mkdir -p uat-testing/test-projects/large-enterprise/{src,tests,docs,config}
for i in {1..50}; do
  mkdir -p "uat-testing/test-projects/large-enterprise/src/components/component-$i"
  touch "uat-testing/test-projects/large-enterprise/src/components/component-$i/index.ts"
  touch "uat-testing/test-projects/large-enterprise/src/components/component-$i/component.tsx"
  touch "uat-testing/test-projects/large-enterprise/tests/component-$i.test.ts"
done

# Node.js Backend Project
mkdir -p uat-testing/test-projects/nodejs-backend/{src,tests,config}
cat > uat-testing/test-projects/nodejs-backend/package.json << 'EOF'
{
  "name": "nodejs-backend",
  "version": "1.0.0",
  "dependencies": {
    "express": "^4.18.0",
    "mongoose": "^7.0.0",
    "jest": "^29.0.0"
  },
  "scripts": {
    "start": "node src/index.js",
    "test": "jest",
    "dev": "nodemon src/index.js"
  }
}
EOF

# Data Collection Templates
echo "📊 Setting up data collection..."

cat > uat-testing/feedback/user-survey-template.md << 'EOF'
# DroidForge UAT User Survey

## User Information
- Name: _______________
- Experience Level: [ ] Junior [ ] Mid [ ] Senior [ ] Lead
- Primary Tech Stack: _______________
- Team Size: _______________

## Onboarding Experience (1-5 scale)
- Ease of Installation: ___
- Clarity of Instructions: ___
- Relevance of Questions: ___
- Quality of Recommendations: ___

## Feature Evaluation
### Intelligent Onboarding
- Did the questions feel relevant? Y/N
- Were recommendations helpful? Y/N
- Any confusing parts? _______________

### Droid Generation
- Did droids match your needs? Y/N
- Any missing functionality? _______________
- Code quality satisfaction: ___/5

### Performance
- Scan time acceptable? Y/N
- Execution speed: ___/5
- Resource usage acceptable? Y/N

## Issues Encountered
- Critical errors: _______________
- Minor issues: _______________
- Workarounds needed: _______________

## Overall Satisfaction
- Would you use this in production? Y/N
- Would you recommend to colleagues? Y/N
- Overall rating: ___/5

## Open Feedback
_______________________________________________
_______________________________________________
EOF

cat > uat-testing/results/metrics-template.json << 'EOF'
{
  "testCase": "",
  "persona": "",
  "environment": "",
  "timestamp": "",
  "metrics": {
    "completionRate": 0,
    "timeToComplete": 0,
    "errorsEncountered": [],
    "performanceMetrics": {
      "memoryUsage": 0,
      "cpuUsage": 0,
      "diskUsage": 0,
      "networkUsage": 0
    },
    "userSatisfaction": 0
  },
  "qualitativeFeedback": {
    "painPoints": [],
    "positiveAspects": [],
    "suggestions": []
  }
}
EOF

# UAT Test Execution Scripts
cat > uat-testing/run-tc001.sh << 'EOF'
#!/bin/bash
# Test Case 001: First-Time Installation and Setup

echo "🧪 Executing TC001: First-Time Installation and Setup"
echo "User: $1, Environment: $2"

# Record start time
START_TIME=$(date +%s)

# Setup clean environment
cd uat-testing/environments/$2
bash setup.sh

# Install DroidForge
echo "📦 Installing DroidForge..."
npm install -g droidforge

# Navigate to test project
cd ../../test-projects/small-react

# Record installation time
INSTALL_TIME=$(date +%s)
echo "Installation completed in: $((INSTALL_TIME - START_TIME)) seconds"

# Run onboarding flow
echo "🚀 Starting onboarding flow..."
droidforge --onboard

# Record completion time
END_TIME=$(date +%s)
echo "Total test time: $((END_TIME - START_TIME)) seconds"

# Collect results
echo "TC001,$1,$2,$((END_TIME - START_TIME)),$(date)" >> ../results/tc001-results.csv
EOF

cat > uat-testing/run-tc002.sh << 'EOF'
#!/bin/bash
# Test Case 002: Large Project Onboarding

echo "🧪 Executing TC002: Large Project Onboarding"
echo "User: $1, Environment: $2"

START_TIME=$(date +%s)

# Navigate to large project
cd uat-testing/test-projects/large-enterprise

# Monitor resource usage
echo "📊 Monitoring resource usage..."
top -p $$ -n 1 | grep droidforge > ../results/tc002-resources-$1.log &

# Run smart scan
echo "🔍 Running smart scan..."
droidforge --smart-scan

SCAN_TIME=$(date +%s)
echo "Smart scan completed in: $((SCAN_TIME - START_TIME)) seconds"

# Complete onboarding
droidforge --onboard

END_TIME=$(date +%s)
echo "Large project onboarding completed in: $((END_TIME - START_TIME)) seconds"

# Record results
echo "TC002,$1,$2,$((END_TIME - START_TIME)),$(date)" >> ../results/tc002-results.csv
EOF

# Performance monitoring script
cat > uat-testing/monitor-performance.sh << 'EOF'
#!/bin/bash
# Continuous performance monitoring during UAT

echo "📈 Starting performance monitoring..."

while true; do
  TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")
  
  # Get system metrics
  CPU=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')
  MEM=$(free | grep Mem | awk '{printf "%.2f", ($3/$2) * 100.0}')
  DISK=$(df -h . | awk 'NR==2{print $5}' | sed 's/%//')
  
  # Log to file
  echo "$TIMESTAMP,$CPU,$MEM,$DISK" >> uat-testing/results/performance-log.csv
  
  sleep 30
done
EOF

chmod +x uat-testing/*.sh
chmod +x uat-testing/environments/*/setup.sh

echo "✅ UAT Environment Setup Complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Recruit UAT participants"
echo "2. Schedule testing sessions"
echo "3. Execute test cases: ./uat-testing/run-tc001.sh [user] [environment]"
echo "4. Monitor performance: ./uat-testing/monitor-performance.sh &"
echo "5. Collect feedback using templates in uat-testing/feedback/"
echo ""
echo "📊 Results will be collected in: uat-testing/results/"