#!/bin/bash

# DroidForge UAT Execution Script
# Comprehensive test runner for User Acceptance Testing

set -e

# Configuration
UAT_DIR="uat-testing"
RESULTS_DIR="$UAT_DIR/results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="$RESULTS_DIR/uat-execution-$TIMESTAMP.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Setup UAT environment
setup_uat_environment() {
    log "🔧 Setting up UAT environment..."
    
    # Create directory structure
    mkdir -p "$RESULTS_DIR/$TIMESTAMP"
    mkdir -p "$UAT_DIR/feedback"
    mkdir -p "$UAT_DIR/logs"
    
    # Initialize results tracking
    echo "timestamp,test_case,persona,environment,duration_seconds,success,error_count,satisfaction_score" > "$RESULTS_DIR/$TIMESTAMP/results.csv"
    
    # Start performance monitoring
    bash scripts/tmp_rovodev_uat-setup.sh
    
    success "UAT environment ready"
}

# Execute individual test case
run_test_case() {
    local test_case="$1"
    local persona="$2"
    local environment="$3"
    
    log "📋 Executing $test_case - Persona: $persona, Environment: $environment"
    
    local start_time=$(date +%s)
    local test_log="$RESULTS_DIR/$TIMESTAMP/${test_case}_${persona}_${environment}.log"
    local success_flag=false
    local error_count=0
    
    case "$test_case" in
        "TC001")
            run_tc001 "$persona" "$environment" > "$test_log" 2>&1 && success_flag=true
            ;;
        "TC002")
            run_tc002 "$persona" "$environment" > "$test_log" 2>&1 && success_flag=true
            ;;
        "TC003")
            run_tc003 "$persona" "$environment" > "$test_log" 2>&1 && success_flag=true
            ;;
        "TC004")
            run_tc004 "$persona" "$environment" > "$test_log" 2>&1 && success_flag=true
            ;;
        "TC005")
            run_tc005 "$persona" "$environment" > "$test_log" 2>&1 && success_flag=true
            ;;
        *)
            error "Unknown test case: $test_case"
            return 1
            ;;
    esac
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # Count errors in log
    error_count=$(grep -c "ERROR\|FAIL\|Exception" "$test_log" 2>/dev/null || echo "0")
    
    # Record results
    echo "$TIMESTAMP,$test_case,$persona,$environment,$duration,$success_flag,$error_count,0" >> "$RESULTS_DIR/$TIMESTAMP/results.csv"
    
    if [ "$success_flag" = true ]; then
        success "$test_case completed successfully in ${duration}s"
    else
        error "$test_case failed after ${duration}s with $error_count errors"
    fi
}

# TC001: First-Time Installation and Setup
run_tc001() {
    local persona="$1"
    local environment="$2"
    
    echo "🧪 Running TC001: First-Time Installation and Setup"
    echo "Persona: $persona, Environment: $environment"
    
    # Setup environment
    cd "$UAT_DIR/environments/$environment"
    bash setup.sh
    
    # Install DroidForge
    echo "📦 Installing DroidForge..."
    npm install -g droidforge
    
    # Test installation
    if ! droidforge --version; then
        echo "ERROR: DroidForge installation failed"
        return 1
    fi
    
    # Navigate to appropriate test project
    case "$persona" in
        "junior")
            cd "../../test-projects/small-react"
            ;;
        "senior"|"lead")
            cd "../../test-projects/nodejs-backend"
            ;;
        *)
            cd "../../test-projects/small-react"
            ;;
    esac
    
    # Run onboarding
    echo "🚀 Starting onboarding flow..."
    echo "yes" | droidforge --onboard
    
    # Verify droid creation
    if [ ! -d ".droidforge/droids" ]; then
        echo "ERROR: Droids directory not created"
        return 1
    fi
    
    # Count generated droids
    droid_count=$(find .droidforge/droids -name "*.md" | wc -l)
    echo "Generated $droid_count droids"
    
    if [ "$droid_count" -lt 3 ]; then
        echo "ERROR: Insufficient droids generated"
        return 1
    fi
    
    echo "✅ TC001 completed successfully"
    return 0
}

