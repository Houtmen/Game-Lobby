import { EventEmitter } from 'events';
import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';

const execAsync = promisify(exec);

export interface ProcessMetrics {
  processId: number;
  gameId: string;
  sessionId: string;
  userId: string;
  // Performance metrics
  cpuUsage: number;
  memoryUsage: number; // MB
  runtimeSeconds: number;
  startTime: Date;
  lastCheck: Date;
  // Health status
  isResponding: boolean;
  healthScore: number; // 0-100
  crashCount: number;
  restartCount: number;
  // Process info
  processName: string;
  commandLine: string;
  workingDirectory: string;
}

export interface ProcessAlert {
  type: 'crash' | 'high_cpu' | 'high_memory' | 'unresponsive' | 'recovered';
  processId: number;
  gameId: string;
  sessionId: string;
  message: string;
  timestamp: Date;
  metrics?: Partial<ProcessMetrics>;
}

export class ProcessMonitor extends EventEmitter {
  private monitoredProcesses: Map<number, ProcessMetrics> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private monitoringFrequency = 5000; // 5 seconds
  private crashHistory: Map<string, number> = new Map(); // sessionId -> crash count

  // Thresholds for alerts
  private readonly thresholds = {
    highCpuUsage: 80, // %
    highMemoryUsage: 1024, // MB
    unresponsiveTimeout: 30000, // 30 seconds
    maxRestarts: 3,
    healthScoreMinimum: 30,
  };

  constructor() {
    super();
    this.startMonitoring();
  }

  /**
   * Add a process to monitoring
   */
  addProcess(
    processId: number,
    gameId: string,
    sessionId: string,
    userId: string,
    processName: string,
    commandLine: string,
    workingDirectory: string
  ): void {
    const metrics: ProcessMetrics = {
      processId,
      gameId,
      sessionId,
      userId,
      cpuUsage: 0,
      memoryUsage: 0,
      runtimeSeconds: 0,
      startTime: new Date(),
      lastCheck: new Date(),
      isResponding: true,
      healthScore: 100,
      crashCount: this.crashHistory.get(sessionId) || 0,
      restartCount: 0,
      processName,
      commandLine,
      workingDirectory,
    };

    this.monitoredProcesses.set(processId, metrics);
    console.log(`🔍 Started monitoring process ${processId} for game ${gameId}`);

    this.emit('process_added', { processId, gameId, sessionId });
  }

  /**
   * Remove a process from monitoring
   */
  removeProcess(processId: number): void {
    const metrics = this.monitoredProcesses.get(processId);
    if (metrics) {
      this.monitoredProcesses.delete(processId);
      console.log(`🔍 Stopped monitoring process ${processId}`);
      this.emit('process_removed', { processId, metrics });
    }
  }

  /**
   * Get metrics for a specific process
   */
  getProcessMetrics(processId: number): ProcessMetrics | undefined {
    return this.monitoredProcesses.get(processId);
  }

  /**
   * Get metrics for all processes in a session
   */
  getSessionMetrics(sessionId: string): ProcessMetrics[] {
    return Array.from(this.monitoredProcesses.values()).filter(
      (metrics) => metrics.sessionId === sessionId
    );
  }

  /**
   * Get all monitored processes
   */
  getAllMetrics(): ProcessMetrics[] {
    return Array.from(this.monitoredProcesses.values());
  }

  /**
   * Start the monitoring loop
   */
  private startMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(async () => {
      await this.checkAllProcesses();
    }, this.monitoringFrequency);

