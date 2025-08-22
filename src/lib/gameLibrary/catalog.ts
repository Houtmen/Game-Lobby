import path from 'path';

export interface CatalogGame {
  name: string;
  provider: 'gameranger';
  suggestedPaths: string[]; // directories to try
}

// Common base install locations by launcher/store
const BASES = [
  // GOG
  'C:\\GOG Games',
  'C:\\Program Files (x86)\\GOG Galaxy\\Games',
  'C:\\Program Files\\GOG Galaxy\\Games',
  'D:\\GOG Games',
  'E:\\GOG Games',
  // Steam
  'C:\\Program Files (x86)\\Steam\\steamapps\\common',
  'C:\\Program Files\\Steam\\steamapps\\common',
  'D:\\Steam\\steamapps\\common',
  'E:\\Steam\\steamapps\\common',
  // Epic
  'C:\\Program Files\\Epic Games',
  'C:\\Program Files (x86)\\Epic Games',
  // EA/Origin
  'C:\\Program Files (x86)\\Origin Games',
  'C:\\Program Files\\Origin Games',
  // Generic
  'C:\\Games',
  'D:\\Games',
  'E:\\Games',
  'F:\\Games',
];

const FALLBACK_GAMES = [
  'Age of Empires II',
  'Command & Conquer: Red Alert',
  'Warcraft II: Battle.net Edition',
  'Diablo II',
  'Heroes of Might and Magic II',
  'StarCraft',
  'Quake II',
  'Unreal Tournament (1999)',
  'Counter-Strike 1.6',
  'Civilization II',
  'Total Annihilation',
  'Star Wars: Battlefront II (2005)',
  'Age of Mythology',
  'Stronghold Crusader',
  'Rise of Nations',
];

function sanitizeForFolder(name: string): string[] {
  const n = name
    .replace(/®|™|\(.*?\)|\[.*?\]|\{.*?\}/g, '')
    .replace(/[:\-–—]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const variants = new Set<string>();
  variants.add(n);
  // Common variations
  variants.add(n.replace(/\s+/g, ' '));
  variants.add(n.replace(/\s+/g, '-'));
  variants.add(n.replace(/\s+/g, '_'));
  variants.add(n.replace(/\./g, ''));
  // Remove subtitles like "(1999)" already handled, also try without common suffixes
  const noYear = n.replace(/\b\(\d{4}\)\b/g, '').trim();
  variants.add(noYear);
  variants.add(noYear.replace(/\s+/g, '-'));
  return Array.from(variants);
}

export function getSuggestedPathsForName(name: string): string[] {
  const folders = sanitizeForFolder(name);
  const paths: string[] = [];
  for (const base of BASES) {
    for (const folder of folders) {
      paths.push(path.join(base, folder));
    }
  }
  return Array.from(new Set(paths));
}

async function tryFetch(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { next: { revalidate: 60 * 60 } as any } as any);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function parseGameRangerHtml(html: string): string[] {
  // Very lightweight extraction: capture anchor texts within the games table
  const names = new Set<string>();
  // Common patterns on the page: <td class="name"><a ...>Game Name</a></td>
  const anchorRegex = /<a[^>]*>(.*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = anchorRegex.exec(html)) !== null) {
    const text = m[1]
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&nbsp;/g, ' ')
      .trim();
    // Filter out non-game anchors
    if (
      text &&
      text.length > 2 &&
      !/^http/i.test(text) &&
      !/GameRanger|Support|Download|Privacy|Terms|Login|Sign Up/i.test(text)
    ) {
      // Heuristic: exclude platform badges etc.
      if (!/Windows|Mac|PC|FAQ|Forums|Blog|Help|Contact/i.test(text) || /\b\d{4}\b/.test(text)) {
        names.add(text);
      }
    }
  }
  return Array.from(names);
}

export async function fetchGameRangerCatalog(): Promise<CatalogGame[]> {
  const html = await tryFetch('https://www.gameranger.com/games/');
  const names = html ? parseGameRangerHtml(html) : FALLBACK_GAMES;
  // Basic dedupe and sanity
  const deduped = Array.from(new Set(names)).slice(0, 2000); // safety cap
  return deduped.map((name) => ({
    name,
    provider: 'gameranger',
    suggestedPaths: getSuggestedPathsForName(name),
  }));
}

export const catalogFallback: CatalogGame[] = FALLBACK_GAMES.map((name) => ({
  name,
  provider: 'gameranger',
  suggestedPaths: getSuggestedPathsForName(name),
}));
