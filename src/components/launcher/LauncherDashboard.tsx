'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { io, Socket } from 'socket.io-client';
import {
  Monitor,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RotateCcw,
  Square,
  Play,
  Cpu,
  MemoryStick,
  Clock,
  Users,
  RefreshCw,
  Wifi,
  WifiOff,
} from 'lucide-react';

interface ProcessMetrics {
  processId: number;
  gameId: string;
  sessionId: string;
  userId: string;
  cpuUsage: number;
  memoryUsage: number;
  runtimeSeconds: number;
  startTime: string;
  lastCheck: string;
  isResponding: boolean;
  healthScore: number;
  crashCount: number;
  restartCount: number;
  processName: string;
  commandLine: string;
  workingDirectory: string;
}

interface SessionHealth {
  totalProcesses: number;
  runningProcesses: number;
  healthyProcesses: number;
  warningProcesses: number;
  criticalProcesses: number;
  totalCpuUsage: number;
  totalMemoryUsage: number;
}

interface ActiveSession {
  id: string;
  name: string;
  game: {
    id: string;
    name: string;
  };
  players: Array<{
    user: { username: string };
  }>;
}

export default function LauncherDashboard() {
  const { user } = useAuth();
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [processMetrics, setProcessMetrics] = useState<ProcessMetrics[]>([]);
  const [sessionHealth, setSessionHealth] = useState<Record<string, SessionHealth>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5); // seconds
  const [showAdvancedMetrics, setShowAdvancedMetrics] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const socketRef = useRef<Socket | null>(null);

  const getToken = () => localStorage.getItem('accessToken');

  // Socket.io connection and real-time updates
  useEffect(() => {
    if (!user) return;

    const token = getToken();
    if (!token) return;

    // Initialize socket connection
    const socket = io('/api/socket', {
      auth: {
        token,
      },
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🔗 Launcher Dashboard connected to Socket.io');
      setSocketConnected(true);
      // Join launcher monitoring room
      socket.emit('joinLauncherMonitoring', { userId: user.id });
    });

    socket.on('disconnect', () => {
      console.log('🔌 Launcher Dashboard disconnected from Socket.io');
      setSocketConnected(false);
    });

    // Listen for real-time process updates
    socket.on('processMetricsUpdate', (data) => {
      console.log('📊 Received process metrics update:', data);
      setProcessMetrics((prev) => {
        const updated = [...prev];
        const index = updated.findIndex((p) => p.processId === data.processId);
        if (index >= 0) {
          updated[index] = { ...updated[index], ...data };
        } else {
          updated.push(data);
        }
        return updated;
      });
      setLastUpdate(new Date());
    });

    // Listen for process termination
    socket.on('processTerminated', (data) => {
      console.log('🛑 Process terminated:', data);
      setProcessMetrics((prev) => prev.filter((p) => p.processId !== data.processId));
      setLastUpdate(new Date());
    });

    // Listen for process alerts (crashes, performance issues)
    socket.on('processAlert', (alert) => {
      console.log('🚨 Process alert received:', alert);
      // Trigger immediate data refresh for alerts
      loadDashboardData();
      setLastUpdate(new Date());
    });

    // Listen for session health updates
    socket.on('sessionHealthUpdate', (data) => {
      console.log('🏥 Session health update:', data);
      setSessionHealth((prev) => ({
        ...prev,
        [data.sessionId]: data.health,
      }));
      setLastUpdate(new Date());
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh || !user) return;

    const interval = setInterval(() => {
      loadDashboardData();
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, user]);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const token = getToken();
      if (!token) {
        setError('Authentication required');
        return;
      }

      // Load active sessions
      const sessionsResponse = await fetch('/api/sessions?status=ACTIVE&participant=true', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (sessionsResponse.ok) {
        const sessionsData = await sessionsResponse.json();
        const sessions = sessionsData.sessions || [];
        setActiveSessions(sessions);

        // Load process metrics for each session
        for (const session of sessions) {
          await loadSessionHealth(session.id);
        }
      }

      // Load overall process metrics
      const metricsResponse = await fetch('/api/games/monitor', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        setProcessMetrics(metricsData.processes || []);
      }

      setError(null);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadSessionHealth = async (sessionId: string) => {
    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch(`/api/games/monitor?sessionId=${sessionId}&type=health`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setSessionHealth((prev) => ({
          ...prev,
          [sessionId]: data.health,
        }));
      }
    } catch (error) {
      console.error(`Error loading health for session ${sessionId}:`, error);
    }
  };

  const terminateGame = async (sessionId: string) => {
    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch('/api/games/monitor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'terminate',
          sessionId,
        }),
      });

      if (response.ok) {
        await loadDashboardData(); // Refresh data
      }
    } catch (error) {
      console.error('Error terminating game:', error);
      setError('Failed to terminate game');
    }
  };

  const restartGame = async (sessionId: string) => {
    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch('/api/games/monitor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'restart',
          sessionId,
        }),
      });

      if (response.ok) {
        await loadDashboardData(); // Refresh data
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to restart game');
      }
    } catch (error) {
      console.error('Error restarting game:', error);
      setError('Failed to restart game');
    }
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const getHealthStatusIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="h-5 w-5 text-green-400" />;
    if (score >= 60) return <AlertTriangle className="h-5 w-5 text-yellow-400" />;
    return <XCircle className="h-5 w-5 text-red-400" />;
  };

  const getHealthStatusColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
          <p className="text-gray-300 mb-6">Please log in to access the launcher dashboard.</p>
          <Link
            href="/login"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-blue-400 flex items-center gap-3 mb-2">
              <Monitor className="h-10 w-10" />
              🎮 Launcher Dashboard
              {/* Socket Connection Indicator */}
              <div className="flex items-center gap-2 ml-4">
                {socketConnected ? (
                  <div className="flex items-center gap-1 text-green-400 text-sm">
                    <Wifi className="h-4 w-4" />
                    <span>Live</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-red-400 text-sm">
                    <WifiOff className="h-4 w-4" />
                    <span>Offline</span>
                  </div>
                )}
              </div>
            </h1>
            <div className="flex items-center gap-4">
              <p className="text-gray-300">
                Real-time monitoring and management of your game processes
              </p>
              {lastUpdate && (
                <div className="text-xs text-gray-500">
                  Last update: {lastUpdate.toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>

          {/* Dashboard Controls */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-300">Auto-refresh:</label>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-3 py-1 rounded text-sm font-medium ${
                  autoRefresh ? 'bg-green-600 text-green-100' : 'bg-gray-600 text-gray-100'
                }`}
              >
                {autoRefresh ? 'ON' : 'OFF'}
              </button>
            </div>

            {autoRefresh && (
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-300">Interval:</label>
                <select
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(Number(e.target.value))}
                  className="bg-gray-700 text-white px-2 py-1 rounded text-sm"
                >
                  <option value={2}>2s</option>
                  <option value={5}>5s</option>
                  <option value={10}>10s</option>
                  <option value={30}>30s</option>
                </select>
              </div>
            )}

            <button
              onClick={() => setShowAdvancedMetrics(!showAdvancedMetrics)}
              className={`px-3 py-1 rounded text-sm font-medium ${
                showAdvancedMetrics ? 'bg-purple-600 text-purple-100' : 'bg-gray-600 text-gray-100'
              }`}
            >
              Advanced Metrics
            </button>

            <button
              onClick={loadDashboardData}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white p-2 rounded"
            >
              <RotateCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-800 border border-red-600 text-red-200 px-4 py-3 rounded mb-6">
            <p className="font-bold">Error</p>
            <p>{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Active Sessions</p>
                <p className="text-2xl font-bold text-white">{activeSessions.length}</p>
                {showAdvancedMetrics && (
                  <p className="text-xs text-gray-500">
                    {Object.values(sessionHealth).reduce((sum, h) => sum + h.runningProcesses, 0)}{' '}
                    processes
                  </p>
                )}
              </div>
              <Users className="h-8 w-8 text-blue-400" />
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 border border-gray-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Running Processes</p>
                <p className="text-2xl font-bold text-white">{processMetrics.length}</p>
                {showAdvancedMetrics && (
                  <p className="text-xs text-gray-500">
                    {processMetrics.filter((p) => p.healthScore >= 80).length} healthy
                  </p>
                )}
              </div>
              <Activity className="h-8 w-8 text-green-400" />
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 border border-gray-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total CPU Usage</p>
                <p className="text-2xl font-bold text-white">
                  {processMetrics.reduce((sum, m) => sum + m.cpuUsage, 0).toFixed(1)}%
                </p>
                {showAdvancedMetrics && (
                  <p className="text-xs text-gray-500">
                    Avg:{' '}
                    {(
                      processMetrics.reduce((sum, m) => sum + m.cpuUsage, 0) /
                      Math.max(processMetrics.length, 1)
                    ).toFixed(1)}
                    %
                  </p>
                )}
              </div>
              <Cpu className="h-8 w-8 text-yellow-400" />
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 border border-gray-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Memory</p>
                <p className="text-2xl font-bold text-white">
                  {(processMetrics.reduce((sum, m) => sum + m.memoryUsage, 0) / 1024).toFixed(1)} GB
                </p>
                {showAdvancedMetrics && (
                  <p className="text-xs text-gray-500">
                    Avg:{' '}
                    {(
                      processMetrics.reduce((sum, m) => sum + m.memoryUsage, 0) /
                      Math.max(processMetrics.length, 1) /
                      1024
                    ).toFixed(1)}{' '}
                    GB
                  </p>
                )}
              </div>
              <MemoryStick className="h-8 w-8 text-purple-400" />
            </div>
          </div>
        </div>

        {/* Advanced System Overview - Only show when advanced metrics enabled */}
        {showAdvancedMetrics && processMetrics.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6 mb-8 border border-gray-600">
            <h2 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
              <Activity className="h-5 w-5" />
              System Health Overview
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Health Distribution */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-300">Health Distribution</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-green-400">Healthy (80+)</span>
                    <span className="text-white font-bold">
                      {processMetrics.filter((p) => p.healthScore >= 80).length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-yellow-400">Warning (60-79)</span>
                    <span className="text-white font-bold">
                      {
                        processMetrics.filter((p) => p.healthScore >= 60 && p.healthScore < 80)
                          .length
                      }
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-red-400">Critical (&lt;60)</span>
                    <span className="text-white font-bold">
                      {processMetrics.filter((p) => p.healthScore < 60).length}
                    </span>
                  </div>
                </div>
              </div>

              {/* System Stability */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-300">System Stability</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Total Crashes</span>
                    <span className="text-white font-bold">
                      {processMetrics.reduce((sum, p) => sum + p.crashCount, 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Total Restarts</span>
                    <span className="text-white font-bold">
                      {processMetrics.reduce((sum, p) => sum + p.restartCount, 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Responding</span>
                    <span className="text-white font-bold">
                      {processMetrics.filter((p) => p.isResponding).length}/{processMetrics.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Resource Efficiency */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-300">Resource Efficiency</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Avg CPU/Process</span>
                    <span className="text-white font-bold">
                      {(
                        processMetrics.reduce((sum, p) => sum + p.cpuUsage, 0) /
                        Math.max(processMetrics.length, 1)
                      ).toFixed(1)}
                      %
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Avg Memory/Process</span>
                    <span className="text-white font-bold">
                      {(
                        processMetrics.reduce((sum, p) => sum + p.memoryUsage, 0) /
                        Math.max(processMetrics.length, 1) /
                        1024
                      ).toFixed(1)}{' '}
                      GB
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Avg Uptime</span>
                    <span className="text-white font-bold">
                      {formatUptime(
                        Math.floor(
                          processMetrics.reduce((sum, p) => sum + p.runtimeSeconds, 0) /
                            Math.max(processMetrics.length, 1)
                        )
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Active Sessions */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8 border border-gray-600">
          <h2 className="text-2xl font-semibold mb-4 text-white flex items-center gap-2">
            <Monitor className="h-6 w-6" />
            Active Game Sessions
          </h2>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading sessions...</p>
            </div>
          ) : activeSessions.length === 0 ? (
            <div className="text-center py-8">
              <Monitor className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <p className="text-gray-400 text-lg mb-4">No active game sessions</p>
              <Link
                href="/lobby"
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg inline-block"
              >
                Go to Lobby
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {activeSessions.map((session) => {
                const health = sessionHealth[session.id];
                const sessionProcesses = processMetrics.filter((p) => p.sessionId === session.id);

                return (
                  <div
                    key={session.id}
                    className="bg-gray-700 rounded-lg p-6 border border-gray-600"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-semibold text-white mb-2">{session.name}</h3>
                        <p className="text-gray-300 mb-1">Game: {session.game.name}</p>
                        <p className="text-sm text-gray-400">
                          Players: {session.players.map((p) => p.user.username).join(', ')}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => restartGame(session.id)}
                          className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-2 rounded font-medium text-sm flex items-center gap-1"
                        >
                          <RotateCcw className="h-4 w-4" />
                          Restart
                        </button>
                        <button
                          onClick={() => terminateGame(session.id)}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded font-medium text-sm flex items-center gap-1"
                        >
                          <Square className="h-4 w-4" />
                          Stop
                        </button>
                      </div>
                    </div>

                    {/* Health Summary */}
                    {health && (
                      <div className="bg-gray-800 rounded p-4 mb-4">
                        <h4 className="text-sm font-medium text-gray-300 mb-3">Session Health</h4>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                          <div className="text-center">
                            <div className="text-green-400 font-bold text-lg">
                              {health.healthyProcesses}
                            </div>
                            <div className="text-gray-400">Healthy</div>
                          </div>
                          <div className="text-center">
                            <div className="text-yellow-400 font-bold text-lg">
                              {health.warningProcesses}
                            </div>
                            <div className="text-gray-400">Warning</div>
                          </div>
                          <div className="text-center">
                            <div className="text-red-400 font-bold text-lg">
                              {health.criticalProcesses}
                            </div>
                            <div className="text-gray-400">Critical</div>
                          </div>
                          <div className="text-center">
                            <div className="text-blue-400 font-bold text-lg">
                              {health.totalCpuUsage.toFixed(1)}%
                            </div>
                            <div className="text-gray-400">CPU Usage</div>
                          </div>
                          <div className="text-center">
                            <div className="text-purple-400 font-bold text-lg">
                              {(health.totalMemoryUsage / 1024).toFixed(1)} GB
                            </div>
                            <div className="text-gray-400">Memory</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Process Details */}
                    {sessionProcesses.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium text-gray-300">Running Processes</h4>
                          <button
                            onClick={() =>
                              setSelectedSession(selectedSession === session.id ? null : session.id)
                            }
                            className="text-xs text-blue-400 hover:text-blue-300"
                          >
                            {selectedSession === session.id ? 'Hide Details' : 'Show Details'}
                          </button>
                        </div>

                        {sessionProcesses.map((process) => (
                          <div key={process.processId} className="bg-gray-800 rounded p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {getHealthStatusIcon(process.healthScore)}
                                <div>
                                  <div className="text-white font-medium">
                                    {process.processName}
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    PID: {process.processId}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-4 text-sm">
                                <div className="text-center">
                                  <div className="text-white">{process.cpuUsage.toFixed(1)}%</div>
                                  <div className="text-gray-400 text-xs">CPU</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-white">
                                    {(process.memoryUsage / 1024).toFixed(1)} GB
                                  </div>
                                  <div className="text-gray-400 text-xs">RAM</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-white">
                                    {formatUptime(process.runtimeSeconds)}
                                  </div>
                                  <div className="text-gray-400 text-xs">Uptime</div>
                                </div>
                                <div
                                  className={`text-center ${getHealthStatusColor(process.healthScore)}`}
                                >
                                  <div className="font-bold">{process.healthScore}</div>
                                  <div className="text-gray-400 text-xs">Health</div>
                                </div>
                              </div>
                            </div>

                            {/* Advanced Metrics - Only show when enabled and session is selected */}
                            {showAdvancedMetrics && selectedSession === session.id && (
                              <div className="mt-4 pt-3 border-t border-gray-600">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                                  <div className="space-y-2">
                                    <h5 className="text-gray-300 font-medium">Process Info</h5>
                                    <div className="space-y-1">
                                      <div className="flex justify-between">
                                        <span className="text-gray-400">Game ID:</span>
                                        <span className="text-white">{process.gameId}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-400">User ID:</span>
                                        <span className="text-white">{process.userId}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-400">Start Time:</span>
                                        <span className="text-white">
                                          {new Date(process.startTime).toLocaleTimeString()}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-400">Responding:</span>
                                        <span
                                          className={
                                            process.isResponding ? 'text-green-400' : 'text-red-400'
                                          }
                                        >
                                          {process.isResponding ? 'Yes' : 'No'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <h5 className="text-gray-300 font-medium">Stability</h5>
                                    <div className="space-y-1">
                                      <div className="flex justify-between">
                                        <span className="text-gray-400">Crash Count:</span>
                                        <span
                                          className={`${process.crashCount > 0 ? 'text-red-400' : 'text-green-400'}`}
                                        >
                                          {process.crashCount}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-400">Restart Count:</span>
                                        <span
                                          className={`${process.restartCount > 0 ? 'text-yellow-400' : 'text-green-400'}`}
                                        >
                                          {process.restartCount}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-400">Last Check:</span>
                                        <span className="text-white">
                                          {new Date(process.lastCheck).toLocaleTimeString()}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <h5 className="text-gray-300 font-medium">System Info</h5>
                                    <div className="space-y-1">
                                      <div className="flex justify-between">
                                        <span className="text-gray-400">Working Dir:</span>
                                        <span
                                          className="text-white text-right max-w-32 truncate"
                                          title={process.workingDirectory}
                                        >
                                          {process.workingDirectory}
                                        </span>
                                      </div>
                                      <div className="col-span-full">
                                        <span className="text-gray-400">Command Line:</span>
                                        <div className="text-white text-xs mt-1 p-2 bg-gray-900 rounded max-h-20 overflow-y-auto">
                                          {process.commandLine}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-gray-400 text-sm">
          <p>🔍 Real-time process monitoring with advanced health metrics</p>
          <div className="flex items-center justify-center gap-4 mt-2">
            <span>
              {autoRefresh
                ? `🔄 Auto-refreshing every ${refreshInterval} seconds`
                : '⏸️ Auto-refresh disabled'}
            </span>
            <span>•</span>
            <span>Advanced metrics: {showAdvancedMetrics ? 'ON' : 'OFF'}</span>
            <span>•</span>
            <span className={socketConnected ? 'text-green-400' : 'text-red-400'}>
              Real-time: {socketConnected ? 'Connected' : 'Disconnected'}
            </span>
            {lastUpdate && (
              <>
                <span>•</span>
                <span>Last update: {lastUpdate.toLocaleTimeString()}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
