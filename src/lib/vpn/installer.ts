import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

export class WireGuardInstaller {
  private static readonly WIREGUARD_DOWNLOAD_URL =
    'https://download.wireguard.com/windows-client/wireguard-installer.exe';
  private static readonly WINGET_PACKAGE = 'WireGuard.WireGuard';

  /**
   * Check if WireGuard is installed on the system
   */
  static async isWireGuardInstalled(): Promise<boolean> {
    try {
      await execAsync('wg --version');
      return true;
    } catch {
      // Check if WireGuard GUI is installed
      try {
        const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files';
        const wireguardPath = path.join(programFiles, 'WireGuard', 'wireguard.exe');
        await fs.access(wireguardPath);
        return true;
      } catch {
        return false;
      }
    }
  }

  /**
   * Check if winget is available
   */
  static async isWingetAvailable(): Promise<boolean> {
    try {
      await execAsync('winget --version');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Install WireGuard using winget (preferred method)
   */
  static async installViaWinget(): Promise<{ success: boolean; message: string }> {
    try {
      if (!(await this.isWingetAvailable())) {
        return {
          success: false,
          message: 'Winget is not available. Please use manual installation.',
        };
      }

      const { stdout, stderr } = await execAsync(
        `winget install ${this.WINGET_PACKAGE} --accept-source-agreements --accept-package-agreements`
      );

      return {
        success: true,
        message: 'WireGuard installed successfully via winget',
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Winget installation failed: ${error.message}`,
      };
    }
  }

  /**
   * Auto-import configuration file to WireGuard
   */
  static async importConfiguration(
    configPath: string,
    tunnelName: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Try to import using WireGuard CLI
      await execAsync(`wg-quick up "${configPath}"`);

      return {
        success: true,
        message: `Configuration "${tunnelName}" imported and activated successfully`,
      };
    } catch (error: any) {
      // Fallback: copy to WireGuard data directory
      try {
        const appData =
          process.env['LOCALAPPDATA'] ||
          path.join(process.env['USERPROFILE'] || '', 'AppData', 'Local');
        const wireguardData = path.join(appData, 'WireGuard', 'Data', 'Configurations');

        // Ensure directory exists
        await fs.mkdir(wireguardData, { recursive: true });

        // Copy configuration file
        const targetPath = path.join(wireguardData, `${tunnelName}.conf`);
        await fs.copyFile(configPath, targetPath);

        return {
          success: true,
          message: `Configuration copied to WireGuard. Please activate it manually in the WireGuard app.`,
        };
      } catch (copyError: any) {
        return {
          success: false,
          message: `Failed to import configuration: ${error.message}`,
        };
      }
    }
  }

  /**
   * Open WireGuard application
   */
  static async openWireGuardApp(): Promise<{ success: boolean; message: string }> {
    try {
      const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files';
      const wireguardPath = path.join(programFiles, 'WireGuard', 'wireguard.exe');

      // Start WireGuard application
      exec(`"${wireguardPath}"`);

      return {
        success: true,
        message: 'WireGuard application opened',
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to open WireGuard: ${error.message}`,
      };
    }
  }

  /**
   * Get installation instructions for manual setup
   */
  static getManualInstallInstructions(): string[] {
    return [
      '1. Download WireGuard from: https://www.wireguard.com/install/',
      '2. Run the installer as Administrator',
      '3. Follow the installation wizard',
      '4. Restart your computer if prompted',
      '5. Come back to this page and try again',
    ];
  }

  /**
   * Generate a PowerShell script for easy installation
   */
  static generateInstallScript(): string {
    return `# WireGuard Auto-Install Script
# Run this PowerShell script as Administrator

Write-Host "Installing WireGuard..." -ForegroundColor Green

# Try winget first
if (Get-Command winget -ErrorAction SilentlyContinue) {
    Write-Host "Using winget to install WireGuard..." -ForegroundColor Yellow
    winget install WireGuard.WireGuard --accept-source-agreements --accept-package-agreements
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "WireGuard installed successfully!" -ForegroundColor Green
        exit 0
    }
}

# Try Chocolatey as fallback
if (Get-Command choco -ErrorAction SilentlyContinue) {
    Write-Host "Using Chocolatey to install WireGuard..." -ForegroundColor Yellow
    choco install wireguard -y
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "WireGuard installed successfully!" -ForegroundColor Green
        exit 0
    }
}

# Manual download fallback
Write-Host "Downloading WireGuard installer..." -ForegroundColor Yellow
$url = "https://download.wireguard.com/windows-client/wireguard-installer.exe"
$output = "$env:TEMP\\wireguard-installer.exe"

try {
    Invoke-WebRequest -Uri $url -OutFile $output
    Write-Host "Starting installer..." -ForegroundColor Yellow
    Start-Process -FilePath $output -Wait
    Write-Host "Please complete the installation manually." -ForegroundColor Green
} catch {
    Write-Host "Failed to download installer. Please visit https://www.wireguard.com/install/ manually." -ForegroundColor Red
}`;
  }
}

export default WireGuardInstaller;
