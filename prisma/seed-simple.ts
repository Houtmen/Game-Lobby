import { PrismaClient, SubscriptionTier, GameCategory } from '@prisma/client';
import { hashPassword } from '../src/lib/auth/jwt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database (simple)...');

  const games = [
    {
      name: 'Heroes of Might and Magic II',
      description: 'Classic fantasy turn-based strategy game with heroes and magic.',
      version: '1.3',
      executablePath: 'HEROES2.EXE',
      supportedPlatforms: 'WINDOWS',
      maxPlayers: 6,
      minPlayers: 2,
      category: GameCategory.STRATEGY,
      tags: 'fantasy,turn-based,strategy',
      releaseYear: 1996,
      developer: 'New World Computing',
      publisher: '3DO',
      bannerUrl: 'https://example.com/heroes2-banner.jpg',
      iconUrl: 'https://example.com/heroes2-icon.png',
    },
    {
      name: 'Age of Empires II',
      description: 'Medieval real-time strategy game featuring civilizations and epic battles.',
      version: 'HD Edition',
      executablePath: 'AoK HD.exe',
      supportedPlatforms: 'WINDOWS',
      maxPlayers: 8,
      minPlayers: 2,
      category: GameCategory.STRATEGY,
      tags: 'medieval,real-time,strategy',
      releaseYear: 1999,
      developer: 'Ensemble Studios',
      publisher: 'Microsoft',
      bannerUrl: 'https://example.com/aoe2-banner.jpg',
      iconUrl: 'https://example.com/aoe2-icon.png',
    },
    {
      name: 'Warcraft II: Tides of Darkness',
      description: 'Fantasy real-time strategy game with orcs, humans, and naval combat.',
      version: 'Battle.net Edition',
      executablePath: 'Warcraft II BNE.exe',
      supportedPlatforms: 'WINDOWS',
      maxPlayers: 8,
      minPlayers: 2,
      category: GameCategory.STRATEGY,
      tags: 'fantasy,real-time,strategy',
      releaseYear: 1995,
      developer: 'Blizzard Entertainment',
      publisher: 'Blizzard Entertainment',
      bannerUrl: 'https://example.com/warcraft2-banner.jpg',
      iconUrl: 'https://example.com/warcraft2-icon.png',
    },
    {
      name: 'Diablo',
      description: 'Dark action RPG set in the gothic fantasy town of Tristram.',
      version: 'Hellfire',
      executablePath: 'Diablo.exe',
      supportedPlatforms: 'WINDOWS',
      maxPlayers: 4,
      minPlayers: 1,
      category: GameCategory.RPG,
      tags: 'action,rpg,dark-fantasy',
      releaseYear: 1996,
      developer: 'Blizzard North',
      publisher: 'Blizzard Entertainment',
      bannerUrl: 'https://example.com/diablo-banner.jpg',
      iconUrl: 'https://example.com/diablo-icon.png',
    },
  ];

  console.log('🎮 Creating games...');
  for (const gameData of games) {
    try {
      const existing = await prisma.game.findFirst({ where: { name: gameData.name } });
      if (existing) {
        console.log(`⏭️  Game already exists: ${gameData.name}`);
        continue;
      }
      const game = await prisma.game.create({ data: gameData });
      console.log(`✅ Created game: ${game.name}`);
    } catch (error: any) {
      console.error(`❌ Error creating game ${gameData.name}:`, error.message);
    }
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
      subscriptionTier: SubscriptionTier.FREE,
    },
  });

  console.log(`👤 Created test user: ${testUser.username} (password: password123)`);
  console.log('🌱 Seeding (simple) completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
