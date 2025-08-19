import { NextRequest, NextResponse } from 'next/server';
import WireGuardInstaller from '@/lib/vpn/installer';

// GET /api/vpn/installation-check - Check if WireGuard is installed
export async function GET(request: NextRequest) {
  try {
    const isInstalled = await WireGuardInstaller.isWireGuardInstalled();
    const isWingetAvailable = await WireGuardInstaller.isWingetAvailable();

    return NextResponse.json({
      isInstalled,
      wingetAvailable: isWingetAvailable,
      installMethods: {
        winget: isWingetAvailable,
        manual: true,
        script: true,
      },
    });
  } catch (error) {
    console.error('Installation check error:', error);
    return NextResponse.json(
      { error: 'Failed to check WireGuard installation status' },
      { status: 500 }
    );
  }
}

// POST /api/vpn/installation-check - Install WireGuard
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { method } = body;

    if (method === 'winget') {
      const result = await WireGuardInstaller.installViaWinget();
      return NextResponse.json(result);
    }

    if (method === 'script') {
      const scriptContent = WireGuardInstaller.generateInstallScript();
      return NextResponse.json({
        success: true,
        script: scriptContent,
        message: 'Installation script generated',
      });
    }

    if (method === 'manual') {
      const instructions = WireGuardInstaller.getManualInstallInstructions();
      return NextResponse.json({
        success: true,
        instructions,
        downloadUrl: 'https://www.wireguard.com/install/',
        message: 'Manual installation instructions provided',
      });
    }

    return NextResponse.json({ error: 'Invalid installation method' }, { status: 400 });
  } catch (error) {
    console.error('Installation error:', error);
    return NextResponse.json({ error: 'Failed to install WireGuard' }, { status: 500 });
  }
}
