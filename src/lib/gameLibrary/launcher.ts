import { exec, spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

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
}

export class GameLauncher {
  private activeProcesses: Map<string, GameProcess> = new Map();
  private processCleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup terminated processes every 30 seconds
    this.processCleanupInterval = setInterval(() => {
      this.cleanupTerminatedProcesses();
    }, 30000);
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
      status: 'starting'
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
            VPN_NETWORK_ID: config.vpnConfig.networkId
          })
        }
      });

      gameProcess.processId = childProcess.pid || 0;
      gameProcess.process = childProcess;
      gameProcess.status = 'running';

      // Set up process event handlers
      this.setupProcessHandlers(gameProcess, childProcess);

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
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Force kill if still running
      if (!gameProcess.process.killed) {
        gameProcess.process.kill('SIGKILL');
      }

      gameProcess.status = 'terminated';
      return true;
    } catch (error) {
      console.error(`Failed to terminate game process: ${error}`);
      return false;
    }
  }

  /**
   * Get active game process for a user/session
   */
  getGameProcess(sessionId: string, userId: string): GameProcess | undefined {
    const processKey = `${sessionId}-${userId}`;
    return this.activeProcesses.get(processKey);
  }

  /**
   * Get all active game processes
   */
  getAllActiveProcesses(): GameProcess[] {
    return Array.from(this.activeProcesses.values())
      .filter(process => process.status === 'running');
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
        if (timeSinceExit > 5 * 60 * 1000) { // 5 minutes
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
      vpnConfig: vpnConfig ? {
        networkId: vpnConfig.networkId,
        clientIP: vpnConfig.clientIP,
        isRequired: game.requiresVPN || false
      } : undefined,
      networkSettings: {
        protocol: game.networkProtocol || 'tcp',
        port: game.defaultPort
      }
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

// Export singleton instance
export const gameLauncher = new GameLauncher();

// Clean shutdown
process.on('SIGINT', () => {
  gameLauncher.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  gameLauncher.destroy();
  process.exit(0);
});