# TC002: Large Project Onboarding
run_tc002() {
    local persona="$1"
    local environment="$2"
    
    echo "🧪 Running TC002: Large Project Onboarding"
    
    # Navigate to large project
    cd "$UAT_DIR/test-projects/large-enterprise"
    
    # Start resource monitoring
    echo "📊 Starting resource monitoring..."
    (
        while true; do
            timestamp=$(date "+%Y-%m-%d %H:%M:%S")
            memory=$(ps aux | grep droidforge | awk '{sum+=$6} END {print sum/1024}' 2>/dev/null || echo "0")
            echo "$timestamp,$memory" >> "../../../$RESULTS_DIR/$TIMESTAMP/tc002-memory.csv"
            sleep 5
        done
    ) &
    monitor_pid=$!
    
    # Run smart scan with timeout
    echo "🔍 Running smart scan..."
    timeout 300 droidforge --smart-scan || {
        echo "ERROR: Smart scan timed out after 5 minutes"
        kill $monitor_pid 2>/dev/null
        return 1
    }
    
    # Run onboarding
    echo "🚀 Running onboarding..."
    echo "yes" | timeout 600 droidforge --onboard || {
        echo "ERROR: Onboarding timed out after 10 minutes"
        kill $monitor_pid 2>/dev/null
        return 1
    }
    
    # Stop monitoring
    kill $monitor_pid 2>/dev/null
    
    # Validate results
    if [ ! -d ".droidforge" ]; then
        echo "ERROR: DroidForge directory not created"
        return 1
    fi
    
    # Check memory usage
    peak_memory=$(awk -F',' 'NR>1 {if ($2 > max) max = $2} END {print max}' "../../../$RESULTS_DIR/$TIMESTAMP/tc002-memory.csv")
    echo "Peak memory usage: ${peak_memory}MB"
    
    if (( $(echo "$peak_memory > 2048" | bc -l) )); then
        echo "WARNING: Memory usage exceeded 2GB threshold"
    fi
    
    echo "✅ TC002 completed successfully"
    return 0
}

# TC003: Team Collaboration Scenario
run_tc003() {
    local persona="$1"
    local environment="$2"
    
    echo "🧪 Running TC003: Team Collaboration Scenario"
    
    # Setup shared project directory
    shared_project="$UAT_DIR/test-projects/team-collaboration"
    mkdir -p "$shared_project"
    cp -r "$UAT_DIR/test-projects/nodejs-backend/"* "$shared_project/"
    cd "$shared_project"
    
    # Initialize git repo for collaboration testing
    git init
    git add .
    git commit -m "Initial project setup"
    
    # User A: Initial setup
    echo "👤 User A: Initial DroidForge setup"
    droidforge --onboard < /dev/null
    git add .droidforge
    git commit -m "Add DroidForge configuration"
    
    # User B: Join existing setup
    echo "👤 User B: Joining existing setup"
    droidforge --status
    
    # Verify existing droids are detected
    if [ ! -d ".droidforge/droids" ]; then
        echo "ERROR: Existing droids not detected by User B"
        return 1
    fi
    
    # User B adds custom droid
    echo "Adding custom droid..."
    droidforge --add-droid "test-custom-droid" "Custom testing droid"
    
    # User C: Configuration modification
    echo "👤 User C: Modifying configuration"
    # Simulate parallel access
    droidforge --status &
    droidforge --list-droids &
    wait
    
    # Test for conflicts
    if [ $? -ne 0 ]; then
        echo "ERROR: Parallel access caused conflicts"
        return 1
    fi
    
    echo "✅ TC003 completed successfully"
    return 0
}

