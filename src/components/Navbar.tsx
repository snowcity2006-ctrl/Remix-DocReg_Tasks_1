import React, { useState } from 'react';
import {
  FileText,
  Database,
  RefreshCw,
  HardDriveDownload,
  Settings,
  Archive,
  Terminal,
  Sun,
  Moon,
  Laptop,
  CheckCircle2,
  AlertTriangle,
  FolderOpen,
  CheckSquare
} from 'lucide-react';
import { ThemeMode, DatabaseConfig, DbStatus } from '../types';
import { formatDbUpdateDateTime } from '../utils/date';

export interface NavbarProps {
  dbStatus?: DbStatus | null;
  dbConfig?: DatabaseConfig | null;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  onOpenDbConfig: () => void;
  onRefreshData?: () => Promise<void> | void;
  onRefreshDb?: () => Promise<void> | void;
  onCreateBackup?: () => Promise<void> | void;
  onManualBackup?: () => Promise<void> | void;
  onOpenBackups?: () => void;
  onOpenLogs?: () => void;
  activeTab?: 'documents' | 'directories' | 'tasks';
  onSelectTab?: (tab: 'documents' | 'directories' | 'tasks') => void;
  lastUpdateTime?: string;
  refreshing?: boolean;
  backingUp?: boolean;
}

