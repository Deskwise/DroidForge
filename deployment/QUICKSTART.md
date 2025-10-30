# DroidForge HTTP MCP Server - Quick Start

Deploy DroidForge as an HTTP MCP server that works with Factory.ai.

## 🚀 30-Second Deploy to Your Azure VPS

```bash
# SSH to your VPS
ssh your-user@your-vps-ip

# Set config (change these!)
export DROIDFORGE_API_KEY="$(openssl rand -hex 32)"
export DOMAIN="droidforge.yourdomain.com"
export ADMIN_EMAIL="admin@yourdomain.com"

# Deploy
curl -fsSL https://raw.githubusercontent.com/Deskwise/DroidForge/develop/deployment/azure-vps/deploy.sh | sudo -E bash
```

**That's it!** DroidForge is now running at `https://droidforge.yourdomain.com`

## ✅ Verify Deployment

```bash
# Check health
curl https://droidforge.yourdomain.com/health

# List tools
curl https://droidforge.yourdomain.com/mcp/tools
```

## 🔌 Add to Factory.ai

### Option 1: Factory CLI

```bash
droid mcp add droidforge https://droidforge.yourdomain.com/mcp --type http --header "Authorization: Bearer YOUR_API_KEY"
```

### Option 2: Factory Bridge `mcp.json`

Location:
- macOS: `~/Library/Application Support/Factory Bridge/mcp.json`
- Windows: `%APPDATA%\Factory Bridge\mcp.json`

Add this:
```json
{
  "mcpServers": {
    "droidforge": {
      "type": "http",
      "url": "https://droidforge.yourdomain.com/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}
```

Save and Factory Bridge will auto-detect!

## 🧪 Test It

In Factory CLI or Web:

```
> Use DroidForge to scan my repository
```

DroidForge tools will now be available!

## 📚 Full Documentation

- Azure VPS: [deployment/azure-vps/README.md](azure-vps/README.md)
- Docker: Use the [Dockerfile](../Dockerfile) for container deployment
- Development: See main [README.md](../README.md)

## 🔒 Security Notes

1. **Generate strong API key**: `openssl rand -hex 32`
2. **Use HTTPS**: Deployment script sets up Let's Encrypt automatically
3. **Firewall**: Only allow ports 80/443
4. **Keep updated**: `cd /opt/droidforge-mcp && git pull && npm run build && systemctl restart droidforge-mcp`

## 💡 What You Just Deployed

You now have:
- ✅ DroidForge MCP Server running as HTTP endpoint
- ✅ Nginx reverse proxy with HTTPS
- ✅ Systemd service (auto-starts on boot)
- ✅ Health monitoring
- ✅ Ready for Factory.ai integration

## Need Help?

- [Full Azure Deployment Guide](azure-vps/README.md)
- [GitHub Issues](https://github.com/Deskwise/DroidForge/issues)
- [Main Documentation](../README.md)
