/**
 * Модуль хранения локальной конфигурации приложения
 */
import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { DatabaseConfig } from '../src/types';

interface AppStoreData {
  dbConfig: DatabaseConfig;
  windowBounds?: { width: number; height: number; x?: number; y?: number };
  theme?: string;
}

const DEFAULT_CONFIG: DatabaseConfig = {
  dbPath: '',
  busyTimeout: 10000,
  autoBackupOnStart: true,
  backupFolder: '',
  isNetworkPath: false,
  isAccessible: false,
  syncMode: 'auto',
  isUsingLocalCache: false,
};

class ConfigStore {
  private configPath: string;
  private data: AppStoreData;

  constructor() {
    const userData = app?.getPath ? app.getPath('userData') : process.cwd();
    this.configPath = path.join(userData, 'docflow_config.json');
    this.data = this.load();
  }

  private load(): AppStoreData {
    try {
      if (fs.existsSync(this.configPath)) {
        const raw = fs.readFileSync(this.configPath, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error('Ошибка чтения конфигурации:', e);
    }
    return {
      dbConfig: DEFAULT_CONFIG,
    };
  }

  public save(): void {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Ошибка записи конфигурации:', e);
    }
  }

  public getDbConfig(): DatabaseConfig {
    return { ...this.data.dbConfig };
  }

  public setDbConfig(cfg: Partial<DatabaseConfig>): DatabaseConfig {
    this.data.dbConfig = {
      ...this.data.dbConfig,
      ...cfg,
    };
    this.save();
    return this.data.dbConfig;
  }
}

export const store = new ConfigStore();