export const Navbar: React.FC<NavbarProps> = React.memo(({
  dbStatus,
  dbConfig,
  theme,
  onThemeChange,
  onOpenDbConfig,
  onRefreshData,
  onRefreshDb,
  onCreateBackup,
  onManualBackup,
  onOpenBackups,
  onOpenLogs,
  activeTab = 'documents',
  onSelectTab,
  lastUpdateTime,
  refreshing: externalRefreshing,
  backingUp: externalBackingUp,
}) => {
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);

  const refreshing = externalRefreshing ?? isRefreshing;
  const backingUp = externalBackingUp ?? isBackingUp;

  const isAccessible = dbStatus?.isAccessible ?? dbConfig?.isAccessible ?? true;
  const dbPath = dbStatus?.path || dbConfig?.dbPath || '';
  const displayUpdateTime = formatDbUpdateDateTime(lastUpdateTime || dbStatus?.lastUpdated);

  const handleRefresh = async () => {
    if (onRefreshData) {
      setIsRefreshing(true);
      try {
        await onRefreshData();
      } finally {
        setIsRefreshing(false);
      }
    } else if (onRefreshDb) {
      setIsRefreshing(true);
      try {
        await onRefreshDb();
      } finally {
        setIsRefreshing(false);
      }
    }
  };

  const handleBackup = async () => {
    if (onCreateBackup) {
      setIsBackingUp(true);
      try {
        await onCreateBackup();
      } finally {
        setIsBackingUp(false);
      }
    } else if (onManualBackup) {
      setIsBackingUp(true);
      try {
        await onManualBackup();
      } finally {
        setIsBackingUp(false);
      }
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-[#171A21] border-b border-[#2D3139] transition-colors shadow-xs w-full">
      <div className="w-full px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Левая часть: Логотип и переключение вкладок */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-900/30">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold tracking-tight text-[#E0E0E0] leading-none">
                    DocFlow <span className="text-blue-500">Pro</span>
                  </h1>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div
                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-medium ${
                      isAccessible !== false
                        ? 'text-green-400 bg-green-500/10 border-green-500/20'
                        : 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                    }`}
                  >
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${
                        isAccessible !== false ? 'bg-green-500 animate-pulse' : 'bg-rose-500'
                      }`}
                    ></div>
                    {isAccessible !== false ? 'БД активна' : 'БД недоступна'}
                  </div>
                </div>
              </div>
            </div>

            {/* Навигационные табы: Документы / Задачи / Справочники (если передан onSelectTab) */}
            {onSelectTab && (
              <nav className="hidden md:flex items-center bg-[#0F1115] p-1 rounded-xl border border-[#2D3139] text-xs font-medium">
                <button
                  id="nav-tab-documents"
                  onClick={() => onSelectTab('documents')}
                  className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
                    activeTab === 'documents'
                      ? 'bg-blue-600 text-white font-semibold shadow-xs'
                      : 'text-gray-400 hover:text-[#E0E0E0] hover:bg-[#1F222B]'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Документы</span>
                </button>

                <button
                  id="nav-tab-tasks"
                  onClick={() => onSelectTab('tasks')}
                  className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
                    activeTab === 'tasks'
                      ? 'bg-blue-600 text-white font-semibold shadow-xs'
                      : 'text-gray-400 hover:text-[#E0E0E0] hover:bg-[#1F222B]'
                  }`}
                >
                  <CheckSquare className="w-4 h-4" />
                  <span>Задачи</span>
                </button>

                <button
                  id="nav-tab-directories"
                  onClick={() => onSelectTab('directories')}
                  className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
                    activeTab === 'directories'
                      ? 'bg-blue-600 text-white font-semibold shadow-xs'
                      : 'text-gray-400 hover:text-[#E0E0E0] hover:bg-[#1F222B]'
                  }`}
                >
                  <FolderOpen className="w-4 h-4" />
                  <span>Справочники</span>
                </button>
              </nav>
            )}
          </div>

          {/* Правая часть: Статус обновления БД, кнопки действий и тема */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Блок с последним временем обновления БД по ТЗ: Дата: ДД-ММ-ГГГГ, Время: ЧЧ:ММ:СС */}
            <div className="hidden sm:flex flex-col items-end text-right pr-1">
              <span className="text-[10px] text-gray-400 font-medium tracking-wide">
                Синхронизация БД
              </span>
              <span id="label-last-db-update" className="text-xs text-blue-300 font-semibold tabular-nums font-mono">
                {displayUpdateTime}
              </span>
            </div>

            {/* Кнопка ручного обновления БД */}
            <button
              id="btn-refresh-db"
              type="button"
              onClick={handleRefresh}
              disabled={refreshing || isRefreshing}
              title={`Обновить базу данных и синхронизировать все формы (Последнее обновление: ${displayUpdateTime})`}
              className="px-2.5 sm:px-3 py-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-600/20 bg-blue-600/10 rounded-xl transition-all border border-blue-500/30 cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-xs shrink-0"
            >
              <RefreshCw className={`w-4 h-4 ${(refreshing || isRefreshing) ? 'animate-spin text-blue-400' : ''}`} />
              <span className="text-xs font-semibold whitespace-nowrap">
                {refreshing || isRefreshing ? 'Обновление...' : 'Обновить БД'}
              </span>
            </button>

            {/* Кнопка создания резервной копии (Бэкап) */}
            <button
              id="btn-create-backup"
              onClick={handleBackup}
              disabled={backingUp}
              title="Создать резервную копию базы данных сейчас"
              className="p-2 text-orange-400 hover:text-orange-300 hover:bg-[#2D3139] bg-[#0F1115] rounded-lg transition-colors border border-[#2D3139] cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              <HardDriveDownload className={`w-4 h-4 ${backingUp ? 'animate-bounce text-orange-400' : ''}`} />
              <span className="hidden xl:inline text-xs font-medium">Бэкап</span>
            </button>

            {/* Кнопка журнала бэкапов (если передан обработчик) */}
            {onOpenBackups && (
              <button
                id="btn-open-backups"
                onClick={onOpenBackups}
                title="Управление резервными копиями"
                className="p-2 text-gray-400 hover:text-[#E0E0E0] hover:bg-[#2D3139] bg-[#0F1115] rounded-lg transition-colors border border-[#2D3139] cursor-pointer"
              >
                <Archive className="w-4 h-4" />
              </button>
            )}

            {/* Кнопка Журнала событий (Логи) */}
            {onOpenLogs && (
              <button
                id="btn-open-logs"
                onClick={onOpenLogs}
                title="Журнал событий и отладка"
                className="p-2 text-gray-400 hover:text-[#E0E0E0] hover:bg-[#2D3139] bg-[#0F1115] rounded-lg transition-colors border border-[#2D3139] cursor-pointer"
              >
                <Terminal className="w-4 h-4" />
              </button>
            )}

            {/* Кнопка настроек подключения к БД */}
            <button
              id="btn-open-db-settings"
              onClick={onOpenDbConfig}
              title="Настройки сетевой базы данных"
              className="p-2 text-gray-400 hover:text-[#E0E0E0] hover:bg-[#2D3139] bg-[#0F1115] rounded-lg transition-colors border border-[#2D3139] cursor-pointer"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Переключатель темы */}
            <div className="relative">
              <button
                id="btn-theme-menu"
                onClick={() => setThemeMenuOpen(!themeMenuOpen)}
                title="Выбор темы оформления (Светлая / Темная / Системная)"
                className="p-2 text-gray-400 hover:text-amber-400 hover:bg-[#2D3139] bg-[#0F1115] rounded-lg transition-colors border border-[#2D3139] cursor-pointer flex items-center gap-1.5"
              >
                {theme === 'light' && <Sun className="w-4 h-4 text-amber-500" />}
                {theme === 'dark' && <Moon className="w-4 h-4 text-blue-400" />}
                {theme === 'system' && <Laptop className="w-4 h-4 text-gray-400" />}
                <span className="text-[11px] hidden sm:inline font-medium">
                  {theme === 'light' ? 'Светлая' : theme === 'dark' ? 'Темная' : 'Авто'}
                </span>
              </button>

              {themeMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setThemeMenuOpen(false)}
                  />
                  <div
                    className="absolute right-0 mt-2 w-48 bg-[#171A21] rounded-xl shadow-2xl border border-[#2D3139] py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-[#E0E0E0]"
                  >
                    <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                      Оформление
                    </div>
                    <button
                      id="theme-option-light"
                      onClick={() => {
                        onThemeChange('light');
                        setThemeMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-[#1F222B] transition-colors cursor-pointer ${
                        theme === 'light' ? 'text-blue-500 font-semibold bg-[#1F222B]/50' : 'text-gray-300'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Sun className="w-3.5 h-3.5 text-amber-500" />
                        Светлая
                      </span>
                      {theme === 'light' && <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />}
                    </button>

                    <button
                      id="theme-option-dark"
                      onClick={() => {
                        onThemeChange('dark');
                        setThemeMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-[#1F222B] transition-colors cursor-pointer ${
                        theme === 'dark' ? 'text-blue-400 font-semibold bg-[#1F222B]/50' : 'text-gray-300'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Moon className="w-3.5 h-3.5 text-blue-400" />
                        Темная (Elegance)
                      </span>
                      {theme === 'dark' && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />}
                    </button>

                    <button
                      id="theme-option-system"
                      onClick={() => {
                        onThemeChange('system');
                        setThemeMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-[#1F222B] transition-colors cursor-pointer ${
                        theme === 'system' ? 'text-blue-400 font-semibold bg-[#1F222B]/50' : 'text-gray-300'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Laptop className="w-3.5 h-3.5 text-gray-400" />
                        Системная
                      </span>
                      {theme === 'system' && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />}
                    </button>
                  </div>
                </>
              )}
            </div>

          </div>
        </div>

        {/* Мобильная навигация (если передан onSelectTab) */}
        {onSelectTab && (
          <div className="flex md:hidden items-center justify-between py-2 border-t border-[#2D3139] gap-2">
            <div className="flex items-center gap-1 bg-[#0F1115] p-0.5 rounded-lg border border-[#2D3139] w-full">
              <button
                onClick={() => onSelectTab('documents')}
                className={`flex-1 py-1.5 text-xs rounded-md text-center font-medium ${
                  activeTab === 'documents'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Документы
              </button>
              <button
                onClick={() => onSelectTab('tasks')}
                className={`flex-1 py-1.5 text-xs rounded-md text-center font-medium ${
                  activeTab === 'tasks'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Задачи
              </button>
              <button
                onClick={() => onSelectTab('directories')}
                className={`flex-1 py-1.5 text-xs rounded-md text-center font-medium ${
                  activeTab === 'directories'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Справочники
              </button>
            </div>
            <div className="text-[10px] font-mono text-gray-500 shrink-0">
              {displayUpdateTime}
            </div>
          </div>
        )}
      </div>
    </header>
  );
});
