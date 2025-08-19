import { PrismaClient, GameCategory, SubscriptionTier } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

async function main() {
  console.log('🌱 Seeding database...');

  // Create sample games
  // Note: category uses Prisma enum GameCategory
  const games = [
    {
      name: 'Heroes of Might and Magic II',
      description:
        'Classic fantasy turn-based strategy game with heroes, armies, and magical kingdoms.',
      version: '1.3',
      executablePath: 'HEROES2.EXE',
  category: GameCategory.STRATEGY,
      releaseYear: 1996,
      maxPlayers: 6,
      developer: 'New World Computing',
      publisher: '3DO',
      tags: 'fantasy,turn-based,strategy',
      bannerUrl: 'https://example.com/heroes2-banner.jpg',
      iconUrl: 'https://example.com/heroes2-icon.png',
    },
    {
      name: 'Age of Empires II',
      description: 'Medieval real-time strategy game featuring civilizations and epic battles.',
      version: 'HD Edition',
      executablePath: 'AoK HD.exe',
  category: GameCategory.STRATEGY,
      releaseYear: 1999,
      maxPlayers: 8,
      developer: 'Ensemble Studios',
      publisher: 'Microsoft',
      tags: 'medieval,real-time,strategy',
      bannerUrl: 'https://example.com/aoe2-banner.jpg',
      iconUrl: 'https://example.com/aoe2-icon.png',
    },
    {
      name: 'Warcraft II: Tides of Darkness',
      description: 'Fantasy real-time strategy game with orcs, humans, and naval combat.',
      version: 'Battle.net Edition',
      executablePath: 'Warcraft II BNE.exe',
  category: GameCategory.STRATEGY,
      releaseYear: 1995,
      maxPlayers: 8,
      developer: 'Blizzard Entertainment',
      publisher: 'Blizzard Entertainment',
      tags: 'fantasy,real-time,strategy',
      bannerUrl: 'https://example.com/warcraft2-banner.jpg',
      iconUrl: 'https://example.com/warcraft2-icon.png',
    },
    {
      name: 'Command & Conquer: Red Alert',
      description: 'Alternate history real-time strategy with Soviet and Allied forces.',
      version: 'Remastered',
      executablePath: 'RedAlert.exe',
  category: GameCategory.STRATEGY,
      releaseYear: 1996,
      maxPlayers: 8,
      developer: 'Westwood Studios',
      publisher: 'Virgin Interactive',
      tags: 'military,real-time,strategy',
      bannerUrl: 'https://example.com/redalert-banner.jpg',
      iconUrl: 'https://example.com/redalert-icon.png',
    },
    {
      name: 'Civilization II',
      description: 'Epic turn-based strategy game where you build civilizations through the ages.',
      version: 'Multiplayer Gold Edition',
      executablePath: 'civ2.exe',
  category: GameCategory.STRATEGY,
      releaseYear: 1996,
      maxPlayers: 7,
      developer: 'MicroProse',
      publisher: 'MicroProse',
      tags: 'civilization,turn-based,strategy',
      bannerUrl: 'https://example.com/civ2-banner.jpg',
      iconUrl: 'https://example.com/civ2-icon.png',
    },
    {
      name: 'StarCraft',
      description: 'Sci-fi real-time strategy with three distinct alien races.',
      version: 'Brood War',
      executablePath: 'StarCraft.exe',
  category: GameCategory.STRATEGY,
      releaseYear: 1998,
      maxPlayers: 8,
      developer: 'Blizzard Entertainment',
      publisher: 'Blizzard Entertainment',
      tags: 'sci-fi,real-time,strategy',
      bannerUrl: 'https://example.com/starcraft-banner.jpg',
      iconUrl: 'https://example.com/starcraft-icon.png',
    },
    {
      name: 'Diablo',
      description: 'Dark action RPG set in the gothic fantasy town of Tristram.',
      version: 'Hellfire',
      executablePath: 'Diablo.exe',
  category: GameCategory.RPG,
      releaseYear: 1996,
      maxPlayers: 4,
      developer: 'Blizzard North',
      publisher: 'Blizzard Entertainment',
      tags: 'action,rpg,dark-fantasy',
      bannerUrl: 'https://example.com/diablo-banner.jpg',
      iconUrl: 'https://example.com/diablo-icon.png',
    },
    {
      name: 'Total Annihilation',
      description: 'Large-scale real-time strategy with massive robot armies.',
      version: 'Core Contingency',
      executablePath: 'TotalA.exe',
  category: GameCategory.STRATEGY,
      releaseYear: 1997,
      maxPlayers: 10,
      developer: 'Cavedog Entertainment',
      publisher: 'GT Interactive',
      tags: 'robots,real-time,strategy',
      bannerUrl: 'https://example.com/totalann-banner.jpg',
      iconUrl: 'https://example.com/totalann-icon.png',
    },
  ];

  // Create games
  for (const gameData of games) {
    try {
      const existingGame = await prisma.game.findFirst({
        where: { name: gameData.name },
      });

      if (!existingGame) {
        await prisma.game.create({
          data: gameData,
        });
        console.log(`✅ Created game: ${gameData.name}`);
      } else {
        console.log(`⏭️  Game already exists: ${gameData.name}`);
      }
    } catch (error) {
      console.error(`❌ Failed to create game ${gameData.name}:`, error);
    }
  }

  console.log(`✅ Created ${games.length} games`);

  // Create a test user
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
  // Use Prisma enum for subscription tier
  subscriptionTier: SubscriptionTier.FREE,
    },
  });

  console.log('✅ Created test user:', testUser.email);
  console.log('📧 Login with: test@example.com / password123');

  console.log('🎉 Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
