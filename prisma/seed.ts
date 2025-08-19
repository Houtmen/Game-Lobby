import { PrismaClient, GameCategory, Platform } from '@prisma/client';

const prisma = new PrismaClient();

type SeedGame = {
  name: string;
  description: string;
  version: string;
  iconUrl: string;
  bannerUrl: string;
  supportedPlatforms: Platform[];
  maxPlayers: number;
  minPlayers: number;
  category: GameCategory;
  tags: string[];
  releaseYear: number;
  developer: string;
  publisher: string;
  requiresVPN: boolean;
  networkPorts: number[];
};

const initialGames: SeedGame[] = [
  {
    name: 'Heroes of Might and Magic II: Gold Edition',
    description:
      'The classic fantasy strategy game where you build armies, cast spells, and conquer kingdoms. Lead one of six different factions in epic battles.',
    version: '1.3',
    iconUrl: '/games/homm2-icon.png',
    bannerUrl: '/games/homm2-banner.jpg',
    supportedPlatforms: [Platform.WINDOWS],
    maxPlayers: 8,
    minPlayers: 2,
    category: GameCategory.STRATEGY,
    tags: ['fantasy', 'turn-based', 'magic', 'heroes', 'medieval'],
    releaseYear: 1996,
    developer: 'New World Computing',
    publisher: '3DO',
    requiresVPN: true,
    networkPorts: [2350, 2351, 2352],
  },
  {
    name: 'Age of Empires II: Definitive Edition',
    description:
      'The legendary real-time strategy game returns with enhanced graphics and new content. Build your civilization and dominate through the ages.',
    version: 'Definitive Edition',
    iconUrl: '/games/aoe2-icon.png',
    bannerUrl: '/games/aoe2-banner.jpg',
    supportedPlatforms: [Platform.WINDOWS],
    maxPlayers: 8,
    minPlayers: 2,
    category: GameCategory.STRATEGY,
    tags: ['historical', 'rts', 'medieval', 'civilizations', 'empire'],
    releaseYear: 1999,
    developer: 'Ensemble Studios',
    publisher: 'Microsoft Studios',
    requiresVPN: true,
    networkPorts: [2300, 2301, 2302],
  },
  {
    name: 'Warcraft II: Battle.net Edition',
    description:
      'Command orcs or humans in this epic fantasy real-time strategy game. Build bases, gather resources, and lead massive armies into battle.',
    version: 'Battle.net Edition',
    iconUrl: '/games/wc2-icon.png',
    bannerUrl: '/games/wc2-banner.jpg',
    supportedPlatforms: [Platform.WINDOWS],
    maxPlayers: 8,
    minPlayers: 2,
    category: GameCategory.STRATEGY,
    tags: ['fantasy', 'rts', 'orcs', 'humans', 'warcraft'],
    releaseYear: 1995,
    developer: 'Blizzard Entertainment',
    publisher: 'Blizzard Entertainment',
    requiresVPN: true,
    networkPorts: [6112, 6113, 6114],
  },
  {
    name: 'Command & Conquer: Tiberian Dawn',
    description:
      'The original real-time strategy masterpiece. Choose between GDI and NOD in the battle for Tiberium supremacy.',
    version: 'Remastered Collection',
    iconUrl: '/games/cnc-icon.png',
    bannerUrl: '/games/cnc-banner.jpg',
    supportedPlatforms: [Platform.WINDOWS],
    maxPlayers: 6,
    minPlayers: 2,
    category: GameCategory.STRATEGY,
    tags: ['sci-fi', 'rts', 'military', 'tiberium', 'future'],
    releaseYear: 1995,
    developer: 'Westwood Studios',
    publisher: 'Electronic Arts',
    requiresVPN: true,
    networkPorts: [1234, 1235, 1236],
  },
  {
    name: 'Civilization II',
    description:
      'Build an empire to stand the test of time in this legendary turn-based strategy game. Guide your civilization from the dawn of man to the space age.',
    version: 'Multiplayer Gold Edition',
    iconUrl: '/games/civ2-icon.png',
    bannerUrl: '/games/civ2-banner.jpg',
    supportedPlatforms: [Platform.WINDOWS],
    maxPlayers: 7,
    minPlayers: 2,
    category: GameCategory.STRATEGY,
    tags: ['historical', 'turn-based', 'civilization', 'empire', '4x'],
    releaseYear: 1996,
    developer: 'MicroProse',
    publisher: 'MicroProse',
    requiresVPN: true,
    networkPorts: [2056, 2057, 2058],
  },
  {
    name: 'Diablo',
    description:
      'Descend into the depths of hell in this legendary action RPG. Battle demons, collect loot, and save the town of Tristram.',
    version: 'Hellfire Expansion',
    iconUrl: '/games/diablo-icon.png',
    bannerUrl: '/games/diablo-banner.jpg',
    supportedPlatforms: [Platform.WINDOWS],
    maxPlayers: 4,
    minPlayers: 1,
    category: GameCategory.RPG,
    tags: ['dark fantasy', 'action rpg', 'demons', 'loot', 'dungeon'],
    releaseYear: 1996,
    developer: 'Blizzard North',
    publisher: 'Blizzard Entertainment',
    requiresVPN: true,
    networkPorts: [6112, 6113],
  },
  {
    name: 'StarCraft',
    description:
      'The ultimate sci-fi real-time strategy experience. Command the Terrans, Protoss, or Zerg in epic interstellar warfare.',
    version: 'Brood War',
    iconUrl: '/games/sc-icon.png',
    bannerUrl: '/games/sc-banner.jpg',
    supportedPlatforms: [Platform.WINDOWS],
    maxPlayers: 8,
    minPlayers: 2,
    category: GameCategory.STRATEGY,
    tags: ['sci-fi', 'rts', 'space', 'aliens', 'esports'],
    releaseYear: 1998,
    developer: 'Blizzard Entertainment',
    publisher: 'Blizzard Entertainment',
    requiresVPN: true,
    networkPorts: [6112, 6113, 6114],
  },
  {
    name: 'Duke Nukem 3D',
    description:
      'Kick ass and chew bubblegum in this classic first-person shooter. Battle alien invaders across multiple episodes.',
    version: 'Atomic Edition',
    iconUrl: '/games/duke3d-icon.png',
    bannerUrl: '/games/duke3d-banner.jpg',
    supportedPlatforms: [Platform.WINDOWS],
    maxPlayers: 8,
    minPlayers: 2,
    category: GameCategory.ACTION,
    tags: ['fps', 'aliens', 'action', 'retro', 'multiplayer'],
    releaseYear: 1996,
    developer: '3D Realms',
    publisher: '3D Realms',
    requiresVPN: true,
    networkPorts: [23513, 23514],
  },
];

async function main() {
  console.log('🌱 Seeding database with initial games...');

  for (const gameData of initialGames) {
    try {
      // Check if game already exists
      const existingGame = await prisma.game.findFirst({
        where: { name: gameData.name },
      });

      if (existingGame) {
        console.log(`⏭️ Game already exists: ${gameData.name}`);
        continue;
      }

    const game = await prisma.game.create({
        data: {
          ...gameData,
      supportedPlatforms: gameData.supportedPlatforms.join(','),
      tags: gameData.tags.join(','),
      networkPorts: gameData.networkPorts.map((p) => String(p)).join(','),
        },
      });
      console.log(`✅ Created game: ${game.name}`);
    } catch (error) {
      console.error(`❌ Error creating game ${gameData.name}:`, error);
    }
  }

  console.log('🎮 Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
