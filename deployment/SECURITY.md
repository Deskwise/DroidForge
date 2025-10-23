# DroidForge HTTP MCP Server - Security Guide

## 🔒 Current Security Posture

### ✅ What's Already Protected

| Layer | Protection | Status |
|-------|------------|--------|
| **Transport** | HTTPS (TLS 1.2+) via Let's Encrypt | ✅ Enabled (if domain provided) |
| **Authentication** | Bearer token (API key) | ✅ Configurable |
| **Process Isolation** | Dedicated user account | ✅ Automatic |
| **Input Validation** | JSON schema validation | ✅ Implemented |
| **Dependency Security** | npm audit clean | ✅ Zero vulnerabilities |

### ⚠️ Current Limitations

| Risk | Current State | Severity |
|------|---------------|----------|
| **No rate limiting** | Unlimited requests per IP | 🟡 Medium |
| **Basic auth** | Single API key for all users | 🟡 Medium |
| **No audit logging** | Limited access logs | 🟡 Medium |
| **File system access** | Server can read/write files | 🔴 High |
| **No request signing** | Bearer token only | 🟡 Medium |
| **Single point of failure** | One server instance | 🟡 Medium |

---

## 🛡️ Essential Security Hardening (Do These First)

### 1. **Generate Strong API Key**

```bash
# Generate cryptographically secure 32-byte key
openssl rand -hex 32

# Set in environment
export DROIDFORGE_API_KEY="your-generated-key-here"
```

**❌ DON'T:**
- Use predictable keys like "password123"
- Commit API keys to git
- Share keys in plain text (Slack, email)

**✅ DO:**
- Use minimum 32-byte random keys
- Store in environment variables or secret manager
- Rotate keys every 90 days
- Use different keys per environment (dev/staging/prod)

---

### 2. **Firewall Configuration**

```bash
# Only allow HTTP/HTTPS and SSH
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP (for Let's Encrypt)
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable

# Verify
sudo ufw status
```

---

### 3. **SSH Hardening**

```bash
# Disable password authentication (use SSH keys only)
sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config

# Disable root login
sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config

# Restart SSH
sudo systemctl restart sshd
```

---

### 4. **Enable Nginx Rate Limiting**

Create `/etc/nginx/conf.d/rate-limit.conf`:

```nginx
# Define rate limit zones
limit_req_zone $binary_remote_addr zone=mcp_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=health_limit:10m rate=30r/s;

# Connection limits
limit_conn_zone $binary_remote_addr zone=addr:10m;
```

Update nginx site config:

```nginx
server {
    listen 443 ssl http2;
    server_name droidforge.yourdomain.com;

    # Rate limiting
    limit_req zone=mcp_limit burst=20 nodelay;
    limit_conn addr 10;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Hide nginx version
    server_tokens off;

    location /mcp {
        limit_req zone=mcp_limit burst=20 nodelay;
        
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffer settings
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }

    location /health {
        limit_req zone=health_limit burst=50 nodelay;
        proxy_pass http://localhost:3000/health;
        access_log off;
    }

    # Block common attacks
    location ~ /\\.git {
        deny all;
    }
}
```

Test and reload:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

### 5. **Automated Security Updates**

```bash
# Install unattended-upgrades
sudo apt-get install -y unattended-upgrades

# Configure automatic security updates
sudo dpkg-reconfigure -plow unattended-upgrades

# Enable auto-updates
echo 'APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Download-Upgradeable-Packages "1";
APT::Periodic::AutocleanInterval "7";
APT::Periodic::Unattended-Upgrade "1";' | sudo tee /etc/apt/apt.conf.d/20auto-upgrades
```

---

### 6. **Fail2Ban for Brute Force Protection**

```bash
# Install fail2ban
sudo apt-get install -y fail2ban

# Create DroidForge filter
sudo tee /etc/fail2ban/filter.d/droidforge.conf > /dev/null <<EOF
[Definition]
failregex = ^.*\"error\":\"Invalid API key\".*\"ip\":\"<HOST>\".*$
ignoreregex =
EOF

# Configure jail
sudo tee /etc/fail2ban/jail.d/droidforge.conf > /dev/null <<EOF
[droidforge]
enabled = true
port = 443
filter = droidforge
logpath = /var/log/nginx/access.log
maxretry = 5
findtime = 600
bantime = 3600
EOF

sudo systemctl restart fail2ban
```

---

## 🔐 Advanced Security Measures

### 7. **IP Whitelisting (For Known Teams)**

If your team has static IPs:

```nginx
# In nginx config
location /mcp {
    # Allow only specific IPs
    allow 1.2.3.4;        # Office IP
    allow 5.6.7.8;        # VPN IP
    deny all;
    
    proxy_pass http://localhost:3000;
    # ... rest of config
}
```

---

### 8. **Request Logging & Monitoring**

Update systemd service to log more details:

