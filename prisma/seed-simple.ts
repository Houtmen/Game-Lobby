import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/auth/jwt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create sample games
  const games = [
    {
      name: 'Heroes of Might and Magic II',
      description: 'Classic fantasy turn-based strategy game with heroes, armies, and magical kingdoms.',
      version: '1.3',
      executablePath: 'HEROES2.EXE',
      isInstalled: false,
      genre: 'Strategy',
      releaseYear: 1996,
      maxPlayers: 6,
      bannerUrl: 'https://example.com/heroes2-banner.jpg',
      iconUrl: 'https://example.com/heroes2-icon.png'
    },
    {
      name: 'Age of Empires II',
      description: 'Medieval real-time strategy game featuring civilizations and epic battles.',
      version: 'HD Edition',
      executablePath: 'AoK HD.exe',
      isInstalled: false,
      genre: 'Real-time Strategy',
      releaseYear: 1999,
      maxPlayers: 8,
      bannerUrl: 'https://example.com/aoe2-banner.jpg',
      iconUrl: 'https://example.com/aoe2-icon.png'
    },
    {
      name: 'Warcraft II: Tides of Darkness',
      description: 'Fantasy real-time strategy game with orcs, humans, and naval combat.',
      version: 'Battle.net Edition',
      executablePath: 'Warcraft II BNE.exe',
      isInstalled: false,
      genre: 'Real-time Strategy',
      releaseYear: 1995,
      maxPlayers: 8,
      bannerUrl: 'https://example.com/warcraft2-banner.jpg',
      iconUrl: 'https://example.com/warcraft2-icon.png'
    },
    {
      name: 'Command & Conquer: Red Alert',
      description: 'Alternate history real-time strategy with Soviet and Allied forces.',
      version: 'Remastered',
      executablePath: 'RedAlert.exe',
      isInstalled: false,
      genre: 'Real-time Strategy',
      releaseYear: 1996,
      maxPlayers: 8,
      bannerUrl: 'https://example.com/redalert-banner.jpg',
      iconUrl: 'https://example.com/redalert-icon.png'
    },
    {
      name: 'Civilization II',
      description: 'Turn-based strategy game where you build an empire to stand the test of time.',
      version: 'Multiplayer Gold Edition',
      executablePath: 'civ2.exe',
      isInstalled: false,
      genre: 'Turn-based Strategy',
      releaseYear: 1996,
      maxPlayers: 7,
      bannerUrl: 'https://example.com/civ2-banner.jpg',
      iconUrl: 'https://example.com/civ2-icon.png'
    },
    {
      name: 'StarCraft',
      description: 'Sci-fi real-time strategy with three unique races: Terran, Protoss, and Zerg.',
      version: 'Brood War',
      executablePath: 'StarCraft.exe',
      isInstalled: false,
      genre: 'Real-time Strategy',
      releaseYear: 1998,
      maxPlayers: 8,
      bannerUrl: 'https://example.com/starcraft-banner.jpg',
      iconUrl: 'https://example.com/starcraft-icon.png'
    },
    {
      name: 'Diablo',
      description: 'Dark fantasy action RPG with dungeon crawling and demon slaying.',
      version: 'Hellfire',
      executablePath: 'Diablo.exe',
      isInstalled: false,
      genre: 'Action RPG',
      releaseYear: 1996,
      maxPlayers: 4,
      bannerUrl: 'https://example.com/diablo-banner.jpg',
      iconUrl: 'https://example.com/diablo-icon.png'
    },
    {
      name: 'Total Annihilation',
      description: 'Epic-scale real-time strategy with massive robot armies and 3D terrain.',
      version: 'Core Contingency',
      executablePath: 'TotalA.exe',
      isInstalled: false,
      genre: 'Real-time Strategy',
      releaseYear: 1997,
      maxPlayers: 10,
      bannerUrl: 'https://example.com/ta-banner.jpg',
      iconUrl: 'https://example.com/ta-icon.png'
    }
  ];

  console.log('Creating games...');
  for (const gameData of games) {
    const game = await prisma.game.upsert({
      where: { name: gameData.name },
      update: {},
      create: gameData,
    });
    console.log(`✓ Created game: ${game.name}`);
  }

  // Create a sample user for testing
  const hashedPassword = await hashPassword('password123');
  const testUser = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      username: 'testuser',
      password: hashedPassword,
      firstName: 'Test',
      lastName: 'User',
      subscriptionTier: 'FREE',
    },
  });

  console.log(`✓ Created test user: ${testUser.username} (password: password123)`);

  console.log('🌱 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
