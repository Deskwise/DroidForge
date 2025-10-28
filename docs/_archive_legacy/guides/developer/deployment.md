# DroidForge Deployment Guide

**Version:** 0.5.0  
**Status:** Production Ready  
**Last Updated:** 2025-10-25

## 🚀 Quick Start

### Prerequisites
- Node.js >= 16
- npm or yarn
- Git repository (for DroidForge to analyze)

### Installation
```bash
# Clone the repository
git clone <your-droidforge-repo>
cd droidforge

# Install dependencies
npm install

# Build the project
npm run build

# Run tests to verify
npm test
```

### Configuration
```bash
# Set environment variables
export NODE_ENV=production
export PORT=3000  # Optional: Default is 3000

# Start the MCP server
npm start
```

## 📋 Pre-Deployment Checklist

### ✅ System Requirements
- [ ] Node.js 16+ installed
- [ ] Sufficient disk space for droid storage (~100MB recommended)
- [ ] Network access for AI model connections
- [ ] Write permissions in target directory

### ✅ Security Setup
- [ ] Review [Security Review](SECURITY_REVIEW.md)
- [ ] Set up audit logging location
- [ ] Configure file permissions properly
- [ ] Set up environment variables for sensitive data

### ✅ Performance Validation
- [ ] Run stress tests: `npm run test:performance`
- [ ] Verify 1000+ file scans complete <2s
- [ ] Confirm system works with multiple concurrent tasks
- [ ] Check memory usage stays within limits

## 🔧 Production Configuration

### Environment Variables
```bash
# Core Configuration
NODE_ENV=production                    # Required
PORT=3000                            # Optional: HTTP server port
LOG_LEVEL=info                        # Optional: debug|info|warn|error

# Security
AUDIT_LOG_PATH=/var/log/droidforge     # Optional: Custom audit log location
MAX_CONCURRENT_EXECUTIONS=10           # Optional: Limit concurrent tasks

# Performance
CACHE_TTL=3600                       # Optional: Cache duration in seconds
STAGING_CLEANUP_INTERVAL=300           # Optional: Cleanup frequency
```

### File System Structure
```
your-project/
├── .droidforge/           # DroidForge data (auto-created)
│   ├── droids/            # Forged droids
│   ├── sessions/          # Session data
│   ├── snapshots/         # State snapshots
│   ├── exec/              # Execution records
│   └── logs/             # Operation logs
├── src/                  # Your source code
└── package.json          # Your project config
```

## 🚦 Starting the Service

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

### Docker Deployment
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

```bash
# Build and run
docker build -t droidforge .
docker run -p 3000:3000 -v $(pwd)/data:/app/.droidforge droidforge
```

## 📊 Monitoring & Health Checks

### Health Endpoint
```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-25T10:30:00.000Z",
  "version": "0.5.0",
  "uptime": 3600,
  "activeDroids": 5,
  "activeExecutions": 2
}
```

### Metrics Endpoint
```bash
curl http://localhost:3000/metrics
```

### Log Monitoring
```bash
# View audit logs
tail -f .droidforge/logs/audit.log

# View operation logs
tail -f .droidforge/logs/operations.log

# View error logs
tail -f .droidforge/logs/error.log
```

## 🛠️ Maintenance

### Routine Tasks
```bash
# Clean up old sessions (older than 7 days)
npm run cleanup:sessions

# Clean up old snapshots (older than 30 days)
npm run cleanup:snapshots

# Archive old execution records
npm run archive:executions

# Full system health check
npm run health:check
```

### Backup Procedures
```bash
# Backup droid configurations
cp -r .droidforge/droids /backup/droids-$(date +%Y%m%d)

# Backup session data
cp -r .droidforge/sessions /backup/sessions-$(date +%Y%m%d)

# Backup snapshots
cp -r .droidforge/snapshots /backup/snapshots-$(date +%Y%m%d)
```

## 🔒 Security Considerations

### File Permissions
```bash
# Secure droid data
chmod 700 .droidforge
chmod 600 .droidforge/droids/*.json

# Secure logs
chmod 640 .droidforge/logs/*.log
```

### Network Security
- Use HTTPS in production
- Implement rate limiting
- Set up proper firewall rules
- Monitor audit logs for suspicious activity

### Data Protection
- Regular backups of `.droidforge` directory
- Encrypt sensitive configuration data
- Implement access controls for droid configurations
- Regular security updates

## 🚨 Troubleshooting

### Common Issues

#### 1. DroidForge won't start
```bash
# Check Node.js version
node --version  # Should be >= 16

# Check permissions
ls -la .droidforge  # Should be writable

# Check logs
npm start 2>&1 | head -20
```

#### 2. Droids not being created
```bash
# Check SmartScan output
npx tsx src/tools/smartScan.ts

# Verify directory structure
ls -la .droidforge/droids/

# Check permissions
chmod 755 .droidforge/droids
```

#### 3. System coordination failures
```bash
# Check resource limits
ulimit -n  # File descriptors
ulimit -u  # User processes

# Clean up stuck executions
rm -rf .droidforge/exec/*

# Restart service
npm restart
```

#### 4. Performance issues
```bash
# Check system resources
top
free -h
df -h

# Run performance test
npm run test:performance

# Clear cache
rm -rf .droidforge/cache/*
```

### Getting Help
- Check [Production Readiness Report](PRODUCTION_READINESS_REPORT.md)
- Review [Security Review](SECURITY_REVIEW.md)
- Check audit logs for detailed error information
- Run health check: `npm run health:check`

## 📈 Scaling Considerations

### Horizontal Scaling
- Multiple DroidForge instances can share the same droid configurations
- Use shared storage (NFS, S3) for `.droidforge` directory
- Implement load balancer for HTTP API

### Vertical Scaling
- Increase `MAX_CONCURRENT_TASKS` for more concurrent tasks
- Add more CPU cores for concurrent processing
- Increase memory allocation for large repositories

### Performance Optimization
- Enable caching for repeated scans
- Use SSD storage for better I/O performance
- Optimize droid configurations for specific workloads

---

## 🎯 Production Deployment Summary

DroidForge v0.5.0 is production-ready with:
- ✅ 41/41 E2E tests passing
- ✅ Comprehensive security review completed  
- ✅ Performance validation with stress testing
- ✅ Complete documentation and deployment guides
- ✅ Monitoring, logging, and health checks
- ✅ Backup and maintenance procedures

**Ready for production deployment!** 🚀
