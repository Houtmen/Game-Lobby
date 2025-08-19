import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/utils';
import { gameLauncher } from '@/lib/gameLibrary/launcher';
import { processMonitor } from '@/lib/gameLibrary/processMonitor';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const processId = searchParams.get('processId');
    const type = searchParams.get('type') || 'summary';

    // Get specific process metrics
    if (processId) {
      const pid = parseInt(processId);
      const metrics = processMonitor.getProcessMetrics(pid);

      if (!metrics) {
        return NextResponse.json(
          {
            error: 'Process not found or not monitored',
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        metrics,
      });
    }

    // Get session health summary
    if (sessionId && type === 'health') {
      const healthSummary = gameLauncher.getSessionHealthSummary(sessionId);
      return NextResponse.json({
        success: true,
        sessionId,
        health: healthSummary,
      });
    }

    // Get session processes with enhanced metrics
    if (sessionId) {
      const sessionProcesses = processMonitor.getSessionMetrics(sessionId);
      return NextResponse.json({
        success: true,
        sessionId,
        processes: sessionProcesses,
      });
    }

    // Get all user processes (simplified - filter by user from all metrics)
    const allUserMetrics = processMonitor.getAllMetrics();
    const userProcesses = allUserMetrics.filter((metrics) => metrics.userId === user.id);
    const launcherMetrics = gameLauncher.getAllProcessMetrics();

    return NextResponse.json({
      success: true,
      userId: user.id,
      processes: userProcesses,
      summary: {
        totalProcesses: userProcesses.length,
        totalCpuUsage: userProcesses.reduce((sum: number, m) => sum + m.cpuUsage, 0),
        totalMemoryUsage: userProcesses.reduce((sum: number, m) => sum + m.memoryUsage, 0),
        healthyProcesses: userProcesses.filter((m) => m.healthScore >= 80).length,
        warningProcesses: userProcesses.filter((m) => m.healthScore >= 60 && m.healthScore < 80)
          .length,
        criticalProcesses: userProcesses.filter((m) => m.healthScore < 60).length,
      },
    });
  } catch (error) {
    console.error('Process monitoring API error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to get process metrics',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { action, sessionId, processId } = body;

    switch (action) {
      case 'restart':
        if (!sessionId) {
          return NextResponse.json(
            {
              error: 'Session ID required for restart',
            },
            { status: 400 }
          );
        }

        try {
          const restarted = await gameLauncher.restartGame(sessionId, user.id);
          return NextResponse.json({
            success: true,
            message: 'Game restarted successfully',
            process: restarted,
          });
        } catch (error) {
          return NextResponse.json(
            {
              error: error instanceof Error ? error.message : 'Failed to restart game',
            },
            { status: 500 }
          );
        }

      case 'terminate':
        if (sessionId) {
          const terminated = await gameLauncher.terminateGame(sessionId, user.id);
          return NextResponse.json({
            success: terminated,
            message: terminated ? 'Game terminated successfully' : 'No running game found',
          });
        } else {
          return NextResponse.json(
            {
              error: 'Session ID required for termination',
            },
            { status: 400 }
          );
        }

      case 'health_check':
        if (!processId) {
          return NextResponse.json(
            {
              error: 'Process ID required for health check',
            },
            { status: 400 }
          );
        }

        const processMetrics = processMonitor.getProcessMetrics(parseInt(processId));
        return NextResponse.json({
          success: true,
          healthStatus: processMetrics
            ? {
                isHealthy: processMetrics.healthScore >= 80,
                healthScore: processMetrics.healthScore,
                metrics: processMetrics,
              }
            : null,
        });

      default:
        return NextResponse.json(
          {
            error: 'Invalid action. Supported actions: restart, terminate, health_check',
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Process monitoring action error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to execute process action',
      },
      { status: 500 }
    );
  }
}
