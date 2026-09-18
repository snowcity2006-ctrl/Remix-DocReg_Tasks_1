import React, { useState, useEffect } from 'react';
import {
  Database,
  Folder,
  CheckCircle,
  AlertCircle,
  Clock,
  Shield,
  RefreshCw,
  HardDrive,
  X,
  Sliders,
  Check,
  FileText,
  Network,
  Archive,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { DatabaseConfig } from '../types';
import { electronBridge } from '../services/electronBridge';

interface DbConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved?: (config: DatabaseConfig) => void;
  onSaved?: () => void;
  isFirstLaunch?: boolean;
}

export const DbConfigModal: React.FC<DbConfigModalProps> = ({
  isOpen,
  onClose,
  onConfigSaved,
  onSaved,
  isFirstLaunch = false,
}) => {
  const [dbPath, setDbPath] = useState('');
  const [busyTimeout, setBusyTimeout] = useState(5000);
  const [syncMode, setSyncMode] = useState<'auto' | 'direct' | 'cache_sync'>('auto');
  const [autoBackup, setAutoBackup] = useState(true);
  const [backupFolder, setBackupFolder] = useState('');
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    pingMs?: number;
    writeLockOk?: boolean;
    hasNobrl?: boolean;
    mountWarning?: string;
    recommendedMode?: 'direct' | 'cache_sync';
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen]);

  const loadConfig = async () => {
    try {
      const cfg = await electronBridge.getDbConfig();
      setDbPath(cfg.dbPath || '');
      setBusyTimeout(cfg.busyTimeout || 5000);
      setSyncMode(cfg.syncMode || 'auto');
      setAutoBackup(cfg.autoBackupOnStart ?? true);
      setBackupFolder(cfg.backupFolder || '');
      setTestResult(null);
      setError(null);
    } catch (err: any) {
      setError(`Ошибка загрузки конфигурации: ${err.message}`);
    }
  };

  // Выбор папки для размещения БД через окно операционной системы
  const handleSelectFolderForDb = async () => {
    try {
      const selectedFolder = await electronBridge.selectDatabaseFolder();
      if (selectedFolder) {
        let filename = 'company_docs.sqlite';
        if (dbPath.trim()) {
          const cleanPath = dbPath.trim().replace(/\\/g, '/');
          const lastSegment = cleanPath.split('/').pop();
          if (lastSegment && (lastSegment.endsWith('.sqlite') || lastSegment.endsWith('.db') || lastSegment.endsWith('.sqlite3'))) {
            filename = lastSegment;
          }
        }
        const isWin = selectedFolder.includes('\\');
        const sep = isWin ? '\\' : '/';
        const cleanFolder = selectedFolder.endsWith('/') || selectedFolder.endsWith('\\')
          ? selectedFolder
          : `${selectedFolder}${sep}`;
        
        const newDbPath = `${cleanFolder}${filename}`;
        setDbPath(newDbPath);
        setTestResult(null);
        setError(null);
      }
    } catch (err: any) {
      setError(`Ошибка диалога выбора папки: ${err.message}`);
    }
  };

  // Выбор существующего файла БД через окно операционной системы
  const handleSelectFileForDb = async () => {
    try {
      const selected = await electronBridge.selectDatabaseFile();
      if (selected) {
        setDbPath(selected.replace(/\\/g, '/'));
        setTestResult(null);
        setError(null);
      }
    } catch (err: any) {
      setError(`Ошибка диалога выбора файла БД: ${err.message}`);
    }
  };

  // Выбор папки для сохранения резервной копии БД (бэкапа) через окно операционной системы
  const handleSelectBackupFolder = async () => {
    try {
      const selectedFolder = await electronBridge.selectBackupFolder();
      if (selectedFolder) {
        const isWin = selectedFolder.includes('\\');
        const sep = isWin ? '\\' : '/';
        const cleanFolder = selectedFolder.endsWith('/') || selectedFolder.endsWith('\\')
          ? selectedFolder
          : `${selectedFolder}${sep}`;
        setBackupFolder(cleanFolder);
        setError(null);
      }
    } catch (err: any) {
      setError(`Ошибка диалога выбора папки бэкапа: ${err.message}`);
    }
  };

  // Автоматическая установка папки бэкапа рядом с БД (/backup)
  const handleDefaultBackupFolder = () => {
    if (dbPath.trim()) {
      const normalized = dbPath.trim().replace(/\\/g, '/');
      const parts = normalized.split('/');
      parts.pop();
      const parentDir = parts.join('/');
      setBackupFolder(parentDir ? `${parentDir}/backup` : '/mnt/smb_share/docflow/backup');
    } else {
      setBackupFolder('/mnt/smb_share/docflow/backup');
    }
  };

  const isNetworkPath = (pathStr: string) => {
    const p = pathStr.toLowerCase();
    return p.startsWith('//') || p.startsWith('\\\\') || p.includes('/mnt/') || p.includes('smb') || p.includes('nfs');
  };

  const handleTestConnection = async () => {
    if (!dbPath.trim()) {
      setError('Укажите путь к файлу базы данных .sqlite');
      return;
    }
    setTesting(true);
    setError(null);
    try {
      const res = await electronBridge.testDbConnection(dbPath.trim());
      setTestResult(res);
      if (res.recommendedMode === 'cache_sync' && syncMode === 'auto') {
        setSyncMode('cache_sync');
      }
      if (!res.success) {
        setError(res.message);
      }
    } catch (err: any) {
      setError(`Ошибка тестирования: ${err.message}`);
      setTestResult({ success: false, message: err.message });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!dbPath.trim()) {
      setError('Путь к файлу базы данных обязателен для заполнения');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const configPayload: Partial<DatabaseConfig> = {
        dbPath: dbPath.trim(),
        backupFolder: backupFolder.trim() || undefined,
        busyTimeout,
        syncMode,
        autoBackupOnStart: autoBackup,
      };

      const res = electronBridge.saveDbConfig
        ? await electronBridge.saveDbConfig(configPayload)
        : await electronBridge.setDbPath(dbPath.trim());

      if (res.success) {
        if (res.config && onConfigSaved) {
          onConfigSaved(res.config);
        }
        if (onSaved) {
          onSaved();
        }
        onClose();
      } else {
        setError(res.message || 'Не удалось сохранить параметры базы данных');
      }
    } catch (err: any) {
      setError(`Ошибка сохранения: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const isDbNetwork = isNetworkPath(dbPath);
  const isBackupNetwork = isNetworkPath(backupFolder);

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${isMaximized ? 'p-1' : 'p-2 sm:p-4'} bg-black/75 backdrop-blur-xs animate-in fade-in duration-200`}>
      <div
        className={`bg-[#171A21] shadow-2xl border border-[#2D3139] overflow-hidden flex flex-col transition-all duration-200 ${
          isMaximized
            ? 'w-[99vw] h-[98vh] rounded-xl'
            : 'w-[92vw] max-w-4xl max-h-[92vh] rounded-2xl'
        }`}
      >
        {/* Заголовок (двойной клик разворачивает окно) */}
        <div
          onDoubleClick={() => setIsMaximized((prev) => !prev)}
          title="Двойной клик разворачивает / восстанавливает окно"
          className="px-6 py-4 border-b border-[#2D3139] flex items-center justify-between bg-[#12151B]/60 shrink-0 select-none cursor-default"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-blue-950/80 text-blue-400 flex items-center justify-center border border-blue-900/60 shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-[#E0E0E0] truncate">
                {isFirstLaunch ? 'Первоначальная настройка сетевой базы данных' : 'Настройка подключения к БД SQLite'}
              </h2>
              <p className="text-xs text-gray-400 truncate">
                Сетевой диск SMB / NFS для одновременной работы 6–10 пользователей
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0 ml-2">
            <button
              type="button"
              onClick={() => setIsMaximized((prev) => !prev)}
              title={isMaximized ? 'Восстановить исходный размер' : 'Развернуть на весь экран'}
              className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-[#1F222B] transition-colors cursor-pointer"
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            {!isFirstLaunch && (
              <button
                type="button"
                onClick={onClose}
                title="Закрыть окно"
                className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-[#1F222B] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Тело формы */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm flex-1">
          {error && (
            <div className="p-3.5 bg-rose-950/50 border border-rose-900/60 rounded-xl text-xs text-rose-300 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Внимание</p>
                <p>{error}</p>
              </div>
            </div>
          )}

          {/* 1. Выбор папки или файла для сохранения основного файла БД */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-gray-300">
                Путь к основному файлу базы данных (.sqlite) <span className="text-rose-500">*</span>
              </label>
              {isDbNetwork && (
                <span className="inline-flex items-center gap-1 text-[11px] text-blue-400 bg-blue-950/50 px-2 py-0.5 rounded-md border border-blue-800/40">
                  <Network className="w-3 h-3" />
                  Сетевой диск (SMB/NFS)
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  id="input-db-path"
                  type="text"
                  value={dbPath}
                  onChange={(e) => {
                    setDbPath(e.target.value);
                    setTestResult(null);
                  }}
                  placeholder="/mnt/smb_share/docflow/company_docs.sqlite или \\server\share\docflow\company_docs.sqlite"
                  className="w-full px-3.5 py-2.5 bg-[#0F1115] border border-[#2D3139] rounded-xl text-xs font-mono text-[#E0E0E0] placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Кнопка выбора папки на сетевых/локальных дисках */}
              <button
                id="btn-select-db-folder"
                type="button"
                onClick={handleSelectFolderForDb}
                className="px-3 py-2 bg-[#0F1115] hover:bg-[#1F222B] text-blue-400 hover:text-blue-300 rounded-xl font-medium text-xs flex items-center gap-1.5 transition-colors border border-blue-900/40 hover:border-blue-700/60 cursor-pointer shadow-xs"
                title="Выбрать папку через окно операционной системы"
              >
                <Folder className="w-4 h-4" />
                <span>Папка</span>
              </button>

              {/* Кнопка выбора существующего файла БД */}
              <button
                id="btn-select-db-file"
                type="button"
                onClick={handleSelectFileForDb}
                className="px-3 py-2 bg-[#0F1115] hover:bg-[#1F222B] text-gray-300 hover:text-white rounded-xl font-medium text-xs flex items-center gap-1.5 transition-colors border border-[#2D3139] cursor-pointer"
                title="Выбрать файл базы данных через окно операционной системы"
              >
                <FileText className="w-4 h-4 text-gray-400" />
                <span>Файл</span>
              </button>
            </div>

            <p className="text-[11px] text-gray-400">
              При выборе папки файл базы данных <span className="text-gray-300 font-mono">company_docs.sqlite</span> будет сохранен в выбранный каталог. Если файл отсутствует, он будет автоматически инициализирован.
            </p>
          </div>

          {/* 2. Папка для сохранения резервных копий (бэкапов) */}
          <div className="p-4 bg-[#0F1115]/60 rounded-xl border border-[#2D3139] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Archive className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-[#E0E0E0]">
                  Резервное копирование базы данных
                </span>
                {isBackupNetwork && (
                  <span className="text-[10px] text-emerald-400 bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-900/40">
                    Сетевой бэкап
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Автобэкап при старте:</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoBackup}
                    onChange={(e) => setAutoBackup(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-[#2D3139] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Папка для сохранения файла резервной копии базы данных (бэкапа)
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    id="input-backup-folder"
                    type="text"
                    value={backupFolder}
                    onChange={(e) => setBackupFolder(e.target.value)}
                    placeholder="/mnt/smb_share/docflow/backup или D:\DocFlow_Backups"
                    className="w-full px-3.5 py-2.5 bg-[#0F1115] border border-[#2D3139] rounded-xl text-xs font-mono text-[#E0E0E0] placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* Кнопка выбора папки для бэкапов через диалог ОС */}
                <button
                  id="btn-select-backup-folder"
                  type="button"
                  onClick={handleSelectBackupFolder}
                  className="px-3.5 py-2.5 bg-[#0F1115] hover:bg-[#1F222B] text-emerald-400 hover:text-emerald-300 rounded-xl font-medium text-xs flex items-center gap-1.5 transition-colors border border-emerald-900/40 hover:border-emerald-700/60 cursor-pointer shadow-xs"
                  title="Выбрать папку для резервных копий через окно операционной системы"
                >
                  <Folder className="w-4 h-4" />
                  <span>Выбрать папку</span>
                </button>

                {/* Кнопка быстрой установки рядом с БД */}
                <button
                  type="button"
                  onClick={handleDefaultBackupFolder}
                  className="px-3 py-2.5 bg-[#0F1115] hover:bg-[#1F222B] text-gray-400 hover:text-gray-200 rounded-xl text-xs transition-colors border border-[#2D3139] cursor-pointer whitespace-nowrap"
                  title="Установить подкаталог /backup рядом с файлом базы данных"
                >
                  Рядом с БД
                </button>
              </div>
              <p className="text-[11px] text-gray-400 mt-1.5">
                Резервные копии автоматически сохраняются с временной меткой в формате <span className="font-mono text-gray-300">company_docs_backup_ГГГГ-ММ-ДД_ЧЧ-ММ-СС.sqlite</span> в указанный сетевой или локальный каталог.
              </p>
            </div>
          </div>

          {/* Параметры сетевой многопользовательской блокировки */}
          <div className="p-4 bg-[#0F1115]/60 rounded-xl border border-[#2D3139] space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#E0E0E0]">
              <Sliders className="w-4 h-4 text-blue-400" />
              <span>Параметры параллельного доступа (SQLite Multi-user)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-gray-400 mb-1">
                  Таймаут блокировки (busy_timeout):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1000}
                    max={10000}
                    step={500}
                    value={busyTimeout}
                    onChange={(e) => setBusyTimeout(Number(e.target.value))}
                    className="w-24 px-2.5 py-1.5 bg-[#0F1115] border border-[#2D3139] rounded-lg font-mono text-xs text-[#E0E0E0] focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <span className="text-gray-400">мс (3000–5000 мс)</span>
                </div>
              </div>

              <div>
                <label className="block text-gray-400 mb-1">
                  Режим журнала (Journal Mode):
                </label>
                <div className="px-2.5 py-1.5 bg-[#0F1115] border border-[#2D3139] rounded-lg text-xs font-mono text-gray-300">
                  DELETE / TRUNCATE (WAL отключен)
                </div>
              </div>
            </div>

            {/* Выбор режима сетевой синхронизации */}
            <div className="pt-2 border-t border-[#2D3139]/60">
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Режим работы с сетевым диском:
              </label>
              <select
                id="select-db-sync-mode"
                value={syncMode}
                onChange={(e) => setSyncMode(e.target.value as 'auto' | 'direct' | 'cache_sync')}
                className="w-full px-3 py-2 bg-[#0F1115] border border-[#2D3139] rounded-xl text-xs text-[#E0E0E0] focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="auto">
                  Автоматический выбор (рекомендуется)
                </option>
                <option value="cache_sync">
                  Сетевая синхронизация через локальный кэш (для Astra Linux 1.7 / CIFS без прав root)
                </option>
                <option value="direct">
                  Прямой доступ к файлу (требует опцию монтирования nobrl в CIFS/SMB)
                </option>
              </select>
            </div>

            <div className="text-[11px] text-amber-300 bg-amber-950/40 p-2.5 rounded-lg border border-amber-900/60 space-y-1 leading-relaxed">
              <p><strong>Решение для Astra Linux 1.7 (CIFS/SMB):</strong> В режиме <em>«Сетевая синхронизация через локальный кэш»</em> все операции чтения и записи выполняются через быстрый локальный кэш с мгновенной фиксацией в сетевой файл под сетевым распределенным мьютексом. Это на 100% устраняет ошибку <code>SqliteError: database is locked</code> даже без прав root и без перенастройки опций монтирования в <code>/etc/fstab</code>.</p>
              <p className="text-amber-200/90"><strong>Альтернатива (с правами root):</strong> Смонтировать сетевую шару с опцией <code className="bg-amber-900/60 px-1 py-0.5 rounded text-white font-mono">nobrl</code> (например, <code className="bg-amber-900/60 px-1 py-0.5 rounded text-white font-mono">mount -t cifs ... -o nobrl</code>).</p>
            </div>
          </div>

          {/* Результат проверки подключения */}
          {testResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                testResult.success
                  ? 'bg-emerald-950/40 border-emerald-900/60 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-900/60 text-rose-300'
              }`}
            >
              {testResult.success ? (
                <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              )}
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{testResult.success ? 'Сетевой путь доступен' : 'Ошибка соединения'}</p>
                  {testResult.recommendedMode && (
                    <span className="text-[10px] px-2 py-0.5 bg-blue-950/80 text-blue-300 rounded border border-blue-800/40">
                      Режим: {testResult.recommendedMode === 'cache_sync' ? 'Локальный кэш (синхронизация)' : 'Прямой'}
                    </span>
                  )}
                </div>
                <p>{testResult.message}</p>
                {testResult.mountWarning && (
                  <p className="text-amber-300 bg-amber-950/60 p-2 rounded border border-amber-800/40 text-[11px]">
                    {testResult.mountWarning}
                  </p>
                )}
                {testResult.recommendedMode === 'cache_sync' && syncMode !== 'cache_sync' && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setSyncMode('cache_sync')}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors"
                    >
                      Применить рекомендуемый режим «Сетевая синхронизация через локальный кэш»
                    </button>
                  </div>
                )}
                {testResult.pingMs !== undefined && (
                  <p className="font-mono text-[11px] opacity-80">Задержка сети: {testResult.pingMs} мс</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Нижняя панель действий */}
        <div className="px-6 py-4 border-t border-[#2D3139] bg-[#12151B]/60 flex items-center justify-between gap-3">
          <button
            id="btn-test-db-connection"
            type="button"
            onClick={handleTestConnection}
            disabled={testing || !dbPath.trim()}
            className="px-4 py-2 bg-[#0F1115] border border-[#2D3139] hover:bg-[#1F222B] text-gray-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin text-blue-400' : ''}`} />
            <span>{testing ? 'Проверка...' : 'Проверить доступность'}</span>
          </button>

          <div className="flex items-center gap-2">
            {!isFirstLaunch && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-400 hover:text-white text-xs font-semibold rounded-xl hover:bg-[#1F222B] transition-colors cursor-pointer"
              >
                Отмена
              </button>
            )}
            <button
              id="btn-save-db-config"
              type="button"
              onClick={handleSave}
              disabled={saving || !dbPath.trim()}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs shadow-blue-500/30 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{saving ? 'Сохранение...' : 'Сохранить и подключиться'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

