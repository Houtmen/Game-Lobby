import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

export interface DetectedGame {
  name: string;
  executable: string;
  description?: string;
  iconUrl?: string;
  supportedPlatforms?: string[];
  maxPlayers?: number;
  minPlayers?: number;
  category?: string;
  version?: string;
  vpnRequired?: boolean;
  networkPorts?: number[];
  detectionMethod: 'registry' | 'filesystem' | 'manual';
}

// Common game installation paths - more comprehensive scanning
const getCommonGamePaths = () => {
  const paths = [
    // Steam paths
    'C:\\Program Files (x86)\\Steam\\steamapps\\common',
    'C:\\Program Files\\Steam\\steamapps\\common',
    'D:\\Steam\\steamapps\\common',
    'E:\\Steam\\steamapps\\common',

    // GOG paths
    'C:\\GOG Games',
    'D:\\GOG Games',
    'E:\\GOG Games',
    'C:\\Program Files (x86)\\GOG Galaxy\\Games',
    'C:\\Program Files\\GOG Galaxy\\Games',

    // Epic Games
    'C:\\Program Files\\Epic Games',
    'C:\\Program Files (x86)\\Epic Games',

    // Origin/EA
    'C:\\Program Files (x86)\\Origin Games',
    'C:\\Program Files\\Origin Games',

    // Generic game directories
    'C:\\Games',
    'D:\\Games',
    'E:\\Games',
    'F:\\Games',

    // Program Files
    'C:\\Program Files (x86)',
    'C:\\Program Files',
    'D:\\Program Files',
    'E:\\Program Files',

    // User directories
    ...(process.env.USERPROFILE
      ? [
          `${process.env.USERPROFILE}\\Desktop`,
          `${process.env.USERPROFILE}\\Documents\\Games`,
          `${process.env.USERPROFILE}\\Downloads`,
        ]
      : []),
  ].filter(Boolean);

  return paths;
};

// Known game signatures
const GAME_SIGNATURES = [
  {
    name: 'Heroes of Might and Magic II',
    executable: 'HEROES2.EXE',
    alternativeExecutables: ['heroes2.exe', 'H2.exe'],
    folderPatterns: ['heroes', 'might', 'magic', 'homm2', 'h2'],
    category: 'STRATEGY',
    maxPlayers: 8,
    minPlayers: 2,
  },
  {
    name: 'Age of Empires II',
    executable: 'AoE2DE_s.exe',
    alternativeExecutables: ['empires2.exe', 'age2_x1.exe'],
    folderPatterns: ['age', 'empires', 'aoe2'],
    category: 'STRATEGY',
    maxPlayers: 8,
    minPlayers: 2,
  },
  {
    name: 'Warcraft II',
    executable: 'Warcraft II BNE.exe',
    alternativeExecutables: ['war2.exe', 'warcraft.exe'],
    folderPatterns: ['warcraft', 'war2', 'wc2'],
    category: 'STRATEGY',
    maxPlayers: 8,
    minPlayers: 2,
  },
  {
    name: 'Command & Conquer',
    executable: 'C&C95.exe',
    alternativeExecutables: ['command.exe', 'cnc.exe'],
    folderPatterns: ['command', 'conquer', 'cnc'],
    category: 'STRATEGY',
    maxPlayers: 4,
    minPlayers: 2,
  },
  {
    name: 'Civilization II',
    executable: 'civ2.exe',
    alternativeExecutables: ['civilization.exe'],
    folderPatterns: ['civilization', 'civ2', 'civ'],
    category: 'STRATEGY',
    maxPlayers: 7,
    minPlayers: 2,
  },
  // Test game - any .exe file in a "test" folder
  {
    name: 'Test Game',
    executable: 'test.exe',
    alternativeExecutables: ['game.exe', 'app.exe', 'main.exe'],
    folderPatterns: ['test', 'demo', 'sample'],
    category: 'STRATEGY',
    maxPlayers: 4,
    minPlayers: 2,
  },
];

export class GameLibraryScanner {
  async scanForGames(customPaths: string[] = []): Promise<DetectedGame[]> {
    const detectedGames: DetectedGame[] = [];

    console.log('🔍 Starting game scan...');

    // Get all paths to scan (common + custom)
    const commonPaths = getCommonGamePaths();
    const allPaths = [...commonPaths, ...customPaths];

    console.log(
      `📁 Scanning ${allPaths.length} paths (${commonPaths.length} common + ${customPaths.length} custom)`
    );

    // Scan all paths
    for (const basePath of allPaths) {
      try {
        const exists = fs.existsSync(basePath);

        if (exists) {
          console.log(`📁 Scanning: ${basePath}`);
          const games = await this.scanDirectory(basePath);
          if (games.length > 0) {
            console.log(`   Found ${games.length} games`);
          }
          detectedGames.push(...games);
        }
      } catch (error) {
        // Directory doesn't exist or can't be accessed, continue silently
      }
    }

    console.log(`🎮 Scan complete: ${detectedGames.length} games detected`);
    return this.deduplicateGames(detectedGames);
  }