```bash
sudo tee -a /etc/systemd/system/droidforge-mcp.service <<EOF

# Enhanced logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=droidforge-mcp

# Log level
Environment="LOG_LEVEL=info"
EOF

sudo systemctl daemon-reload
sudo systemctl restart droidforge-mcp
```

View logs:
```bash
# Real-time monitoring
sudo journalctl -u droidforge-mcp -f

# Search for auth failures
sudo journalctl -u droidforge-mcp | grep "Invalid API key"
```

---

### 9. **API Key Rotation**

Create rotation script `/opt/droidforge-mcp/rotate-key.sh`:

```bash
#!/bin/bash
set -e

OLD_KEY="$DROIDFORGE_API_KEY"
NEW_KEY=$(openssl rand -hex 32)

# Update .env file
sed -i "s/DROIDFORGE_API_KEY=.*/DROIDFORGE_API_KEY=$NEW_KEY/" /opt/droidforge-mcp/.env

# Restart service
systemctl restart droidforge-mcp

echo "✅ API key rotated successfully"
echo "🔑 New key: $NEW_KEY"
echo "⚠️  Update this key in all Factory.ai clients!"
```

Usage:
```bash
sudo bash /opt/droidforge-mcp/rotate-key.sh
```

---

### 10. **File System Sandboxing**

Restrict what the server can access:

```bash
# Create dedicated workspace directory
sudo mkdir -p /var/droidforge/workspaces
sudo chown droidforge:droidforge /var/droidforge/workspaces
sudo chmod 750 /var/droidforge/workspaces

# Update systemd service
sudo tee -a /etc/systemd/system/droidforge-mcp.service <<EOF

# Restrict file system access
ReadWritePaths=/var/droidforge/workspaces
ReadOnlyPaths=/opt/droidforge-mcp
ProtectSystem=strict
ProtectHome=yes
PrivateTmp=yes
NoNewPrivileges=yes
EOF

sudo systemctl daemon-reload
sudo systemctl restart droidforge-mcp
```

---

## 🚨 Critical Vulnerabilities to Address

### **HIGH RISK: Arbitrary File System Access**

**Problem:** Current implementation allows reading/writing any file the server user can access.

**Attack Scenario:**
```json
{
  "tool": "smart_scan",
  "input": {
    "repoRoot": "/etc",
    "sessionId": "attack"
  }
}
```
This could scan sensitive system files.

**Fix Required:**

1. **Add path validation in HTTP server:**

```typescript
// src/mcp/http-server.ts
import path from 'path';

const ALLOWED_BASE_PATHS = [
  '/var/droidforge/workspaces',
  '/tmp/droidforge'
];

function validateRepoRoot(repoRoot: string): boolean {
  const normalized = path.normalize(repoRoot);
  return ALLOWED_BASE_PATHS.some(base => 
    normalized.startsWith(path.normalize(base))
  );
}

// In /mcp endpoint:
if (!validateRepoRoot(effectiveRepoRoot)) {
  return res.status(403).json({
    error: 'Invalid repoRoot: path not in allowed workspace'
  });
}
```

2. **Enforce workspace isolation per team/user**

---

### **MEDIUM RISK: No Request Size Limits**

**Problem:** Large payloads could cause DoS.

**Fix:**

```typescript
// In http-server.ts
app.use(express.json({ 
  limit: '10mb',  // Already set
  strict: true
}));

// Add timeout middleware
app.use((req, res, next) => {
  req.setTimeout(30000); // 30 second timeout
  next();
});
```

---

### **MEDIUM RISK: No Audit Trail**

**Problem:** Can't track who did what.

**Fix - Add audit logging:**

```typescript
// src/mcp/audit.ts
export function logAuditEvent(event: {
  timestamp: string;
  ip: string;
  tool: string;
  user?: string;
  success: boolean;
  error?: string;
}) {
  console.log(JSON.stringify({
    type: 'audit',
    ...event
  }));
}

// In http-server.ts
app.post('/mcp', authMiddleware, async (req: Request, res: Response) => {
  const startTime = Date.now();
  const clientIp = req.headers['x-real-ip'] || req.ip;
  
  try {
    // ... existing code ...
    
    logAuditEvent({
      timestamp: new Date().toISOString(),
      ip: clientIp,
      tool,
      success: true
    });
    
    res.json({...});
  } catch (error) {
    logAuditEvent({
      timestamp: new Date().toISOString(),
      ip: clientIp,
      tool,
      success: false,
      error: error.message
    });
    
    res.status(500).json({...});
  }
});
```

---

## 🔍 Security Monitoring

### Daily Checks

```bash
# Check for failed authentication attempts
sudo journalctl -u droidforge-mcp --since "24 hours ago" | grep "Invalid API key"

# Check nginx access logs
sudo tail -1000 /var/log/nginx/access.log | grep "POST /mcp"

# Check for banned IPs
sudo fail2ban-client status droidforge

# Check SSL certificate expiry
sudo certbot certificates
```

