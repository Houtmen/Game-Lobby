import { PrismaClient } from '@prisma/client';
import { GAMERANGER_GAMES } from '../src/lib/gameLibrary/gamerangerList';
import { getSuggestedPathsForName } from '../src/lib/gameLibrary/catalog';

const prisma = new PrismaClient();

function toSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

async function main() {
  console.log('🌱 Seeding GameCatalog from GameRanger list...');
  const provider = 'gameranger';
  let processed = 0;
  for (const name of GAMERANGER_GAMES) {
    const slug = toSlug(`${provider}-${name}`);
    const suggestedPaths = getSuggestedPathsForName(name);
    try {
      await prisma.gameCatalog.upsert({
        where: { slug },
        update: {
          name,
          provider,
          suggestedPaths,
        },
        create: {
          slug,
          name,
          provider,
          suggestedPaths,
        },
      });
      processed++;
      if (processed % 200 === 0) console.log(`  ...processed ${processed}`);
    } catch (err) {
      console.error('Failed to upsert catalog entry for', name, err);
    }
  }
  console.log(`✅ Catalog seed complete. Entries processed: ${processed}`);
}

main()
  .catch((e) => {
    console.error('❌ Catalog seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
