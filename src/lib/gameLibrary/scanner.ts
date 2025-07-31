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

// Common game installation paths
const COMMON_GAME_PATHS = [
  'C:\\Program Files (x86)\\Steam\\steamapps\\common',
  'C:\\Program Files\\Steam\\steamapps\\common',
  'C:\\GOG Games',
  'C:\\Program Files (x86)\\GOG Galaxy\\Games',
  'C:\\Games',
  'D:\\Games',
  'E:\\Games',
];

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
];

export class GameLibraryScanner {
  
  async scanForGames(): Promise<DetectedGame[]> {
    const detectedGames: DetectedGame[] = [];
    
    // Scan common installation paths
    for (const basePath of COMMON_GAME_PATHS) {
      try {
        const games = await this.scanDirectory(basePath);
        detectedGames.push(...games);
      } catch (error) {
        // Directory doesn't exist or can't be accessed, continue
        console.log(`Skipping ${basePath}: ${error}`);
      }
    }
    
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
      console.error(`Error scanning directory ${dirPath}:`, error);
    }
    
    return games;
  }
  
  private async checkDirectoryForGame(dirPath: string, dirName: string): Promise<DetectedGame | null> {
    try {
      const files = await readdir(dirPath);
      
      for (const signature of GAME_SIGNATURES) {
        // Check if folder name matches game patterns
        const folderMatches = signature.folderPatterns.some(pattern => 
          dirName.toLowerCase().includes(pattern.toLowerCase())
        );
        
        if (folderMatches) {
          // Look for the main executable
          const mainExe = files.find(file => 
            file.toLowerCase() === signature.executable.toLowerCase()
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
            const foundExe = files.find(file => 
              file.toLowerCase() === altExe.toLowerCase()
            );
            
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
      // Can't read directory, skip
    }
    
    return null;
  }
  
  private deduplicateGames(games: DetectedGame[]): DetectedGame[] {
    const seen = new Set<string>();
    return games.filter(game => {
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
}

export const gameScanner = new GameLibraryScanner();
