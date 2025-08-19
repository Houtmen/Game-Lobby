'use client';

import { useState, useEffect } from 'react';
import {
  FaShieldAlt,
  FaPlay,
  FaStop,
  FaDownload,
  FaNetworkWired,
  FaUsers,
  FaExclamationTriangle,
  FaCheckCircle,
  FaCog,
  FaInfoCircle,
} from 'react-icons/fa';
import WireGuardSetup from './WireGuardSetup';

interface VPNSession {
  id: string;
  sessionId: string;
  networkId: string;
  isActive: boolean;
  createdAt: string;
  participants: string[];
}

interface VPNStatus {
  wireGuardAvailable: boolean;
  activeSessions: number;
  userVPNSessions: Array<{
    networkId: string;
    sessionId: string;
    isActive: boolean;
    createdAt: string;
    participantCount: number;
  }>;
}

interface VPNManagerProps {
  sessionId: string;
  gameRequiresVPN: boolean;
  isHost: boolean;
  participants: Array<{ userId: string; username: string }>;
  serverEndpoint?: string;
}

export default function VPNManager({
  sessionId,
  gameRequiresVPN,
  isHost,
  participants,
  serverEndpoint = 'your-server-ip.com',
}: VPNManagerProps) {
  const [vpnSession, setVPNSession] = useState<VPNSession | null>(null);
  const [vpnStatus, setVPNStatus] = useState<VPNStatus | null>(null);
  const [wireGuardInstalled, setWireGuardInstalled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    if (gameRequiresVPN) {
      checkWireGuardInstallation();
      checkVPNStatus();
    }
  }, [gameRequiresVPN]);

  const checkWireGuardInstallation = async () => {
    try {
      const response = await fetch('/api/vpn/installation-check');
      if (response.ok) {
        const result = await response.json();
        setWireGuardInstalled(result.isInstalled);
      }
    } catch (error) {
      console.error('Failed to check WireGuard installation:', error);
      setWireGuardInstalled(false);
    }
  };

  const checkVPNStatus = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/vpn/status', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const status = await response.json();
        setVPNStatus(status);

        // Check if there's an active VPN for this session
        const sessionVPN = status.userVPNSessions.find((vpn: any) => vpn.sessionId === sessionId);
        if (sessionVPN) {
          setVPNSession({
            id: sessionVPN.networkId,
            sessionId: sessionVPN.sessionId,
            networkId: sessionVPN.networkId,
            isActive: sessionVPN.isActive,
            createdAt: sessionVPN.createdAt,
            participants: participants.map((p) => p.userId),
          });
        }
      }
    } catch (error) {
      console.error('Failed to check VPN status:', error);
    }
  };

  const createVPNNetwork = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/vpn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sessionId }),
      });

      if (response.ok) {
        const result = await response.json();
        setVPNSession(result.vpnSession);
        await checkVPNStatus();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create VPN network');
      }
    } catch (error) {
      setError('Failed to create VPN network');
      console.error('VPN creation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const startVPN = async () => {
    if (!vpnSession) return;

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/vpn/${vpnSession.networkId}/start`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setVPNSession((prev) => (prev ? { ...prev, isActive: true } : null));
        await checkVPNStatus();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to start VPN');
      }
    } catch (error) {
      setError('Failed to start VPN');
      console.error('VPN start error:', error);
    } finally {
      setLoading(false);
    }
  };

  const stopVPN = async () => {
    if (!vpnSession) return;

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/vpn/${vpnSession.networkId}/start`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setVPNSession((prev) => (prev ? { ...prev, isActive: false } : null));
        await checkVPNStatus();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to stop VPN');
      }
    } catch (error) {
      setError('Failed to stop VPN');
      console.error('VPN stop error:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadVPNConfig = async () => {
    if (!vpnSession) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(
        `/api/vpn/${vpnSession.networkId}/config?endpoint=${encodeURIComponent(serverEndpoint)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${vpnSession.networkId}-client.conf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to download VPN config');
      }
    } catch (error) {
      setError('Failed to download VPN config');
      console.error('VPN config download error:', error);
    }
  };

  if (!gameRequiresVPN) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="flex items-center gap-2 text-gray-600">
          <FaInfoCircle className="w-4 h-4" />
          <span className="text-sm">This game does not require VPN networking</span>
        </div>
      </div>
    );
  }

  // Show WireGuard setup if not installed
  if (wireGuardInstalled === false) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-4">
          <FaShieldAlt className="w-6 h-6 text-blue-600" />
          <div>
            <h3 className="font-semibold text-gray-900">VPN Network Setup</h3>
            <p className="text-sm text-gray-600">WireGuard VPN client required</p>
          </div>
        </div>
        <WireGuardSetup
          onInstallComplete={() => {
            setWireGuardInstalled(true);
            checkVPNStatus();
          }}
          onSkipInstall={() => setWireGuardInstalled(null)}
        />
      </div>
    );
  }

  // Loading state for WireGuard check
  if (wireGuardInstalled === null) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Checking VPN requirements...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FaShieldAlt className="w-6 h-6 text-blue-600" />
          <div>
            <h3 className="font-semibold text-gray-900">VPN Network</h3>
            <p className="text-sm text-gray-600">Secure network for multiplayer gaming</p>
          </div>
        </div>

        <button
          onClick={() => setShowInstructions(!showInstructions)}
          className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
          title="VPN Instructions"
        >
          <FaInfoCircle className="w-4 h-4" />
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
          <FaExclamationTriangle className="w-4 h-4 text-red-600" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      {/* VPN Status */}
      {vpnStatus && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">WireGuard Status</span>
            <div className="flex items-center gap-2">
              {vpnStatus.wireGuardAvailable ? (
                <>
                  <FaCheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-700">Available</span>
                </>
              ) : (
                <>
                  <FaExclamationTriangle className="w-4 h-4 text-red-600" />
                  <span className="text-sm text-red-700">Not Available</span>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Active Sessions:</span>
              <span className="ml-2 font-medium">{vpnStatus.activeSessions}</span>
            </div>
            <div>
              <span className="text-gray-600">Your Sessions:</span>
              <span className="ml-2 font-medium">{vpnStatus.userVPNSessions.length}</span>
            </div>
          </div>
        </div>
      )}

      {/* VPN Session Info */}
      {vpnSession ? (
        <div className="space-y-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FaNetworkWired className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-blue-900">Network: {vpnSession.networkId}</span>
              </div>
              <div className="flex items-center gap-2">
                {vpnSession.isActive ? (
                  <>
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-green-700">Active</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    <span className="text-sm text-gray-600">Inactive</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm text-blue-800">
              <div className="flex items-center gap-1">
                <FaUsers className="w-3 h-3" />
                <span>{participants.length} participants</span>
              </div>
              <div>Created: {new Date(vpnSession.createdAt).toLocaleString()}</div>
            </div>
          </div>

          {/* VPN Controls */}
          <div className="flex gap-3">
            {isHost && (
              <>
                {!vpnSession.isActive ? (
                  <button
                    onClick={startVPN}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    <FaPlay className="w-4 h-4" />
                    Start VPN
                  </button>
                ) : (
                  <button
                    onClick={stopVPN}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    <FaStop className="w-4 h-4" />
                    Stop VPN
                  </button>
                )}
              </>
            )}

            <button
              onClick={downloadVPNConfig}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <FaDownload className="w-4 h-4" />
              Download Config
            </button>
          </div>
        </div>
      ) : (
        /* Create VPN Network */
        isHost && (
          <div className="text-center py-6">
            <p className="text-gray-600 mb-4">No VPN network created for this session</p>
            <button
              onClick={createVPNNetwork}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors mx-auto"
            >
              <FaShieldAlt className="w-4 h-4" />
              Create VPN Network
            </button>
          </div>
        )
      )}

      {/* Instructions Modal */}
      {showInstructions && (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h4 className="font-medium text-gray-900 mb-3">VPN Setup Instructions</h4>
          <div className="space-y-2 text-sm text-gray-700">
            <div className="flex items-start gap-2">
              <span className="font-medium text-blue-600">1.</span>
              <span>Install WireGuard on your system from wireguard.com</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-medium text-blue-600">2.</span>
              <span>Download your client configuration file</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-medium text-blue-600">3.</span>
              <span>Import the .conf file into WireGuard</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-medium text-blue-600">4.</span>
              <span>Activate the tunnel when the host starts the VPN</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-medium text-blue-600">5.</span>
              <span>Launch the game - you'll be connected to other players</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
