import { exec, spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { getProcessMonitor, ProcessMetrics, ProcessAlert } from './processMonitor';

const execAsync = promisify(exec);

export interface GameLaunchConfig {
  gameExecutable: string;
  gameDirectory: string;
  launchParameters: string[];
  vpnConfig?: {
    networkId: string;
    clientIP: string;
    isRequired: boolean;
  };
  networkSettings?: {
    serverIP?: string;
    port?: number;
    protocol?: 'tcp' | 'udp' | 'ipx';
  };
  monitoring?: {
    enabled: boolean;
    autoRestart: boolean;
    resourceLimits?: {
      maxCpuUsage?: number;
      maxMemoryUsage?: number;
    };
  };
}

export interface GameProcess {
  sessionId: string;
  userId: string;
  processId: number;
  gameId: string;
  startTime: Date;
  status: 'starting' | 'running' | 'terminated' | 'error';
  exitCode?: number;
  process?: ChildProcess;
  metrics?: ProcessMetrics;
  autoRestart?: boolean;
  restartCount?: number;
}

export class GameLauncher {
  private activeProcesses: Map<string, GameProcess> = new Map();
  private processCleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup terminated processes every 30 seconds
    this.processCleanupInterval = setInterval(() => {
      this.cleanupTerminatedProcesses();
    }, 30000);

    // Set up process monitoring event listeners
    this.setupProcessMonitoringListeners();
  }

  /**
   * Setup event listeners for process monitoring
   */
  private setupProcessMonitoringListeners(): void {
  const processMonitor = getProcessMonitor();
  processMonitor.on('process_crash', (alert: ProcessAlert) => {
      const processKey = this.findProcessKey(alert.processId);
      if (processKey) {
        const gameProcess = this.activeProcesses.get(processKey);
        if (gameProcess) {
          console.log(`🔥 Game process crashed: ${alert.gameId} (PID: ${alert.processId})`);
          gameProcess.status = 'error';

          // Auto-restart if enabled
          if (gameProcess.autoRestart) {
            this.handleAutoRestart(gameProcess, alert);
          }
        }
      }
    });

  processMonitor.on('process_alert', (alert: ProcessAlert) => {
      console.log(`⚠️ Process alert: ${alert.type} for PID ${alert.processId} - ${alert.message}`);
    });

  // Recovery events can be emitted by health checker in the future
  }

  /**
   * Handle automatic restart of crashed processes
   */
  private async handleAutoRestart(
    gameProcess: GameProcess,
    crashAlert: ProcessAlert
  ): Promise<void> {
    try {
      const maxRestarts = 3;
      const restartCount = (gameProcess.restartCount || 0) + 1;

      if (restartCount > maxRestarts) {
        console.log(`🚫 Max restart attempts reached for game ${gameProcess.gameId}, giving up`);
        gameProcess.status = 'error';
        return;
      }

      console.log(
        `🔄 Auto-restarting game ${gameProcess.gameId} (attempt ${restartCount}/${maxRestarts})`
      );

      // Wait a bit before restarting
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Get the original launch config and restart
      const originalConfig = this.getGameLaunchConfig(gameProcess);
      if (originalConfig) {
        const newProcess = await this.launchGame(
          gameProcess.sessionId,
          gameProcess.userId,
          gameProcess.gameId,
          { ...originalConfig, monitoring: { enabled: true, autoRestart: true } }
        );
        newProcess.restartCount = restartCount;
      }
    } catch (error) {
      console.error(`Failed to auto-restart game ${gameProcess.gameId}:`, error);
      gameProcess.status = 'error';
    }
  }

  /**
   * Find process key by process ID
   */
  private findProcessKey(processId: number): string | undefined {
    for (const [key, process] of this.activeProcesses) {
      if (process.processId === processId) {
        return key;
      }
    }
    return undefined;
  }

  /**
   * Get stored launch configuration for a game process (simplified version)
   */
  private getGameLaunchConfig(gameProcess: GameProcess): GameLaunchConfig | null {
    // This would typically be stored when the game is launched
    // For now, return a basic config - in production, this should be properly stored
    return {
      gameExecutable: '', // Would need to be stored
      gameDirectory: '',
      launchParameters: [],
      monitoring: { enabled: true, autoRestart: true },
    };
  }

  /**
   * Launch a game with the provided configuration
   */
  async launchGame(
    sessionId: string,
    userId: string,
    gameId: string,
    config: GameLaunchConfig
  ): Promise<GameProcess> {
    const processKey = `${sessionId}-${userId}`;

    // Check if user already has a game running for this session
    if (this.activeProcesses.has(processKey)) {
      const existingProcess = this.activeProcesses.get(processKey)!;
      if (existingProcess.status === 'running') {
        throw new Error('Game is already running for this session');
      }
    }

    // Validate game executable exists
    if (!(await this.validateGameExecutable(config.gameExecutable))) {
      throw new Error(`Game executable not found: ${config.gameExecutable}`);
    }

    // Validate VPN connection if required
    if (config.vpnConfig?.isRequired) {
      if (!(await this.validateVPNConnection(config.vpnConfig.networkId))) {
        throw new Error('VPN connection required but not active');
      }
    }

    // Prepare launch parameters
    const launchArgs = this.prepareLaunchArguments(config);

    // Create process record
    const gameProcess: GameProcess = {
      sessionId,
      userId,
      processId: 0, // Will be set when process starts
      gameId,
      startTime: new Date(),
      status: 'starting',
    };

    try {
      // Launch the game process
      const childProcess = spawn(config.gameExecutable, launchArgs, {
        cwd: config.gameDirectory,
        detached: false,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          // Add VPN-specific environment variables if needed
          ...(config.vpnConfig && {
            VPN_CLIENT_IP: config.vpnConfig.clientIP,
            VPN_NETWORK_ID: config.vpnConfig.networkId,
          }),
        },
      });

      gameProcess.processId = childProcess.pid || 0;
      gameProcess.process = childProcess;
      gameProcess.status = 'running';

      // Set up process event handlers
      this.setupProcessHandlers(gameProcess, childProcess);

      // Add to process monitoring
      if (childProcess.pid) {
        getProcessMonitor().addProcess(
          childProcess.pid,
          gameId,
          sessionId,
          userId,
          path.basename(config.gameExecutable),
          `${config.gameExecutable} ${launchArgs.join(' ')}`,
          config.gameDirectory
        );
      }

      // Store the process
      this.activeProcesses.set(processKey, gameProcess);

      console.log(`Game launched successfully: ${gameId} (PID: ${childProcess.pid})`);
      return gameProcess;
    } catch (error) {
      gameProcess.status = 'error';
      throw new Error(`Failed to launch game: ${error}`);
    }
  }

  /**
   * Terminate a running game process
   */
  async terminateGame(sessionId: string, userId: string): Promise<boolean> {
    const processKey = `${sessionId}-${userId}`;
    const gameProcess = this.activeProcesses.get(processKey);

    if (!gameProcess || !gameProcess.process) {
      return false;
    }

    try {
      // Try graceful termination first
      gameProcess.process.kill('SIGTERM');

      // Wait a bit for graceful shutdown
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Force kill if still running
      if (!gameProcess.process.killed) {
        gameProcess.process.kill('SIGKILL');
      }

      gameProcess.status = 'terminated';

      // Remove from process monitoring
      if (gameProcess.processId) {
        getProcessMonitor().removeProcess(gameProcess.processId);
      }

      return true;
    } catch (error) {
      console.error(`Failed to terminate game process: ${error}`);
      return false;
    }
  }

  /**
   * Get enhanced game process information with health metrics
   */
  getEnhancedGameProcess(
    sessionId: string,
    userId: string
  ): (GameProcess & { metrics?: ProcessMetrics }) | undefined {
    const processKey = `${sessionId}-${userId}`;
    const gameProcess = this.activeProcesses.get(processKey);

    if (!gameProcess) {
      return undefined;
    }

    // Get current metrics from process monitor
  const metrics = getProcessMonitor().getProcessMetrics(gameProcess.processId);

    return {
      ...gameProcess,
      metrics,
    };
  }

  /**
   * Get process health summary for a session
   */
  getSessionHealthSummary(sessionId: string): {
    totalProcesses: number;
    runningProcesses: number;
    healthyProcesses: number;
    warningProcesses: number;
    criticalProcesses: number;
    totalCpuUsage: number;
    totalMemoryUsage: number;
  } {
    const sessionProcesses = Array.from(this.activeProcesses.values()).filter(
      (process) => process.sessionId === sessionId
    );

    let healthy = 0;
    let warning = 0;
    let critical = 0;
    let totalCpu = 0;
    let totalMemory = 0;
    let running = 0;

    sessionProcesses.forEach((process) => {
      if (process.status === 'running') {
        running++;
  const metrics = getProcessMonitor().getProcessMetrics(process.processId);
        if (metrics) {
          totalCpu += metrics.cpuUsage;
          totalMemory += metrics.memoryUsage;

          // Determine health status based on metrics
          if (metrics.healthScore >= 80) {
            healthy++;
          } else if (metrics.healthScore >= 60) {
            warning++;
          } else {
            critical++;
          }
        }
      }
    });

    return {
      totalProcesses: sessionProcesses.length,
      runningProcesses: running,
      healthyProcesses: healthy,
      warningProcesses: warning,
      criticalProcesses: critical,
      totalCpuUsage: totalCpu,
      totalMemoryUsage: totalMemory,
    };
  }

  /**
   * Force restart a game process
   */
  async restartGame(sessionId: string, userId: string): Promise<GameProcess> {
    const processKey = `${sessionId}-${userId}`;
    const existingProcess = this.activeProcesses.get(processKey);

    if (!existingProcess) {
      throw new Error('No game process found to restart');
    }

    // Store original config details (simplified - in production would store full config)
    const gameId = existingProcess.gameId;

    // Terminate existing process
    await this.terminateGame(sessionId, userId);

    // Wait a moment for cleanup
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Create a basic launch config for restart
    const restartConfig: GameLaunchConfig = {
      gameExecutable: '', // Would need to be stored from original launch
      gameDirectory: '',
      launchParameters: [],
      monitoring: { enabled: true, autoRestart: true },
    };

    // For now, just return an error since we don't have the original config
    throw new Error('Game restart requires stored launch configuration - feature in development');
  }

  /**
   * Get all process metrics for monitoring dashboard
   */
  getAllProcessMetrics(): ProcessMetrics[] {
    const allMetrics: ProcessMetrics[] = [];

    for (const gameProcess of this.activeProcesses.values()) {
      if (gameProcess.status === 'running') {
        const metrics = getProcessMonitor().getProcessMetrics(gameProcess.processId);
        if (metrics) {
          allMetrics.push(metrics);
        }
      }
    }

    return allMetrics;
  }

  /**
   * Get all active game processes
   */
  getAllActiveProcesses(): GameProcess[] {
    return Array.from(this.activeProcesses.values()).filter(
      (process) => process.status === 'running'
    );
  }

  /**
   * Validate that game executable exists and is accessible
   */
  private async validateGameExecutable(executablePath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(executablePath);
      return stats.isFile() && path.extname(executablePath).toLowerCase() === '.exe';
    } catch {
      return false;
    }
  }

  /**
   * Validate VPN connection is active
   */
  private async validateVPNConnection(networkId: string): Promise<boolean> {
    try {
      // Check if WireGuard tunnel is active
      const { stdout } = await execAsync('wg show');
      return stdout.includes(networkId) || stdout.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Prepare launch arguments including network configuration
   */
  private prepareLaunchArguments(config: GameLaunchConfig): string[] {
    const args = [...config.launchParameters];

    // Add network-specific arguments if configured
    if (config.networkSettings) {
      if (config.networkSettings.serverIP) {
        // Common network parameters for retro games
        args.push(`-server`, config.networkSettings.serverIP);

        if (config.networkSettings.port) {
          args.push(`-port`, config.networkSettings.port.toString());
        }
      }
    }

    // Add VPN-specific arguments
    if (config.vpnConfig) {
      args.push(`-vpn`, config.vpnConfig.clientIP);
    }

    return args;
  }

  /**
   * Set up event handlers for game process
   */
  private setupProcessHandlers(gameProcess: GameProcess, childProcess: ChildProcess): void {
    childProcess.on('exit', (code, signal) => {
      gameProcess.status = 'terminated';
      gameProcess.exitCode = code || 0;

      // Remove from process monitoring
      if (gameProcess.processId) {
        getProcessMonitor().removeProcess(gameProcess.processId);
      }

      console.log(`Game process exited: PID ${childProcess.pid}, Code: ${code}, Signal: ${signal}`);
    });

    childProcess.on('error', (error) => {
      gameProcess.status = 'error';
      console.error(`Game process error: ${error.message}`);
    });

    // Log game output for debugging
    if (childProcess.stdout) {
      childProcess.stdout.on('data', (data) => {
        console.log(`Game stdout: ${data}`);
      });
    }

    if (childProcess.stderr) {
      childProcess.stderr.on('data', (data) => {
        console.error(`Game stderr: ${data}`);
      });
    }
  }

  /**
   * Clean up terminated processes from memory
   */
  private cleanupTerminatedProcesses(): void {
    for (const [key, process] of this.activeProcesses) {
      if (process.status === 'terminated' || process.status === 'error') {
        // Keep process info for 5 minutes after termination for status queries
        const timeSinceExit = Date.now() - process.startTime.getTime();
        if (timeSinceExit > 5 * 60 * 1000) {
          // 5 minutes
          this.activeProcesses.delete(key);
        }
      }
    }
  }

  /**
   * Generate launch configuration from game and session data
   */
  static generateLaunchConfig(
    game: any,
    session: any,
    vpnConfig?: { networkId: string; clientIP: string }
  ): GameLaunchConfig {
    return {
      gameExecutable: game.executablePath || game.executable,
      gameDirectory: path.dirname(game.executablePath || game.executable),
      launchParameters: game.launchParameters || [],
      vpnConfig: vpnConfig
        ? {
            networkId: vpnConfig.networkId,
            clientIP: vpnConfig.clientIP,
            isRequired: game.requiresVPN || false,
          }
        : undefined,
  // Network settings can be derived from game.networkPorts if needed
    };
  }

  /**
   * Get all running games for a specific user
   */
  getAllUserGames(userId: string): GameProcess[] {
    return Array.from(this.activeProcesses.values()).filter(
      (process: GameProcess) => process.userId === userId
    );
  }

  /**
   * Get a specific game process for a session and user
   */
  getGameProcess(sessionId: string, userId: string): GameProcess | undefined {
    const processKey = `${sessionId}-${userId}`;
    return this.activeProcesses.get(processKey);
  }

  /**
   * Get process metrics for a game
   */
  getProcessMetrics(sessionId: string, userId: string) {
    const processKey = `${sessionId}-${userId}`;
    const gameProcess = this.activeProcesses.get(processKey);

    if (!gameProcess?.processId) {
      return null;
    }

  return getProcessMonitor().getProcessMetrics(gameProcess.processId);
  }

  /**
   * Get all process metrics for a session
   */
  getSessionMetrics(sessionId: string) {
  return getProcessMonitor().getSessionMetrics(sessionId);
  }

  /**
   * Update status of all running processes
   */
  updateAllProcessStatuses(): GameProcess[] {
    const allProcesses: GameProcess[] = [];

    for (const [key, process] of this.activeProcesses.entries()) {
      try {
        if (process.status === 'running' && process.process) {
          // Check if process is still running
          if (process.process.exitCode !== null) {
            process.status = 'terminated';
            process.exitCode = process.process.exitCode;
          }
        }
        allProcesses.push(process);
      } catch (error) {
        console.error(`Error updating process status for ${key}:`, error);
        process.status = 'error';
        allProcesses.push(process);
      }
    }

    return allProcesses;
  }

  /**
   * Clean up finished processes
   */
  cleanupFinishedProcesses(): number {
    let cleanedCount = 0;

    for (const [key, process] of this.activeProcesses.entries()) {
      if (process.status === 'terminated' || process.status === 'error') {
        this.activeProcesses.delete(key);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * Cleanup resources when shutting down
   */
  destroy(): void {
    if (this.processCleanupInterval) {
      clearInterval(this.processCleanupInterval);
    }

    // Terminate all active processes
    for (const [key, process] of this.activeProcesses) {
      if (process.status === 'running' && process.process) {
        process.process.kill('SIGTERM');
      }
    }
  }
}

// Lazy, process-wide singleton accessor to avoid import-time side effects
declare global {
  var __gameLauncherSingleton: GameLauncher | undefined;
}

export function getGameLauncher(): GameLauncher {
  if (!globalThis.__gameLauncherSingleton) {
    globalThis.__gameLauncherSingleton = new GameLauncher();

    try {
      process.once('SIGINT', () => {
        globalThis.__gameLauncherSingleton?.destroy();
        process.exit(0);
      });
      process.once('SIGTERM', () => {
        globalThis.__gameLauncherSingleton?.destroy();
        process.exit(0);
      });
    } catch {
      // Ignore if signals are unavailable
    }
  }
  return globalThis.__gameLauncherSingleton;
}
