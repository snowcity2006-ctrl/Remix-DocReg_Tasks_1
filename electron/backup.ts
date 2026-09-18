/**
 * Модуль резервного копирования базы данных SQLite
 */
import fs from 'fs';
import path from 'path';
import { BackupFileInfo } from '../src/types';
import { logger } from './logger';
import { store } from './store';
import { dbManager, safeCopyFile } from './db';

class BackupManager {
  /**
   * Создает резервную копию текущего файла базы данных
   */
  public async createBackup(isAuto = false): Promise<{ success: boolean; backupPath: string; message: string }> {
    try {
      const dbConfig = store.getDbConfig();
      const currentDbPath = dbConfig.dbPath || dbManager.getCurrentDbPath();

      if (!currentDbPath || !fs.existsSync(currentDbPath)) {
        return { success: false, backupPath: '', message: 'Файл базы данных не существует или не инициализирован' };
      }

      let backupFolder = dbConfig.backupFolder;
      if (!backupFolder) {
        backupFolder = path.join(path.dirname(currentDbPath), 'backup');
      }

      if (!fs.existsSync(backupFolder)) {
        fs.mkdirSync(backupFolder, { recursive: true });
      }

      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}.${pad(now.getMinutes())}.${pad(now.getSeconds())}`;
      const prefix = isAuto ? 'docflow_backup_auto' : 'docflow_backup_manual';
      const backupFileName = `${prefix}_${dateStr}.sqlite`;
      const targetBackupPath = path.join(backupFolder, backupFileName);

      // Сначала пробуем безопасный SQLite Online Backup API (не конфликтует с активными сетевыми транзакциями)
      const onlineOk = await dbManager.backupToFile(targetBackupPath);
      if (!onlineOk) {
        safeCopyFile(currentDbPath, targetBackupPath);
      }

      const stats = fs.statSync(targetBackupPath);
      logger.log(
        'success',
        'backup',
        `${isAuto ? 'Автоматический' : 'Ручной'} бэкап успешно создан: ${backupFileName} (${stats.size} байт)`
      );

      return {
        success: true,
        backupPath: targetBackupPath,
        message: `Резервная копия успешно создана в: ${targetBackupPath}`,
      };
    } catch (err: any) {
      logger.log('error', 'backup', `Ошибка создания резервной копии: ${err.message}`, err);
      return {
        success: false,
        backupPath: '',
        message: `Ошибка резервного копирования: ${err.message}`,
      };
    }
  }

  /**
   * Получает список всех созданных копий в папке backup
   */
  public async getBackupsList(): Promise<BackupFileInfo[]> {
    try {
      const dbConfig = store.getDbConfig();
      const currentDbPath = dbConfig.dbPath || dbManager.getCurrentDbPath();
      if (!currentDbPath) return [];

      let backupFolder = dbConfig.backupFolder;
      if (!backupFolder) {
        backupFolder = path.join(path.dirname(currentDbPath), 'backup');
      }

      if (!fs.existsSync(backupFolder)) return [];

      const files = fs.readdirSync(backupFolder);
      const list: BackupFileInfo[] = [];

      for (const file of files) {
        if (file.endsWith('.sqlite') || file.endsWith('.db') || file.endsWith('.bak')) {
          const fullPath = path.join(backupFolder, file);
          const stats = fs.statSync(fullPath);
          list.push({
            fileName: file,
            filePath: fullPath,
            fileSize: stats.size,
            createdAt: stats.mtime.toISOString(),
            isAuto: file.includes('auto'),
          });
        }
      }

      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (err: any) {
      logger.log('error', 'backup', `Ошибка чтения списка бэкапов: ${err.message}`);
      return [];
    }
  }

  /**
   * Восстанавливает базу данных из резервной копии
   */
  public async restoreBackup(backupPath: string): Promise<{ success: boolean; message: string }> {
    try {
      const dbConfig = store.getDbConfig();
      const currentDbPath = dbConfig.dbPath || dbManager.getCurrentDbPath();

      if (!fs.existsSync(backupPath)) {
        return { success: false, message: 'Файл резервной копии не найден' };
      }

      // Создаем страховку текущей базы перед перезаписью
      await this.createBackup(false);

      // Копируем файл бэкапа на место рабочей БД без fchmod
      safeCopyFile(backupPath, currentDbPath);

      // Переподключаем БД
      await dbManager.connect(currentDbPath, dbConfig.busyTimeout);

      logger.log('warn', 'backup', `База данных успешно восстановлена из ${backupPath}`);
      return { success: true, message: 'База данных успешно восстановлена' };
    } catch (err: any) {
      logger.log('error', 'backup', `Ошибка восстановления: ${err.message}`, err);
      return { success: false, message: `Ошибка восстановления: ${err.message}` };
    }
  }
}

export const backupManager = new BackupManager();
