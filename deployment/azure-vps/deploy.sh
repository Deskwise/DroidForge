#!/bin/bash
# DroidForge Azure VPS Deployment Script

set -e

echo "🚀 DroidForge HTTP MCP Server - Azure VPS Deployment"
echo "===================================================="

# Configuration
APP_NAME="droidforge-mcp"
APP_DIR="/opt/$APP_NAME"
SERVICE_NAME="droidforge-mcp"
USER="droidforge"
PORT="${PORT:-3000}"
API_KEY="${DROIDFORGE_API_KEY:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    error "Please run as root (use sudo)"
fi

# Step 1: Install dependencies
info "Installing system dependencies..."
apt-get update
apt-get install -y curl git nginx certbot python3-certbot-nginx

# Step 2: Install Node.js (if not installed)
if ! command -v node &> /dev/null; then
    info "Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
else
    info "Node.js already installed: $(node -v)"
fi

# Step 3: Create app user
if ! id "$USER" &>/dev/null; then
    info "Creating application user..."
    useradd -r -s /bin/bash -d $APP_DIR -m $USER
else
    info "User $USER already exists"
fi

# Step 4: Clone/update repository
info "Setting up application directory..."
if [ -d "$APP_DIR/.git" ]; then
    info "Updating existing repository..."
    cd $APP_DIR
    sudo -u $USER git pull origin develop
else
    info "Cloning repository..."
    sudo -u $USER git clone https://github.com/Deskwise/DroidForge.git $APP_DIR
    cd $APP_DIR
    sudo -u $USER git checkout develop
fi

# Step 5: Install dependencies and build
info "Installing dependencies..."
sudo -u $USER npm ci

info "Building application..."
sudo -u $USER npm run build

# Step 6: Create environment file
info "Creating environment file..."
cat > $APP_DIR/.env <<EOF
PORT=$PORT
DROIDFORGE_API_KEY=$API_KEY
NODE_ENV=production
EOF
chown $USER:$USER $APP_DIR/.env
chmod 600 $APP_DIR/.env

# Step 7: Create systemd service
info "Creating systemd service..."
cat > /etc/systemd/system/$SERVICE_NAME.service <<EOF
[Unit]
Description=DroidForge HTTP MCP Server
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$APP_DIR
EnvironmentFile=$APP_DIR/.env
ExecStart=/usr/bin/node $APP_DIR/dist/mcp/http-server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=$SERVICE_NAME

[Install]
WantedBy=multi-user.target
EOF

# Step 8: Configure nginx
info "Configuring nginx reverse proxy..."
DOMAIN="${DOMAIN:-_}"
cat > /etc/nginx/sites-available/$APP_NAME <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://localhost:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Increase timeouts for long-running operations
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /health {
        proxy_pass http://localhost:$PORT/health;
        access_log off;
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/$APP_NAME

# Test nginx config
nginx -t || error "Nginx configuration test failed"

# Step 9: Start services
info "Starting services..."
systemctl daemon-reload
systemctl enable $SERVICE_NAME
systemctl restart $SERVICE_NAME
systemctl restart nginx

# Step 10: Check status
info "Checking service status..."
sleep 3
if systemctl is-active --quiet $SERVICE_NAME; then
    info "✅ DroidForge MCP Server is running"
else
    error "❌ Service failed to start. Check logs: journalctl -u $SERVICE_NAME -n 50"
fi

# Step 11: Setup HTTPS (if domain provided)
if [ "$DOMAIN" != "_" ] && [ -n "$DOMAIN" ]; then
    info "Setting up HTTPS with Let's Encrypt..."
    certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email ${ADMIN_EMAIL:-admin@$DOMAIN} || warn "HTTPS setup failed. You can run manually: certbot --nginx -d $DOMAIN"
fi

# Print summary
echo ""
echo "===================================================="
info "✅ Deployment complete!"
echo "===================================================="
echo ""
echo "Service Status:"
systemctl status $SERVICE_NAME --no-pager | head -n 10
echo ""
echo "📍 Endpoints:"
echo "   Health: http://localhost:$PORT/health"
echo "   MCP:    http://localhost:$PORT/mcp"
echo "   Tools:  http://localhost:$PORT/mcp/tools"
echo ""
if [ "$DOMAIN" != "_" ] && [ -n "$DOMAIN" ]; then
    echo "   Public: https://$DOMAIN/mcp"
fi
echo ""
echo "🔐 API Key: ${API_KEY:-NOT SET (authentication disabled)}"
echo ""
echo "📝 Useful commands:"
echo "   View logs:    journalctl -u $SERVICE_NAME -f"
echo "   Restart:      systemctl restart $SERVICE_NAME"
echo "   Stop:         systemctl stop $SERVICE_NAME"
echo "   Status:       systemctl status $SERVICE_NAME"
echo ""
echo "💡 To add to Factory CLI:"
if [ -n "$API_KEY" ]; then
    echo "   /mcp add --type http droidforge https://$DOMAIN/mcp -H \"Authorization: Bearer $API_KEY\""
else
    echo "   /mcp add --type http droidforge https://$DOMAIN/mcp"
fi
echo ""
