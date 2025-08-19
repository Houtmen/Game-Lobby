import { PrismaClient, GameCategory } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Creating sample games...');

  const games = [
    {
      name: 'Heroes of Might and Magic II',
      description: 'Classic fantasy strategy game with magic and heroes',
  category: GameCategory.STRATEGY,
      maxPlayers: 8,
      minPlayers: 2,
      supportedPlatforms: 'WINDOWS',
      tags: 'fantasy,turn-based,strategy',
      releaseYear: 1996,
      developer: 'New World Computing',
      publisher: '3DO',
    },
    {
      name: 'Age of Empires II',
      description: 'Medieval real-time strategy game',
  category: GameCategory.STRATEGY,
      maxPlayers: 8,
      minPlayers: 2,
      supportedPlatforms: 'WINDOWS',
      tags: 'historical,rts,medieval',
      releaseYear: 1999,
      developer: 'Ensemble Studios',
      publisher: 'Microsoft',
    },
    {
      name: 'Diablo',
      description: 'Legendary action RPG set in a dark fantasy world',
  category: GameCategory.RPG,
      maxPlayers: 4,
      minPlayers: 1,
      supportedPlatforms: 'WINDOWS',
      tags: 'action-rpg,fantasy,dungeon',
      releaseYear: 1996,
      developer: 'Blizzard North',
      publisher: 'Blizzard Entertainment',
    },
  ];

  for (const gameData of games) {
    try {
      const game = await prisma.game.create({
        data: gameData,
      });
      console.log(`✅ Created game: ${game.name}`);
    } catch (error: any) {
      if (error.code === 'P2002') {
        console.log(`⏭️  Game already exists: ${gameData.name}`);
      } else {
        console.error(`❌ Error creating game ${gameData.name}:`, error.message);
      }
    }
  }

  console.log('🎮 Database seeding completed!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
