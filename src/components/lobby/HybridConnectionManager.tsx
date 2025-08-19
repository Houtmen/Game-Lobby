/**
 * Hybrid Network Connection Manager
 * Provides UI for choosing between WebRTC and VPN connections
 */

import React, { useState, useEffect } from 'react';
import { HybridGameNetwork } from '../../lib/networking/hybrid-network';

interface ConnectionManagerProps {
  sessionId: string;
  participantUserIds: string[];
  currentUserId: string;
  gameConfig: {
    gameName: string;
    ports: number[];
    networkRange: string;
    maxPlayers: number;
    requiresVPN?: boolean;
    executablePath?: string;
    launchParameters?: string;
  };
  onConnectionEstablished: (mode: 'webrtc' | 'vpn') => void;
  onConnectionFailed: (error: string) => void;
}

export const HybridConnectionManager: React.FC<ConnectionManagerProps> = ({
  sessionId,
  participantUserIds,
  currentUserId,
  gameConfig,
  onConnectionEstablished,
  onConnectionFailed,
}) => {
  const [connectionStatus, setConnectionStatus] = useState<'none' | 'connecting' | 'connected'>(
    'none'
  );
  const [connectionMode, setConnectionMode] = useState<'none' | 'webrtc' | 'vpn'>('none');
  const [showOptions, setShowOptions] = useState(false);
  const [networkManager, setNetworkManager] = useState<HybridGameNetwork | null>(null);
  const [webrtcAvailable, setWebrtcAvailable] = useState(true);
  const [vpnAvailable, setVpnAvailable] = useState(false);

  useEffect(() => {
    // Initialize network manager
    const manager = new HybridGameNetwork(currentUserId);
    setNetworkManager(manager);

    // Check VPN availability
    checkVPNAvailability();

    return () => {
      if (manager) {
        manager.disconnect().catch(console.error);
      }
    };
  }, [currentUserId]);

  const checkVPNAvailability = async () => {
    try {
      // Check VPN availability via API instead of direct import
      const response = await fetch('/api/vpn/installation-check');
      if (response.ok) {
        const result = await response.json();
        setVpnAvailable(result.available || false);
      } else {
        setVpnAvailable(false);
      }
    } catch (error) {
      console.error('VPN availability check failed:', error);
      setVpnAvailable(false);
    }
  };

  const handleSmartConnect = async () => {
    if (!networkManager) return;

    setConnectionStatus('connecting');
    setShowOptions(false);

    try {
      console.log('🤖 Attempting smart connection...');
      console.log('🎮 Game Config:', gameConfig);

      // Check if game requires VPN
      if (gameConfig.requiresVPN && !vpnAvailable) {
        throw new Error(
          'This game requires VPN but VPN is not available. Please install WireGuard.'
        );
      }

      const result = await networkManager.smartConnect(sessionId, participantUserIds, gameConfig);

      setConnectionMode(result.mode);
      setConnectionStatus('connected');

      if (result.mode !== 'none') {
        onConnectionEstablished(result.mode as 'webrtc' | 'vpn');
      }

      if (result.mode === 'webrtc') {
        console.log('🌐 Connected via WebRTC - instant connection!');
        console.log('🎯 Network ports configured:', gameConfig.ports);
      } else if (result.mode === 'vpn') {
        console.log('🔒 Connected via VPN - secure tunnel established');
        console.log('🎯 Game-specific VPN network created for ports:', gameConfig.ports);
      }

      // Show game launch instructions
      if (gameConfig.executablePath) {
        console.log('🎮 Game executable:', gameConfig.executablePath);
        if (gameConfig.launchParameters) {
          console.log('🎮 Launch parameters:', gameConfig.launchParameters);
        }
      }
    } catch (error) {
      console.error('Smart connection failed:', error);
      setConnectionStatus('none');
      onConnectionFailed(`Smart connection failed: ${error}`);
    }
  };

  const handleForceVPN = async () => {
    if (!networkManager) return;

    setConnectionStatus('connecting');
    setShowOptions(false);

    try {
      console.log('🔒 Forcing VPN connection...');
      const result = await networkManager.connectViaVPN(sessionId, participantUserIds, gameConfig);

      if (result.success) {
        setConnectionMode('vpn');
        setConnectionStatus('connected');
        onConnectionEstablished('vpn');
        console.log('🔒 VPN connection established successfully');
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('VPN connection failed:', error);
      setConnectionStatus('none');
      onConnectionFailed(`VPN connection failed: ${error}`);
    }
  };

  const handleDisconnect = async () => {
    if (!networkManager) return;

    try {
      await networkManager.disconnect();
      setConnectionStatus('none');
      setConnectionMode('none');
      console.log('👋 Disconnected from game session');
    } catch (error) {
      console.error('Disconnect failed:', error);
    }
  };

  const getConnectionStatusDisplay = () => {
    switch (connectionStatus) {
      case 'none':
        return (
          <div className="text-gray-500">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
              <span>Not connected</span>
            </div>
          </div>
        );
      case 'connecting':
        return (
          <div className="text-yellow-600">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
              <span>Connecting...</span>
            </div>
          </div>
        );
      case 'connected':
        return (
          <div className="text-green-600">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Connected via {connectionMode === 'webrtc' ? '🌐 WebRTC' : '🔒 VPN'}</span>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Network Connection</h3>
        {getConnectionStatusDisplay()}
      </div>

      {connectionStatus === 'none' && (
        <div className="space-y-4">
          <div className="text-sm text-gray-600 mb-4">
            <div>
              🎮 <strong>{gameConfig.gameName}</strong>
            </div>
            <div className="mt-1">
              {gameConfig.requiresVPN ? (
                <span className="text-purple-600">
                  🔒 This game requires VPN for best compatibility
                </span>
              ) : (
                <span className="text-green-600">
                  🌐 This game supports WebRTC for instant connection
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Network ports: {gameConfig.ports.join(', ')}
            </div>
          </div>

          {/* Smart Connect Option */}
          <button
            onClick={handleSmartConnect}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
          >
            <span>🤖</span>
            <span>Smart Connect (Recommended)</span>
          </button>
          <div className="text-xs text-gray-500 -mt-2 px-4">
            Automatically chooses the best connection method
          </div>

          {/* Advanced Options Toggle */}
          <button
            onClick={() => setShowOptions(!showOptions)}
            className="text-sm text-gray-600 hover:text-gray-800 underline"
          >
            {showOptions ? 'Hide' : 'Show'} advanced options
          </button>

          {/* Advanced Connection Options */}
          {showOptions && (
            <div className="space-y-3 pt-4 border-t border-gray-200">
              <div className="text-sm font-medium text-gray-700 mb-2">Manual Connection:</div>

              {/* WebRTC Option */}
              <button
                onClick={() => {
                  /* Force WebRTC logic could be added */
                }}
                disabled={!webrtcAvailable}
                className={`w-full ${
                  webrtcAvailable
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                } font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2`}
              >
                <span>🌐</span>
                <span>WebRTC Only (Instant)</span>
              </button>
              <div className="text-xs text-gray-500 -mt-1 px-4">
                Browser-based P2P connection, no downloads needed
              </div>

              {/* VPN Option */}
              <button
                onClick={handleForceVPN}
                disabled={!vpnAvailable}
                className={`w-full ${
                  vpnAvailable
                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                } font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2`}
              >
                <span>🔒</span>
                <span>VPN Only (Secure)</span>
              </button>
              <div className="text-xs text-gray-500 -mt-1 px-4">
                {vpnAvailable
                  ? 'Secure tunnel for game traffic only'
                  : 'VPN not available - WireGuard not installed'}
              </div>
            </div>
          )}
        </div>
      )}

      {connectionStatus === 'connected' && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-sm text-green-800">
              <div className="font-medium mb-1">✅ Network ready for {gameConfig.gameName}</div>
              <div className="text-green-600 mb-2">
                {connectionMode === 'webrtc'
                  ? '🌐 Direct browser connection - low latency, no downloads'
                  : '🔒 Secure VPN tunnel - only game traffic is routed'}
              </div>
              <div className="text-xs text-gray-600">
                Network ports configured: {gameConfig.ports.join(', ')}
              </div>
            </div>
          </div>

          {/* Game Launch Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm text-blue-800">
              <div className="font-medium mb-2">🎮 Ready to Launch Game</div>

              {gameConfig.executablePath ? (
                <div className="space-y-2">
                  <div className="text-blue-700">
                    <strong>Game:</strong> {gameConfig.gameName}
                  </div>
                  <div className="text-blue-600 text-xs font-mono bg-white p-2 rounded border">
                    {gameConfig.executablePath}
                    {gameConfig.launchParameters && (
                      <div className="mt-1 text-blue-500">
                        Parameters: {gameConfig.launchParameters}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-blue-600 mt-2">
                    💡 Launch your game now! The network is configured to route traffic through the{' '}
                    {connectionMode === 'webrtc' ? 'WebRTC' : 'VPN'} connection.
                  </div>
                </div>
              ) : (
                <div className="text-blue-700">
                  <div className="mb-2">
                    Launch <strong>{gameConfig.gameName}</strong> manually:
                  </div>
                  <div className="text-xs text-blue-600">
                    💡 Start your game and join the multiplayer session. Network traffic will be
                    automatically routed through the{' '}
                    {connectionMode === 'webrtc' ? 'WebRTC' : 'VPN'} connection.
                  </div>
                </div>
              )}

              {gameConfig.requiresVPN && connectionMode === 'webrtc' && (
                <div className="mt-3 p-2 bg-yellow-100 border border-yellow-300 rounded text-yellow-800 text-xs">
                  ⚠️ Note: This game typically requires VPN, but you're connected via WebRTC. If you
                  experience issues, try disconnecting and using VPN mode.
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            {gameConfig.executablePath && (
              <button
                onClick={() => {
                  // Add game launcher logic here
                  console.log('🚀 Launching game:', gameConfig.executablePath);
                  console.log('🎯 With parameters:', gameConfig.launchParameters);
                  // For now, just show instructions - actual launching would need backend API
                  alert(
                    `Game launcher not implemented yet. Please launch:\n${gameConfig.executablePath}\n${gameConfig.launchParameters || ''}`
                  );
                }}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
              >
                🚀 Launch Game
              </button>
            )}

            <button
              onClick={handleDisconnect}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
            >
              Disconnect
            </button>
          </div>
        </div>
      )}

      {connectionStatus === 'connecting' && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Establishing connection...</span>
        </div>
      )}

      {/* Connection Info */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 space-y-1">
          <div>Game: {gameConfig.gameName}</div>
          <div>Players: {participantUserIds.length}</div>
          <div>Session: {sessionId.substring(0, 8)}...</div>
        </div>
      </div>
    </div>
  );
};