# TC004: Error Recovery and Edge Cases
run_tc004() {
    local persona="$1"
    local environment="$2"
    
    echo "🧪 Running TC004: Error Recovery and Edge Cases"
    
    cd "$UAT_DIR/test-projects/small-react"
    
    # Test 1: Corrupted package.json
    echo "🔥 Testing corrupted package.json handling"
    cp package.json package.json.backup
    echo "invalid json" > package.json
    
    droidforge --smart-scan 2>&1 | grep -q "JSON\|parse\|invalid" && {
        echo "✅ JSON corruption handled gracefully"
    } || {
        echo "ERROR: JSON corruption not handled"
        mv package.json.backup package.json
        return 1
    }
    
    mv package.json.backup package.json
    
    # Test 2: Permission issues
    echo "🔒 Testing permission handling"
    chmod 444 .
    
    droidforge --onboard 2>&1 | grep -q "permission\|EACCES" && {
        echo "✅ Permission errors handled gracefully"
    } || {
        echo "WARNING: Permission error handling could be improved"
    }
    
    chmod 755 .
    
    # Test 3: Network simulation (if available)
    if command -v tc >/dev/null 2>&1; then
        echo "🌐 Testing network interruption handling"
        # Simulate network delay
        sudo tc qdisc add dev lo root netem delay 1000ms 2>/dev/null || true
        
        timeout 30 droidforge --onboard 2>&1 | grep -q "timeout\|network" && {
            echo "✅ Network issues handled gracefully"
        } || {
            echo "INFO: Network interruption test completed"
        }
        
        # Restore network
        sudo tc qdisc del dev lo root 2>/dev/null || true
    fi
    
    echo "✅ TC004 completed successfully"
    return 0
}

# TC005: Migration from Legacy Systems
run_tc005() {
    local persona="$1"
    local environment="$2"
    
    echo "🧪 Running TC005: Migration from Legacy Systems"
    
    # Create project with legacy automation
    legacy_project="$UAT_DIR/test-projects/legacy-migration"
    mkdir -p "$legacy_project"
    cd "$legacy_project"
    
    # Setup legacy Grunt configuration
    cat > Gruntfile.js << 'EOF'
module.exports = function(grunt) {
  grunt.initConfig({
    jshint: {
      files: ['*.js'],
      options: {
        globals: {
          jQuery: true
        }
      }
    }
  });
  
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.registerTask('default', ['jshint']);
};
EOF
    
    cat > package.json << 'EOF'
{
  "name": "legacy-project",
  "version": "1.0.0",
  "devDependencies": {
    "grunt": "^1.0.0",
    "grunt-contrib-jshint": "^3.0.0"
  },
  "scripts": {
    "build": "grunt",
    "test": "echo 'legacy test'"
  }
}
EOF
    
    # Test DroidForge integration
    echo "🔧 Testing DroidForge integration with legacy system"
    npm install
    
    # Run legacy build first
    npm run build
    
    # Run DroidForge onboarding
    droidforge --onboard < /dev/null
    
    # Verify both systems work
    if [ -f "Gruntfile.js" ] && [ -d ".droidforge" ]; then
        echo "✅ Legacy system and DroidForge coexist successfully"
    else
        echo "ERROR: Integration with legacy system failed"
        return 1
    fi
    
    # Test that legacy scripts still work
    npm run build && {
        echo "✅ Legacy build system still functional"
    } || {
        echo "ERROR: Legacy build system broken after DroidForge integration"
        return 1
    }
    
    echo "✅ TC005 completed successfully"
    return 0
}