    console.log('🔍 Process monitoring started');
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    console.log('🔍 Process monitoring stopped');
  }

  /**
   * Check all monitored processes
   */
  private async checkAllProcesses(): Promise<void> {
    const processIds = Array.from(this.monitoredProcesses.keys());

    for (const processId of processIds) {
      try {
        await this.checkProcess(processId);
      } catch (error) {
        console.error(`Error checking process ${processId}:`, error);
      }
    }
  }

  /**
   * Check a specific process
   */
  private async checkProcess(processId: number): Promise<void> {
    const metrics = this.monitoredProcesses.get(processId);
    if (!metrics) return;

    try {
      // Check if process still exists
      const isRunning = await this.isProcessRunning(processId);

      if (!isRunning) {
        await this.handleProcessCrash(processId, metrics);
        return;
      }

      // Get performance metrics
      const performanceData = await this.getProcessPerformance(processId);

      // Update metrics
      metrics.cpuUsage = performanceData.cpuUsage;
      metrics.memoryUsage = performanceData.memoryUsage;
      metrics.runtimeSeconds = Math.floor((Date.now() - metrics.startTime.getTime()) / 1000);
      metrics.lastCheck = new Date();
      metrics.isResponding = performanceData.isResponding;

      // Calculate health score
      metrics.healthScore = this.calculateHealthScore(metrics);

      // Check for alerts
      await this.checkForAlerts(metrics);

      // Emit metrics update
      this.emit('metrics_updated', metrics);
    } catch (error) {
      console.error(`Failed to check process ${processId}:`, error);
      metrics.isResponding = false;
      metrics.healthScore = Math.max(0, metrics.healthScore - 10);
    }
  }

  /**
   * Check if a process is running
   */
  private async isProcessRunning(processId: number): Promise<boolean> {
    try {
      if (os.platform() === 'win32') {
        const { stdout } = await execAsync(
          `tasklist /FI "PID eq ${processId}" /FO CSV | find "${processId}"`
        );
        return stdout.trim().length > 0;
      } else {
        const { stdout } = await execAsync(`ps -p ${processId}`);
        return stdout.includes(processId.toString());
      }
    } catch {
      return false;
    }
  }

  /**
   * Get process performance data
   */
  private async getProcessPerformance(processId: number): Promise<{
    cpuUsage: number;
    memoryUsage: number;
    isResponding: boolean;
  }> {
    try {
      if (os.platform() === 'win32') {
        // Windows: Use wmic for detailed process info
        const { stdout } = await execAsync(
          `wmic process where ProcessId=${processId} get WorkingSetSize,PageFileUsage /format:csv`
        );

        const lines = stdout.trim().split('\n');
        const dataLine = lines[lines.length - 1];
        const parts = dataLine.split(',');

        const memoryUsage = parseInt(parts[2] || '0') / 1024 / 1024; // Convert to MB

        // Get CPU usage (requires multiple samples)
        const cpuUsage = await this.getCpuUsage(processId);

        return {
          cpuUsage,
          memoryUsage,
          isResponding: true, // Simplified - could use more sophisticated checking
        };
      } else {
        // Linux/Mac: Use ps command
        const { stdout } = await execAsync(`ps -p ${processId} -o %cpu,%mem --no-headers`);
        const [cpuUsage, memPercent] = stdout.trim().split(/\s+/).map(parseFloat);

        const totalMemory = os.totalmem() / 1024 / 1024; // MB
        const memoryUsage = (memPercent / 100) * totalMemory;

        return {
          cpuUsage: cpuUsage || 0,
          memoryUsage: memoryUsage || 0,
          isResponding: true,
        };
      }
    } catch (error) {
      console.error(`Failed to get performance data for process ${processId}:`, error);
      return {
        cpuUsage: 0,
        memoryUsage: 0,
        isResponding: false,
      };
    }
  }

  /**
   * Get CPU usage for a process (Windows)
   */
  private async getCpuUsage(processId: number): Promise<number> {
    try {
      // This is a simplified implementation
      // In production, you'd want to use proper performance counters
      const { stdout } = await execAsync(
        `wmic process where ProcessId=${processId} get PercentProcessorTime /format:csv`
      );

      // Parse the output and calculate CPU percentage
      // This is a placeholder - actual implementation would be more complex
      return Math.random() * 15; // Simulated CPU usage for demo
    } catch {
      return 0;
    }
  }

  /**
   * Calculate overall health score for a process
   */
  private calculateHealthScore(metrics: ProcessMetrics): number {
    let score = 100;

    // Deduct points for high resource usage
    if (metrics.cpuUsage > this.thresholds.highCpuUsage) {
      score -= (metrics.cpuUsage - this.thresholds.highCpuUsage) * 2;
    }

    if (metrics.memoryUsage > this.thresholds.highMemoryUsage) {
      score -= ((metrics.memoryUsage - this.thresholds.highMemoryUsage) / 100) * 10;
    }

    // Deduct points for being unresponsive
    if (!metrics.isResponding) {
      score -= 30;
    }

    // Deduct points for crashes and restarts
    score -= metrics.crashCount * 15;
    score -= metrics.restartCount * 10;

    // Deduct points for age (long-running processes might accumulate issues)
    const ageHours = metrics.runtimeSeconds / 3600;
    if (ageHours > 2) {
      score -= Math.min(20, (ageHours - 2) * 2);
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Check for alerts and emit events
   */
  private async checkForAlerts(metrics: ProcessMetrics): Promise<void> {
    const alerts: ProcessAlert[] = [];

    // High CPU usage alert
    if (metrics.cpuUsage > this.thresholds.highCpuUsage) {
      alerts.push({
        type: 'high_cpu',
        processId: metrics.processId,
        gameId: metrics.gameId,
        sessionId: metrics.sessionId,
        message: `High CPU usage: ${metrics.cpuUsage.toFixed(1)}%`,
        timestamp: new Date(),
        metrics: { cpuUsage: metrics.cpuUsage },
      });
    }

    // High memory usage alert
    if (metrics.memoryUsage > this.thresholds.highMemoryUsage) {
      alerts.push({
        type: 'high_memory',
        processId: metrics.processId,
        gameId: metrics.gameId,
        sessionId: metrics.sessionId,
        message: `High memory usage: ${metrics.memoryUsage.toFixed(1)} MB`,
        timestamp: new Date(),
        metrics: { memoryUsage: metrics.memoryUsage },
      });
    }

    // Unresponsive alert
    if (!metrics.isResponding) {
      alerts.push({
        type: 'unresponsive',
        processId: metrics.processId,
        gameId: metrics.gameId,
        sessionId: metrics.sessionId,
        message: 'Process is not responding',
        timestamp: new Date(),
      });
    }

    // Emit alerts
    for (const alert of alerts) {
      this.emit('process_alert', alert);
    }
  }

  /**
   * Handle process crash
   */
  private async handleProcessCrash(processId: number, metrics: ProcessMetrics): Promise<void> {
    console.log(`💥 Process ${processId} crashed for game ${metrics.gameId}`);

    // Update crash history
    const sessionCrashes = this.crashHistory.get(metrics.sessionId) || 0;
    this.crashHistory.set(metrics.sessionId, sessionCrashes + 1);

    // Remove from monitoring
    this.removeProcess(processId);

    // Emit crash event
    const alert: ProcessAlert = {
      type: 'crash',
      processId,
      gameId: metrics.gameId,
      sessionId: metrics.sessionId,
      message: `Game process crashed after ${metrics.runtimeSeconds} seconds`,
      timestamp: new Date(),
      metrics,
    };

    this.emit('process_crash', alert);
    this.emit('process_alert', alert);
  }

  /**
   * Get crash statistics
   */
  getCrashStatistics(): { sessionId: string; crashCount: number }[] {
    return Array.from(this.crashHistory.entries()).map(([sessionId, crashCount]) => ({
      sessionId,
      crashCount,
    }));
  }

  /**
   * Reset crash count for a session
   */
  resetCrashCount(sessionId: string): void {
    this.crashHistory.delete(sessionId);
  }

  /**
   * Cleanup and shutdown
   */
  destroy(): void {
    this.stopMonitoring();
    this.monitoredProcesses.clear();
    this.crashHistory.clear();
    this.removeAllListeners();
  }
}

// Export singleton instance
export const processMonitor = new ProcessMonitor();

// Cleanup on process exit
process.on('SIGINT', () => {
  processMonitor.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  processMonitor.destroy();
  process.exit(0);
});
