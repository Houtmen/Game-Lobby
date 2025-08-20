import React, { useState, useEffect } from 'react';
import { Play, Square, Monitor, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui';
import { io, Socket } from 'socket.io-client';

interface GameLauncherProps {
  sessionId: string;
  gameId: string;
  gameName: string;
  gameExecutable?: string;
  vpnRequired?: boolean;
  onLaunchStateChange?: (isLaunching: boolean) => void;
}

interface GameStatus {
  isRunning: boolean;
  status: string;
  processId?: number;
  startTime?: string;
  exitCode?: number;
}

export const GameLauncher: React.FC<GameLauncherProps> = ({
  sessionId,
  gameId,
  gameName,
  gameExecutable,
  vpnRequired = false,
  onLaunchStateChange,
}) => {
  const [gameStatus, setGameStatus] = useState<GameStatus | null>(null);
  const [isLaunching, setIsLaunching] = useState(false);
  const [isTerminating, setIsTerminating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCheck, setLastCheck] = useState<Date>(new Date());
  const [socket, setSocket] = useState<Socket | null>(null);

  // Initialize Socket.io connection
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const socketInstance = io({
      auth: { token },
    });

    socketInstance.on('connect', () => {
      console.log('Connected to Socket.io for game launcher');
      // Join the session room to receive game updates
      socketInstance.emit('join_session', sessionId);
    });

    // Listen for game process updates
    socketInstance.on('game_process_update', (data: any) => {
      if (data.sessionId === sessionId) {
        console.log('Received game process update:', data);
        checkGameStatus(); // Refresh status when we get updates
      }
    });

    // Listen for game status changes
    socketInstance.on('game_status_update', (data: any) => {
      if (data.sessionId === sessionId) {
        console.log('Received game status update:', data);
        checkGameStatus();
      }
    });

    // Listen for game launch notifications
    socketInstance.on('game_launched', (data: any) => {
      if (data.sessionId === sessionId) {
        console.log('Game launched notification:', data);
        setGameStatus({
          isRunning: true,
          status: 'running',
          processId: data.data.gameProcess?.processId,
          startTime: data.data.gameProcess?.startTime,
        });
      }
    });

    // Listen for game termination notifications
    socketInstance.on('game_terminated', (data: any) => {
      if (data.sessionId === sessionId) {
        console.log('Game terminated notification:', data);
        setGameStatus({
          isRunning: false,
          status: 'terminated',
        });
      }
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [sessionId]);

  // Check game status on component mount and periodically
  useEffect(() => {
    checkGameStatus();
    const interval = setInterval(checkGameStatus, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, [sessionId]);

  // Notify parent of launch state changes
  useEffect(() => {
    onLaunchStateChange?.(isLaunching);
  }, [isLaunching, onLaunchStateChange]);

  const checkGameStatus = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const response = await fetch(`/api/games/launch?sessionId=${sessionId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const status = await response.json();
        setGameStatus(status);
        setLastCheck(new Date());
      }
    } catch (error) {
      console.error('Failed to check game status:', error);
    }
  };

  const launchGame = async () => {
    if (isLaunching || gameStatus?.isRunning) return;

    setIsLaunching(true);
    setError(null);

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch('/api/games/launch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sessionId,
          gameId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to launch game');
      }

      // Update game status immediately
      setGameStatus({
        isRunning: true,
        status: 'running',
        processId: result.gameProcess.processId,
        startTime: result.gameProcess.startTime,
      });

      // Start checking status more frequently after launch
      setTimeout(checkGameStatus, 1000);
    } catch (error) {
      console.error('Game launch error:', error);
      setError(error instanceof Error ? error.message : 'Failed to launch game');
    } finally {
      setIsLaunching(false);
    }
  };

  const terminateGame = async () => {
    if (!gameStatus?.isRunning || isTerminating) return;

    setIsTerminating(true);
    setError(null);

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`/api/games/launch?sessionId=${sessionId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to terminate game');
      }

      // Update status immediately
      setGameStatus({
        isRunning: false,
        status: 'terminated',
      });

      // Check status after termination
      setTimeout(checkGameStatus, 1000);
    } catch (error) {
      console.error('Game termination error:', error);
      setError(error instanceof Error ? error.message : 'Failed to terminate game');
    } finally {
      setIsTerminating(false);
    }
  };

  const getStatusIcon = () => {
    if (isLaunching) return <Loader2 className="w-4 h-4 animate-spin" />;
    if (isTerminating) return <Loader2 className="w-4 h-4 animate-spin" />;
    if (gameStatus?.isRunning) return <Monitor className="w-4 h-4 text-green-500" />;
    if (gameStatus?.status === 'terminated') return <Square className="w-4 h-4 text-gray-500" />;
    if (error) return <AlertCircle className="w-4 h-4 text-red-500" />;
    return <Play className="w-4 h-4" />;
  };

  const getStatusText = () => {
    if (isLaunching) return 'Launching...';
    if (isTerminating) return 'Terminating...';
    if (gameStatus?.isRunning) return `Running (PID: ${gameStatus.processId})`;
    if (gameStatus?.status === 'terminated') return 'Game ended';
    if (error) return 'Error';
    return 'Ready to launch';
  };

  const getStatusColor = () => {
    if (isLaunching || isTerminating) return 'text-blue-600';
    if (gameStatus?.isRunning) return 'text-green-600';
    if (gameStatus?.status === 'terminated') return 'text-gray-600';
    if (error) return 'text-red-600';
    return 'text-gray-800';
  };

  const isGameRunning = gameStatus?.isRunning || false;
  const canLaunch = !isLaunching && !isGameRunning && !isTerminating;
  const canTerminate = isGameRunning && !isTerminating && !isLaunching;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-lg">{gameName}</h3>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            {getStatusIcon()}
            <span className={getStatusColor()}>{getStatusText()}</span>
          </div>
          {gameExecutable && <p className="text-xs text-gray-500 mt-1">{gameExecutable}</p>}
        </div>

        <div className="flex gap-2">
          <Button onClick={launchGame} disabled={!canLaunch} variant="green">
            {isLaunching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Launch Game
          </Button>

          {isGameRunning && (
            <Button onClick={terminateGame} disabled={!canTerminate} variant="rose">
              {isTerminating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              Stop Game
            </Button>
          )}
        </div>
      </div>

      {/* VPN Status */}
      {vpnRequired && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">VPN Required</span>
          </div>
          <p className="text-xs text-blue-600 mt-1">
            Game will launch with VPN network configuration
          </p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="text-sm font-medium text-red-800">Launch Error</span>
          </div>
          <p className="text-xs text-red-600 mt-1">{error}</p>
          <Button onClick={() => setError(null)} variant="rose" padding="sm">Dismiss</Button>
        </div>
      )}

      {/* Status Info */}
      {gameStatus && (
        <div className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100">
          <div className="flex justify-between">
            <span>Status: {gameStatus.status}</span>
            <span>Last check: {lastCheck.toLocaleTimeString()}</span>
          </div>
          {gameStatus.startTime && (
            <div className="mt-1">Started: {new Date(gameStatus.startTime).toLocaleString()}</div>
          )}
        </div>
      )}
    </div>
  );
};

export default GameLauncher;