# Generate UAT report
generate_uat_report() {
    local results_dir="$RESULTS_DIR/$TIMESTAMP"
    
    log "📊 Generating UAT report..."
    
    # Calculate summary statistics
    total_tests=$(tail -n +2 "$results_dir/results.csv" | wc -l)
    successful_tests=$(tail -n +2 "$results_dir/results.csv" | grep -c "true")
    success_rate=$((successful_tests * 100 / total_tests))
    
    # Generate HTML report
    cat > "$results_dir/uat-report.html" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>DroidForge UAT Report - $TIMESTAMP</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { background: #f0f0f0; padding: 20px; border-radius: 8px; }
        .success { color: green; font-weight: bold; }
        .failure { color: red; font-weight: bold; }
        .warning { color: orange; font-weight: bold; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .metric { display: inline-block; margin: 10px 20px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>DroidForge UAT Report</h1>
        <p>Generated: $(date)</p>
        <p>Test Session: $TIMESTAMP</p>
    </div>
    
    <h2>Summary</h2>
    <div class="metric">Total Tests: <strong>$total_tests</strong></div>
    <div class="metric">Successful: <strong class="success">$successful_tests</strong></div>
    <div class="metric">Success Rate: <strong>$success_rate%</strong></div>
    
    <h2>Test Results</h2>
    <table>
        <tr>
            <th>Test Case</th>
            <th>Persona</th>
            <th>Environment</th>
            <th>Duration (s)</th>
            <th>Status</th>
            <th>Errors</th>
        </tr>
EOF
    
    # Add test results to HTML
    tail -n +2 "$results_dir/results.csv" | while IFS=',' read -r timestamp test_case persona environment duration success errors satisfaction; do
        status_class="success"
        status_text="PASS"
        if [ "$success" = "false" ]; then
            status_class="failure"
            status_text="FAIL"
        fi
        
        echo "        <tr>" >> "$results_dir/uat-report.html"
        echo "            <td>$test_case</td>" >> "$results_dir/uat-report.html"
        echo "            <td>$persona</td>" >> "$results_dir/uat-report.html"
        echo "            <td>$environment</td>" >> "$results_dir/uat-report.html"
        echo "            <td>$duration</td>" >> "$results_dir/uat-report.html"
        echo "            <td class=\"$status_class\">$status_text</td>" >> "$results_dir/uat-report.html"
        echo "            <td>$errors</td>" >> "$results_dir/uat-report.html"
        echo "        </tr>" >> "$results_dir/uat-report.html"
    done
    
    cat >> "$results_dir/uat-report.html" << EOF
    </table>
    
    <h2>Recommendation</h2>
    <p class="$([ $success_rate -ge 85 ] && echo "success" || echo "failure")">
        $([ $success_rate -ge 85 ] && echo "🎉 UAT PASSED - Ready for production release" || echo "🔴 UAT REQUIRES REVIEW - Success rate below 85% threshold")
    </p>
    
    <h2>Detailed Logs</h2>
    <p>Individual test logs are available in the results directory.</p>
    
</body>
</html>
EOF
    
    success "UAT report generated: $results_dir/uat-report.html"
}

# Main execution
main() {
    log "🚀 Starting DroidForge UAT Test Suite"
    
    # Setup environment
    setup_uat_environment
    
    # Define test matrix
    test_cases=("TC001" "TC002" "TC003" "TC004" "TC005")
    personas=("junior" "senior" "lead")
    environments=("clean" "complex")
    
    # Execute test matrix
    for test_case in "${test_cases[@]}"; do
        for persona in "${personas[@]}"; do
            for environment in "${environments[@]}"; do
                # Skip some combinations to reduce test time
                if [[ "$test_case" == "TC002" && "$persona" == "junior" ]]; then
                    continue  # Large project testing mainly for experienced users
                fi
                
                if [[ "$test_case" == "TC005" && "$environment" == "complex" ]]; then
                    continue  # Migration testing mainly in clean environment
                fi
                
                run_test_case "$test_case" "$persona" "$environment"
            done
        done
    done
    
    # Generate final report
    generate_uat_report
    
    # Calculate final success rate
    total_tests=$(tail -n +2 "$RESULTS_DIR/$TIMESTAMP/results.csv" | wc -l)
    successful_tests=$(tail -n +2 "$RESULTS_DIR/$TIMESTAMP/results.csv" | grep -c "true")
    success_rate=$((successful_tests * 100 / total_tests))
    
    log "📊 UAT Summary: $successful_tests/$total_tests tests passed ($success_rate%)"
    
    if [ $success_rate -ge 85 ]; then
        success "🎉 UAT PASSED - DroidForge is ready for production release!"
        exit 0
    else
        error "🔴 UAT FAILED - Success rate below 85% threshold. Review required."
        exit 1
    fi
}

# Handle script arguments
case "${1:-}" in
    "setup")
        setup_uat_environment
        ;;
    "run")
        main
        ;;
    "report")
        generate_uat_report
        ;;
    *)
        echo "Usage: $0 {setup|run|report}"
        echo "  setup  - Setup UAT environment only"
        echo "  run    - Run complete UAT suite"
        echo "  report - Generate report from existing results"
        exit 1
        ;;
esac