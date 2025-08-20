const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addTestGames() {
  try {
    const games = [
      {
        name: 'Age of Empires II: Definitive Edition',
        description:
          'The legendary real-time strategy game returns with enhanced graphics and new content. Build your civilization and dominate through the ages.',
        executablePath: 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\AoE2DE\\AoE2DE_s.exe',
        maxPlayers: 8,
        minPlayers: 2,
        requiresVPN: false,
        networkPorts: '2300,2301,2302',
        launchParameters: '-windowed',
        isActive: true,
        version: '1.0',
        category: 'STRATEGY',
      },
      {
        name: 'Heroes of Might and Magic II',
        description:
          'Classic turn-based strategy game with fantasy elements. Build armies and conquer territories in this legendary game.',
        executablePath: 'C:\\GOG Games\\Heroes of Might and Magic 2\\HEROES2.EXE',
        maxPlayers: 6,
        minPlayers: 2,
        requiresVPN: true,
        networkPorts: '2350,2351',
        launchParameters: '',
        isActive: true,
        version: '1.0',
        category: 'STRATEGY',
      },
      {
        name: 'Command & Conquer: Red Alert',
        description:
          'Real-time strategy game set in an alternate history where World War II never happened.',
        executablePath:
          'C:\\Program Files (x86)\\EA Games\\Command and Conquer Red Alert\\REDALERT.EXE',
        maxPlayers: 4,
        minPlayers: 2,
        requiresVPN: true,
        networkPorts: '1234,1235',
        launchParameters: '-windowed',
        isActive: true,
        version: '1.0',
        category: 'STRATEGY',
      },
    ];

    for (const game of games) {
      const existing = await prisma.game.findFirst({
        where: { name: game.name },
      });

      if (!existing) {
        await prisma.game.create({ data: game });
        console.log('✅ Added:', game.name);
      } else {
        console.log('⏭️  Already exists:', game.name);
      }
    }

    console.log('🎮 Test games setup complete!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addTestGames();