### Set Up Alerts

Create monitoring script `/opt/droidforge-mcp/monitor.sh`:

```bash
#!/bin/bash

# Check if service is running
if ! systemctl is-active --quiet droidforge-mcp; then
    echo "ALERT: DroidForge service is down!" | mail -s "DroidForge Alert" admin@yourdomain.com
fi

# Check for high error rate
ERROR_COUNT=$(journalctl -u droidforge-mcp --since "1 hour ago" | grep -c "error")
if [ $ERROR_COUNT -gt 100 ]; then
    echo "ALERT: High error count: $ERROR_COUNT in last hour" | mail -s "DroidForge Alert" admin@yourdomain.com
fi

# Check SSL expiry (warn 30 days before)
CERT_DAYS=$(sudo certbot certificates 2>/dev/null | grep "VALID:" | grep -oP '\d+' | head -1)
if [ $CERT_DAYS -lt 30 ]; then
    echo "ALERT: SSL certificate expires in $CERT_DAYS days" | mail -s "DroidForge SSL Alert" admin@yourdomain.com
fi
```

Add to cron:
```bash
# Run every hour
echo "0 * * * * /opt/droidforge-mcp/monitor.sh" | sudo crontab -
```

---

## 📋 Security Checklist

### Before Production Deployment

- [ ] Strong API key generated (32+ bytes)
- [ ] Firewall configured (only 22, 80, 443)
- [ ] SSH hardened (keys only, no root)
- [ ] HTTPS enabled (Let's Encrypt)
- [ ] Nginx rate limiting configured
- [ ] Security headers added
- [ ] Fail2ban installed and configured
- [ ] Automated security updates enabled
- [ ] File system paths validated
- [ ] Audit logging implemented
- [ ] Monitoring alerts configured
- [ ] Backups configured
- [ ] Incident response plan documented

### Regular Maintenance

- [ ] Rotate API keys every 90 days
- [ ] Review access logs weekly
- [ ] Update dependencies monthly (`npm audit`, `npm update`)
- [ ] Review fail2ban bans monthly
- [ ] Test SSL certificate auto-renewal
- [ ] Backup .env file and keys to secure location

---

## 🏢 Enterprise Security (Additional Measures)

### For Organizations with Compliance Requirements

1. **OAuth2/OIDC Integration**
   - Replace simple API key with OAuth2 tokens
   - Integrate with corporate IdP (Okta, Auth0, Azure AD)
   - Implement token refresh

2. **Multi-Tenancy**
   - Separate workspaces per team/tenant
   - Database-backed configuration
   - Per-tenant rate limits

3. **Secrets Management**
   - Use HashiCorp Vault or Azure Key Vault
   - Never store keys in plain text
   - Automatic key rotation

4. **Compliance Logging**
   - Ship logs to SIEM (Splunk, ELK, Azure Monitor)
   - Retain audit logs per compliance requirements (SOC2, HIPAA)
   - Implement log integrity (signed logs)

5. **Network Segmentation**
   - Deploy in private subnet
   - Access via bastion host or VPN only
   - No public internet access

6. **Container Security**
   - Run as non-root user
   - Read-only root filesystem
   - Security scanning (Snyk, Trivy)

---

## 🆘 Incident Response

### If You Suspect a Breach

1. **Immediate Actions:**
   ```bash
   # Rotate API key immediately
   sudo bash /opt/droidforge-mcp/rotate-key.sh
   
   # Stop service
   sudo systemctl stop droidforge-mcp
   
   # Check recent access
   sudo journalctl -u droidforge-mcp --since "24 hours ago" > /tmp/audit.log
   sudo tail -10000 /var/log/nginx/access.log > /tmp/nginx-access.log
   ```

2. **Investigation:**
   - Review audit logs for suspicious activity
   - Check for unauthorized API calls
   - Verify no files were modified
   - Review fail2ban logs

3. **Recovery:**
   - Rotate all keys
   - Review and strengthen security controls
   - Update firewall rules if needed
   - Document incident for future reference

---

## 📞 Support & Reporting

**Security Issues:** Report privately to team@deskwise.ai

**General Questions:** https://github.com/Deskwise/DroidForge/issues

---

## ⚖️ Security vs. Usability Trade-offs

| Measure | Security Gain | Usability Impact |
|---------|---------------|------------------|
| API Key Auth | Medium | Low (one-time setup) |
| IP Whitelisting | High | High (limits access) |
| Rate Limiting | Medium | Low (reasonable limits) |
| Path Validation | High | Low (transparent) |
| Audit Logging | Low (detection) | None |
| Multi-factor Auth | High | Medium (extra step) |

**Recommendation:** Implement all "Low Impact" measures immediately. Evaluate "Medium/High Impact" based on your threat model.
