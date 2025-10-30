# DroidForge Azure VPS Deployment Guide

This guide walks you through deploying DroidForge as an HTTP MCP server on your Azure VPS.

## Prerequisites

- Azure VPS running Ubuntu 20.04+ or Debian 11+
- Root or sudo access
- Domain name pointed to your VPS (optional, for HTTPS)

## Quick Deployment

### Step 1: Connect to your Azure VPS

```bash
ssh your-user@your-vps-ip
```

### Step 2: Download and run the deployment script

```bash
# Set environment variables
export DROIDFORGE_API_KEY="your-secret-api-key-here"
export DOMAIN="droidforge.yourdomain.com"  # Optional: your domain
export ADMIN_EMAIL="admin@yourdomain.com"  # Optional: for SSL cert

# Download and run deployment script
curl -fsSL https://raw.githubusercontent.com/Deskwise/DroidForge/develop/deployment/azure-vps/deploy.sh | sudo -E bash
```

That's it! The script will:
1. Install Node.js 20, nginx, and other dependencies
2. Clone the DroidForge repository
3. Build the application
4. Create a systemd service (auto-starts on boot)
5. Configure nginx as reverse proxy
6. Set up HTTPS with Let's Encrypt (if domain provided)

## Manual Deployment

If you prefer manual control:

### 1. Install Dependencies

```bash
sudo apt-get update
sudo apt-get install -y curl git nginx certbot python3-certbot-nginx

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt-get install -y nodejs
```

### 2. Clone Repository

```bash
sudo mkdir -p /opt
sudo git clone https://github.com/Deskwise/DroidForge.git /opt/droidforge-mcp
cd /opt/droidforge-mcp
sudo git checkout develop
```

### 3. Install and Build

```bash
sudo npm ci
sudo npm run build
```

### 4. Create Environment File

```bash
sudo tee /opt/droidforge-mcp/.env > /dev/null <<EOF
PORT=3000
DROIDFORGE_API_KEY=your-secret-api-key
NODE_ENV=production
EOF

sudo chmod 600 /opt/droidforge-mcp/.env
```

### 5. Create Systemd Service

```bash
sudo tee /etc/systemd/system/droidforge-mcp.service > /dev/null <<EOF
[Unit]
Description=DroidForge HTTP MCP Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/droidforge-mcp
EnvironmentFile=/opt/droidforge-mcp/.env
ExecStart=/usr/bin/node /opt/droidforge-mcp/dist/mcp/http-server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable droidforge-mcp
sudo systemctl start droidforge-mcp
```

### 6. Configure Nginx

```bash
sudo tee /etc/nginx/sites-available/droidforge-mcp > /dev/null <<EOF
server {
    listen 80;
    server_name droidforge.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/droidforge-mcp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 7. Setup HTTPS (Optional)

```bash
sudo certbot --nginx -d droidforge.yourdomain.com
```

## Verification

### Check Service Status

```bash
sudo systemctl status droidforge-mcp
```

### Test Health Endpoint

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "droidforge-mcp-server",
  "version": "0.5.0",
  "timestamp": "2025-10-23T..."
}
```

### List Available Tools

```bash
curl http://localhost:3000/mcp/tools
```

### Test MCP Endpoint

```bash
curl -X POST http://localhost:3000/mcp \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer your-api-key" \\
  -d '{
    "tool": "smart_scan",
    "input": {
      "repoRoot": "/tmp/test",
      "sessionId": "test-123"
    }
  }'
```

## Using with Factory.ai

Once deployed, add to Factory CLI:

```bash
droid mcp add droidforge https://droidforge.yourdomain.com/mcp --type http --header "Authorization: Bearer your-api-key"
```

Or configure in `mcp.json`:

```json
{
  "mcpServers": {
    "droidforge": {
      "type": "http",
      "url": "https://droidforge.yourdomain.com/mcp",
      "headers": {
        "Authorization": "Bearer your-api-key"
      }
    }
  }
}
```

## Management Commands

```bash
# View logs
sudo journalctl -u droidforge-mcp -f

# Restart service
sudo systemctl restart droidforge-mcp

# Stop service
sudo systemctl stop droidforge-mcp

# Update deployment
cd /opt/droidforge-mcp
sudo git pull origin develop
sudo npm ci
sudo npm run build
sudo systemctl restart droidforge-mcp
```

## Troubleshooting

### Service won't start

```bash
# Check logs
sudo journalctl -u droidforge-mcp -n 100

# Check if port is already in use
sudo lsof -i :3000

# Verify build completed
ls -la /opt/droidforge-mcp/dist/mcp/http-server.js
```

### Nginx issues

```bash
# Test nginx config
sudo nginx -t

# Check nginx logs
sudo tail -f /var/log/nginx/error.log

# Restart nginx
sudo systemctl restart nginx
```

### HTTPS not working

```bash
# Renew certificates
sudo certbot renew

# Check cert status
sudo certbot certificates
```

## Security Recommendations

1. **Use strong API keys**: Generate with `openssl rand -hex 32`
2. **Firewall**: Only allow ports 80 (HTTP) and 443 (HTTPS)
   ```bash
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   ```
3. **Regular updates**: 
   ```bash
   sudo apt-get update && sudo apt-get upgrade
   ```
4. **Monitor logs**: Set up log monitoring/alerting
5. **Rate limiting**: Configure nginx rate limiting for `/mcp` endpoint

## Performance Tuning

For high-traffic deployments:

1. **Increase Node.js memory**:
   Edit `/etc/systemd/system/droidforge-mcp.service`:
   ```
   Environment="NODE_OPTIONS=--max-old-space-size=4096"
   ```

2. **Enable nginx caching** for static responses

3. **Use PM2** for cluster mode:
   ```bash
   npm install -g pm2
   pm2 start dist/mcp/http-server.js -i max
   pm2 save
   pm2 startup
   ```

## Support

- Issues: https://github.com/Deskwise/DroidForge/issues
- Docs: https://github.com/Deskwise/DroidForge/tree/develop/docs
