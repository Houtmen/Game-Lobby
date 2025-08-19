'use client';

import { useState, useEffect } from 'react';
import {
  FaDownload,
  FaCheckCircle,
  FaExclamationTriangle,
  FaCog,
  FaPlay,
  FaQuestionCircle,
  FaWindows,
  FaTerminal,
  FaExternalLinkAlt,
} from 'react-icons/fa';

interface WireGuardSetupProps {
  onInstallComplete: () => void;
  onSkipInstall: () => void;
}

export default function WireGuardSetup({ onInstallComplete, onSkipInstall }: WireGuardSetupProps) {
  const [installationStatus, setInstallationStatus] = useState<
    'checking' | 'not-installed' | 'installed' | 'installing'
  >('checking');
  const [installMethod, setInstallMethod] = useState<'winget' | 'manual' | 'script'>('winget');
  const [error, setError] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    checkWireGuardInstallation();
  }, []);

  const checkWireGuardInstallation = async () => {
    try {
      const response = await fetch('/api/vpn/installation-check');
      const result = await response.json();

      setInstallationStatus(result.isInstalled ? 'installed' : 'not-installed');
    } catch (error) {
      console.error('Failed to check WireGuard installation:', error);
      setInstallationStatus('not-installed');
    }
  };

  const handleWingetInstall = async () => {
    setInstallationStatus('installing');
    setError(null);

    try {
      const response = await fetch('/api/vpn/install-wireguard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ method: 'winget' }),
      });

      const result = await response.json();

      if (result.success) {
        setInstallationStatus('installed');
        onInstallComplete();
      } else {
        setError(result.message);
        setInstallationStatus('not-installed');
      }
    } catch (error) {
      setError('Failed to install WireGuard. Please try manual installation.');
      setInstallationStatus('not-installed');
    }
  };

  const downloadInstallScript = () => {
    const scriptContent = `# WireGuard Auto-Install Script
# Run this PowerShell script as Administrator

Write-Host "Installing WireGuard..." -ForegroundColor Green

# Try winget first
if (Get-Command winget -ErrorAction SilentlyContinue) {
    Write-Host "Using winget to install WireGuard..." -ForegroundColor Yellow
    winget install WireGuard.WireGuard --accept-source-agreements --accept-package-agreements
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "WireGuard installed successfully!" -ForegroundColor Green
        Write-Host "Please return to the game lobby and refresh the page." -ForegroundColor Yellow
        pause
        exit 0
    }
}

# Try Chocolatey as fallback
if (Get-Command choco -ErrorAction SilentlyContinue) {
    Write-Host "Using Chocolatey to install WireGuard..." -ForegroundColor Yellow
    choco install wireguard -y
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "WireGuard installed successfully!" -ForegroundColor Green
        Write-Host "Please return to the game lobby and refresh the page." -ForegroundColor Yellow
        pause
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
    Write-Host "Installation complete! Please return to the game lobby and refresh the page." -ForegroundColor Green
    pause
} catch {
    Write-Host "Failed to download installer. Please visit https://www.wireguard.com/install/ manually." -ForegroundColor Red
    pause
}`;

    const blob = new Blob([scriptContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'install-wireguard.ps1';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  if (installationStatus === 'checking') {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Checking WireGuard installation...</span>
        </div>
      </div>
    );
  }

  if (installationStatus === 'installed') {
    return (
      <div className="bg-green-50 rounded-lg border border-green-200 p-6">
        <div className="flex items-center gap-3">
          <FaCheckCircle className="w-6 h-6 text-green-600" />
          <div>
            <h3 className="font-semibold text-green-900">WireGuard Installed</h3>
            <p className="text-sm text-green-700">VPN client is ready for use</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
      <div className="flex items-center gap-3">
        <FaExclamationTriangle className="w-6 h-6 text-yellow-600" />
        <div>
          <h3 className="font-semibold text-gray-900">WireGuard VPN Required</h3>
          <p className="text-sm text-gray-600">
            This game requires VPN networking to connect with other players
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900">Installation Options</h4>
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            <FaQuestionCircle className="w-4 h-4 inline mr-1" />
            Help
          </button>
        </div>

        {/* Installation Methods */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Automatic Installation */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <FaCog className="w-5 h-5 text-blue-600" />
              <h5 className="font-medium">Automatic (Recommended)</h5>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Install using Windows Package Manager (winget)
            </p>
            <button
              onClick={handleWingetInstall}
              disabled={installationStatus === 'installing'}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {installationStatus === 'installing' ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></div>
                  Installing...
                </>
              ) : (
                <>
                  <FaPlay className="w-4 h-4 inline mr-2" />
                  Install Now
                </>
              )}
            </button>
          </div>

          {/* Script Download */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <FaTerminal className="w-5 h-5 text-purple-600" />
              <h5 className="font-medium">PowerShell Script</h5>
            </div>
            <p className="text-sm text-gray-600 mb-4">Download script to run as administrator</p>
            <button
              onClick={downloadInstallScript}
              className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              <FaDownload className="w-4 h-4 inline mr-2" />
              Download Script
            </button>
          </div>

          {/* Manual Installation */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <FaWindows className="w-5 h-5 text-gray-600" />
              <h5 className="font-medium">Manual Download</h5>
            </div>
            <p className="text-sm text-gray-600 mb-4">Download from official WireGuard website</p>
            <a
              href="https://www.wireguard.com/install/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors inline-flex items-center justify-center"
            >
              <FaExternalLinkAlt className="w-4 h-4 mr-2" />
              Open Website
            </a>
          </div>
        </div>

        {/* Instructions */}
        {showInstructions && (
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h5 className="font-medium text-blue-900 mb-3">Installation Instructions</h5>
            <div className="space-y-2 text-sm text-blue-800">
              <div className="flex items-start gap-2">
                <span className="font-medium">Option 1:</span>
                <span>
                  Click "Install Now" for automatic installation (requires Windows 10+ with winget)
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium">Option 2:</span>
                <span>
                  Download PowerShell script, right-click → "Run with PowerShell" as Administrator
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium">Option 3:</span>
                <span>Visit WireGuard website, download installer, run as Administrator</span>
              </div>
              <div className="mt-3 p-2 bg-blue-100 rounded">
                <strong>After installation:</strong> Refresh this page and the VPN panel will appear
                in your game session.
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <button
            onClick={() => window.location.reload()}
            className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            <FaCheckCircle className="w-4 h-4 inline mr-2" />
            I've Installed WireGuard
          </button>
          <button
            onClick={onSkipInstall}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Skip for Now
          </button>
        </div>
      </div>
    </div>
  );
}