  private async scanDirectory(dirPath: string): Promise<DetectedGame[]> {
    const games: DetectedGame[] = [];

    try {
      const exists = fs.existsSync(dirPath);
      if (!exists) return games;

      const entries = await readdir(dirPath);

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry);
        const stats = await stat(fullPath);

        if (stats.isDirectory()) {
          // Check if this directory contains any known games
          const game = await this.checkDirectoryForGame(fullPath, entry);
          if (game) {
            console.log(`  🎮 Found: ${game.name} at ${game.executable}`);
            games.push(game);
          }

          // Recursively scan subdirectories (max depth 2 to avoid deep scanning)
          if (fullPath.split(path.sep).length - dirPath.split(path.sep).length < 2) {
            const subGames = await this.scanDirectory(fullPath);
            games.push(...subGames);
          }
        }
      }
    } catch (error) {
      // Silently skip directories we can't access
    }

    return games;
  }

  private async checkDirectoryForGame(
    dirPath: string,
    dirName: string
  ): Promise<DetectedGame | null> {
    try {
      const files = await readdir(dirPath);

      for (const signature of GAME_SIGNATURES) {
        // Check if folder name matches game patterns
        const folderMatches = signature.folderPatterns.some((pattern) =>
          dirName.toLowerCase().includes(pattern.toLowerCase())
        );

        if (folderMatches) {
          // Look for the main executable
          const mainExe = files.find(
            (file) => file.toLowerCase() === signature.executable.toLowerCase()
          );

          if (mainExe) {
            const executablePath = path.join(dirPath, mainExe);
            return {
              name: signature.name,
              executable: executablePath,
              description: `Auto-detected ${signature.name}`,
              category: signature.category,
              supportedPlatforms: ['WINDOWS'],
              maxPlayers: signature.maxPlayers,
              minPlayers: signature.minPlayers,
              vpnRequired: true,
              detectionMethod: 'filesystem',
            };
          }

          // Look for alternative executables
          for (const altExe of signature.alternativeExecutables) {
            const foundExe = files.find((file) => file.toLowerCase() === altExe.toLowerCase());

            if (foundExe) {
              const executablePath = path.join(dirPath, foundExe);
              return {
                name: signature.name,
                executable: executablePath,
                description: `Auto-detected ${signature.name}`,
                category: signature.category,
                supportedPlatforms: ['WINDOWS'],
                maxPlayers: signature.maxPlayers,
                minPlayers: signature.minPlayers,
                vpnRequired: true,
                detectionMethod: 'filesystem',
              };
            }
          }
        }
      }
    } catch (error) {
      // Can't read directory, skip silently
    }

    return null;
  }

  private deduplicateGames(games: DetectedGame[]): DetectedGame[] {
    const seen = new Set<string>();
    return games.filter((game) => {
      const key = `${game.name}:${game.executable}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  async validateGameExecutable(executablePath: string): Promise<boolean> {
    try {
      const stats = await stat(executablePath);
      return stats.isFile() && path.extname(executablePath).toLowerCase() === '.exe';
    } catch {
      return false;
    }
  }

  async addGameByPath(executablePath: string, gameName?: string): Promise<DetectedGame | null> {
    try {
      // Validate the executable exists
      if (!(await this.validateGameExecutable(executablePath))) {
        return null;
      }

      const fileName = path.basename(executablePath, '.exe');
      const dirName = path.basename(path.dirname(executablePath));

      // Try to match against known signatures first
      for (const signature of GAME_SIGNATURES) {
        const executableMatches =
          executablePath
            .toLowerCase()
            .includes(signature.executable.toLowerCase().replace('.exe', '')) ||
          signature.alternativeExecutables.some((alt) =>
            executablePath.toLowerCase().includes(alt.toLowerCase().replace('.exe', ''))
          );

        const folderMatches = signature.folderPatterns.some((pattern) =>
          dirName.toLowerCase().includes(pattern.toLowerCase())
        );

        if (executableMatches || folderMatches) {
          return {
            name: signature.name,
            executable: executablePath,
            description: `Manually added: ${signature.name}`,
            category: signature.category,
            supportedPlatforms: ['WINDOWS'],
            maxPlayers: signature.maxPlayers,
            minPlayers: signature.minPlayers,
            vpnRequired: true,
            detectionMethod: 'manual',
          };
        }
      }

      // If no signature match, create generic game entry
      return {
        name: gameName || fileName,
        executable: executablePath,
        description: `Manually added: ${gameName || fileName}`,
        category: 'STRATEGY',
        supportedPlatforms: ['WINDOWS'],
        maxPlayers: 8,
        minPlayers: 2,
        vpnRequired: true,
        detectionMethod: 'manual',
      };
    } catch (error) {
      console.error('Error adding game by path:', error);
      return null;
    }
  }
}

export const gameScanner = new GameLibraryScanner();
