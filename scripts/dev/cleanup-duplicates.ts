import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function removeDuplicateGames() {
  console.log('🧹 Cleaning up duplicate games...');

  // Get all games grouped by name
  const games = await prisma.game.findMany({
    orderBy: { id: 'asc' }, // Keep the first one by ID
  });

  const gamesMap = new Map();
  const duplicates = [];

  for (const game of games) {
    if (gamesMap.has(game.name)) {
      // This is a duplicate, mark for deletion
      duplicates.push(game.id);
      console.log(`🗑️ Marking duplicate: ${game.name} (${game.id})`);
    } else {
      // This is the first occurrence, keep it
      gamesMap.set(game.name, game.id);
      console.log(`✅ Keeping: ${game.name} (${game.id})`);
    }
  }

  if (duplicates.length > 0) {
    console.log(`🗑️ Removing ${duplicates.length} duplicate games...`);
    await prisma.game.deleteMany({
      where: {
        id: { in: duplicates },
      },
    });
    console.log('✅ Duplicates removed!');
  } else {
    console.log('✅ No duplicates found!');
  }

  // Show final count
  const finalCount = await prisma.game.count();
  console.log(`📊 Final game count: ${finalCount}`);
}

removeDuplicateGames()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
