# VPN Setup Guide for Game Lobby Platform

This guide will help you set up WireGuard VPN for secure multiplayer gaming.

## 🚀 Quick Setup (Recommended)

The game lobby platform now includes **automatic WireGuard installation**!

### For New Users:

1. Join a game session that requires VPN
2. The platform will detect if WireGuard is missing
3. Click **"Install Now"** for automatic installation
4. Follow the prompts - no manual downloads needed!

### What Happens Automatically:

- ✅ WireGuard client installation
- ✅ VPN network creation for your game session
- ✅ Configuration file generation
- ✅ One-click configuration download

## Prerequisites

- Windows 10/11 (64-bit)
- Administrator privileges (for first-time installation)
- Active game session that requires VPN

## Installation Methods

### Option 1: Automatic Installation (Easiest) 🎯

**The platform does this for you!**

1. Join a VPN-enabled game session
2. Click "Install Now" when prompted
3. Grant administrator permission
4. Installation completes automatically

### Option 2: PowerShell Script

1. Download the installation script from the VPN setup panel
2. Right-click the `.ps1` file → "Run with PowerShell"
3. Choose "Run as Administrator" when prompted
4. Script handles everything automatically

### Option 3: Manual Installation (If Automatic Fails)

1. Go to [wireguard.com/install](https://www.wireguard.com/install/)
2. Download "WireGuard for Windows"
3. Run the installer as Administrator
4. Follow the installation wizard
5. Return to the game lobby and refresh the page

## 🎮 Using VPN for Gaming (Now Simplified!)

### Step 1: Join a Game Session

1. Log into the Game Lobby Platform
2. Join a game session that requires VPN
3. The VPN panel appears automatically

### Step 2: Automatic Setup

**If WireGuard is not installed:**

- The platform detects this automatically
- Shows installation options with one-click setup
- Guides you through the process

**If WireGuard is already installed:**

- VPN network creation happens automatically
- Host creates the network for all players
- Configuration files are generated instantly

### Step 3: Download Your Configuration

1. In the game session, look for the "VPN Network" panel
2. Click "Download Config" to get your `.conf` file
3. The file downloads automatically to your Downloads folder

### Step 4: Import Configuration (Semi-Automatic)

**Option A: Automatic Import (If supported)**

- The platform may automatically import the configuration
- WireGuard tunnel appears in your client

**Option B: Manual Import (Fallback)**

1. Open WireGuard application
2. Click "Add Tunnel" → "Add from file"
3. Select your downloaded `.conf` file
4. The tunnel appears in the list

### Step 5: Connect to VPN

1. Wait for the session host to start the VPN network
2. Click on your tunnel in WireGuard
3. Click "Activate" to connect
4. You should see "Active" status and data transfer

### Step 6: Launch Game

1. Once VPN is active, you can launch the game
2. Use the IP addresses provided in the session
3. Other players will be reachable on the VPN network

## Troubleshooting

### WireGuard Won't Start

- Run WireGuard as Administrator
- Check Windows Firewall settings
- Ensure no other VPN software is running

### Can't Connect to Other Players

- Verify VPN tunnel is active
- Check game firewall settings
- Ensure all players are connected to the same VPN network
- Try disabling Windows Defender temporarily

### Performance Issues

- Use a wired internet connection if possible
- Close bandwidth-heavy applications
- Check your VPN tunnel statistics in WireGuard

### Configuration Problems

- Re-download the configuration file
- Check that the server endpoint is correct
- Verify the session is still active

## Network Information

When connected to a VPN session:

- Your VPN IP will be in the 10.x.x.x range
- The server acts as the gateway
- All game traffic goes through the encrypted tunnel
- Each player gets a unique IP address

## Security Notes

- VPN configurations are session-specific
- Configurations expire when sessions end
- Never share your configuration files
- Only connect to trusted game sessions

## Advanced: Manual Configuration

If automatic download doesn't work, you can manually create the configuration:

1. Get your configuration details from the session
2. Create a new file named `session-name.conf`
3. Copy the configuration text provided
4. Import the file into WireGuard

## Support

If you encounter issues:

1. Check this guide first
2. Verify WireGuard installation
3. Contact the session host
4. Check platform documentation

## Performance Tips

- Close other VPN software
- Use quality DNS servers (8.8.8.8, 1.1.1.1)
- Keep WireGuard updated
- Monitor connection quality in the app

---

For more information, visit the [WireGuard official documentation](https://www.wireguard.com/quickstart/).
