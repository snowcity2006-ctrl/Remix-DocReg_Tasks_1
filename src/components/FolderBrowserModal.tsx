import React, { useState } from 'react';
import {
  Folder,
  FolderOpen,
  Network,
  HardDrive,
  Check,
  X,
  Plus,
  ArrowUp,
  FolderPlus,
  Monitor,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Laptop,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { electronBridge } from '../services/electronBridge';

export interface FolderBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (selectedPath: string) => void;
  title?: string;
  initialPath?: string;
  mode?: 'database' | 'backup' | 'document';
}

interface PresetPath {
  label: string;
  path: string;
  type: 'smb' | 'nfs' | 'unc' | 'local';
  description: string;
}

const PRESET_PATHS: PresetPath[] = [
  {
    label: 'Сетевой диск SMB (Основной)',
    path: '/mnt/smb_share/docflow/',
    type: 'smb',
    description: 'Основной общесетевой каталог документов компании (Astra Linux / Linux)',
  },
  {
    label: 'Сетевой диск SMB (Резервные копии)',
    path: '/mnt/smb_share/docflow/backup/',
    type: 'smb',
    description: 'Выделенный каталог бэкапов на сетевом диске SMB',
  },
  {
    label: 'Сетевой ресурс NFS',
    path: '/mnt/network_share/docflow/',
    type: 'nfs',
    description: 'Сетевая файловая система NFS общего доступа',
  },
  {
    label: 'Сетевой диск Windows UNC (Основной)',
    path: '\\\\server\\share\\docflow\\',
    type: 'unc',
    description: 'Сетевой ресурс Windows UNC для рабочих мест Windows 11',
  },
  {
    label: 'Сетевой диск Windows UNC (Бэкапы)',
    path: '\\\\server\\share\\docflow\\backup\\',
    type: 'unc',
    description: 'Сетевой каталог резервных копий Windows UNC',
  },
  {
    label: 'Подключенный сетевой диск Z:',
    path: 'Z:\\docflow\\',
    type: 'unc',
    description: 'Сетевой диск Z: в проводнике Windows',
  },
  {
    label: 'Локальный каталог Astra Linux',
    path: '/home/user/docflow/',
    type: 'local',
    description: 'Локальный рабочий каталог пользователя в Astra Linux 1.7 / 1.8',
  },
  {
    label: 'Локальный диск Windows (D:)',
    path: 'D:\\DocFlow_DB\\',
    type: 'local',
    description: 'Локальный раздел жесткого диска Windows 11',
  },
];

// Виртуальная файловая структура сетевых и локальных каталогов для навигации
interface VirtualDirectoryNode {
  [folder: string]: VirtualDirectoryNode;
}

const VIRTUAL_FS: VirtualDirectoryNode = {
  mnt: {
    smb_share: {
      docflow: {
        backup: {
          '2026': {},
          'archive': {},
        },
        incoming: {},
        outgoing: {},
        internal: {},
        orders: {},
      },
      shared_docs: {},
    },
    network_share: {
      docflow: {
        backup: {},
        archive: {},
      },
    },
  },
  home: {
    user: {
      docflow: {
        backup: {},
      },
      Documents: {},
    },
  },
  var: {
    docflow: {
      db: {},
      backup: {},
    },
  },
  'C:': {
    DocFlow: {
      backup: {},
      data: {},
    },
  },
  'D:': {
    DocFlow_DB: {
      backup: {},
      archives: {},
    },
    DocFlow_Backups: {},
  },
  'Z:': {
    docflow: {
      backup: {},
      incoming: {},
      outgoing: {},
    },
  },
};

export const FolderBrowserModal: React.FC<FolderBrowserModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  title = 'Выбор папки на сетевом или локальном диске',
  initialPath = '',
  mode = 'database',
}) => {
  const [currentPath, setCurrentPath] = useState<string>(
    initialPath || (mode === 'backup' ? '/mnt/smb_share/docflow/backup/' : '/mnt/smb_share/docflow/')
  );
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [activeTab, setActiveTab] = useState<'network' | 'tree' | 'manual'>('network');
  const [customFolders, setCustomFolders] = useState<Record<string, string[]>>({});
  const [isMaximized, setIsMaximized] = useState(false);

  if (!isOpen) return null;

  // Очистка и нормализация пути
  const normalizePath = (p: string) => {
    let clean = p.trim();
    if (clean.startsWith('\\\\')) {
      // Windows UNC путь
      if (!clean.endsWith('\\')) clean += '\\';
      return clean;
    }
    if (/^[A-Za-z]:/.test(clean)) {
      // Windows диск
      clean = clean.replace(/\//g, '\\');
      if (!clean.endsWith('\\')) clean += '\\';
      return clean;
    }
    // Unix путь (Astra Linux)
    clean = clean.replace(/\\/g, '/');
    if (!clean.endsWith('/')) clean += '/';
    return clean;
  };

  const isNetwork =
    currentPath.startsWith('//') ||
    currentPath.startsWith('\\\\') ||
    currentPath.toLowerCase().includes('/mnt/') ||
    currentPath.toLowerCase().includes('smb') ||
    currentPath.toLowerCase().includes('nfs') ||
    currentPath.toLowerCase().startsWith('z:');

  // Определение списка папок в текущей директории
  const getSubfolders = (pathStr: string): string[] => {
    const norm = pathStr.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    const segments = norm ? norm.split('/') : [];
    
    let current: VirtualDirectoryNode = VIRTUAL_FS;
    for (const seg of segments) {
      if (current && typeof current === 'object' && seg in current) {
        current = current[seg];
      } else {
        // Динамически созданные папки
        const extra = customFolders[pathStr] || [];
        return extra;
      }
    }

    const defaultSubs = current && typeof current === 'object' ? Object.keys(current) : [];
    const extraSubs = customFolders[pathStr] || [];
    return Array.from(new Set([...defaultSubs, ...extraSubs]));
  };

  const handleCreateFolder = () => {
    const trimmed = newFolderName.trim();
    if (!trimmed) return;
    const normCurrent = normalizePath(currentPath);
    setCustomFolders((prev) => ({
      ...prev,
      [normCurrent]: [...(prev[normCurrent] || []), trimmed],
    }));
    setNewFolderName('');
    setIsCreatingFolder(false);
    // Переходим в созданную папку
    const sep = currentPath.includes('\\') ? '\\' : '/';
    const nextPath = `${normCurrent}${trimmed}${sep}`;
    setCurrentPath(nextPath);
  };

  const handleNavigateUp = () => {
    const isWin = currentPath.includes('\\') || /^[A-Za-z]:/.test(currentPath);
    const sep = isWin ? '\\' : '/';
    const parts = currentPath.split(sep).filter(Boolean);
    if (parts.length <= 1) {
      setCurrentPath(isWin ? 'C:\\' : '/mnt/');
      return;
    }
    parts.pop();
    const up = parts.join(sep) + sep;
    setCurrentPath(currentPath.startsWith('/') ? `/${up}` : up);
  };

  const handleOpenSystemDialog = async () => {
    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        const selected = mode === 'backup'
          ? await window.electronAPI.selectBackupFolder()
          : await window.electronAPI.selectDatabaseFolder();
        if (selected) {
          setCurrentPath(normalizePath(selected));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectConfirm = () => {
    const finalPath = normalizePath(currentPath);
    onSelect(finalPath);
    onClose();
  };

  const subfolders = getSubfolders(currentPath);

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${isMaximized ? 'p-1' : 'p-2 sm:p-4'} bg-black/75 backdrop-blur-xs animate-in fade-in duration-200`}>
      <div
        className={`bg-[#171A21] shadow-2xl border border-[#2D3139] overflow-hidden flex flex-col text-[#E0E0E0] transition-all duration-200 ${
          isMaximized
            ? 'w-[99vw] h-[98vh] rounded-xl'
            : 'w-[92vw] max-w-5xl max-h-[92vh] rounded-2xl'
        }`}
      >
        {/* Заголовок модального окна (двойной клик разворачивает окно) */}
        <div
          onDoubleClick={() => setIsMaximized((prev) => !prev)}
          title="Двойной клик разворачивает / восстанавливает окно"
          className="px-5 sm:px-6 py-4 border-b border-[#2D3139] flex items-center justify-between bg-[#1F222B]/70 shrink-0 select-none cursor-default"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30 shrink-0">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-[#E0E0E0] leading-tight truncate">
                {title}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5 truncate">
                Поддержка сетевых дисков (SMB/NFS/UNC) и локальных путей Astra Linux и Windows
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0 ml-2">
            <button
              type="button"
              onClick={() => setIsMaximized((prev) => !prev)}
              title={isMaximized ? 'Восстановить исходный размер' : 'Развернуть на весь экран'}
              className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-[#2D3139] transition-colors cursor-pointer"
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              title="Закрыть окно"
              className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-[#2D3139] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Вкладки: Сетевые ресурсы / Проводник каталогов / Ручной ввод */}
        <div className="flex border-b border-[#2D3139] bg-[#12151B] px-4 pt-2 gap-2 text-xs font-semibold shrink-0">
          <button
            onClick={() => setActiveTab('network')}
            className={`px-3 py-2 rounded-t-xl border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'network'
                ? 'border-blue-500 text-blue-400 bg-[#171A21]'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Network className="w-4 h-4" />
            <span>Сетевые ресурсы (SMB / NFS)</span>
          </button>

          <button
            onClick={() => setActiveTab('tree')}
            className={`px-3 py-2 rounded-t-xl border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'tree'
                ? 'border-blue-500 text-blue-400 bg-[#171A21]'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Folder className="w-4 h-4" />
            <span>Обзор и создание папок</span>
          </button>

          <button
            onClick={() => setActiveTab('manual')}
            className={`px-3 py-2 rounded-t-xl border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'manual'
                ? 'border-blue-500 text-blue-400 bg-[#171A21]'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Laptop className="w-4 h-4" />
            <span>Прямой ввод пути</span>
          </button>
        </div>

        {/* Тело модального окна */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* Текущий выбранный путь */}
          <div className="bg-[#0F1115] p-3.5 rounded-xl border border-[#2D3139] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400 font-medium flex items-center gap-1.5">
                <FolderOpen className="w-3.5 h-3.5 text-blue-400" />
                Текущая выбранная папка:
              </span>
              {isNetwork ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-800/40">
                  <Network className="w-3 h-3" />
                  Сетевой диск (SMB/NFS/UNC)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-800/40">
                  <HardDrive className="w-3 h-3" />
                  Локальный диск
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={currentPath}
                onChange={(e) => setCurrentPath(e.target.value)}
                placeholder="/mnt/smb_share/docflow/ или \\server\share\docflow\"
                className="w-full px-3 py-2 bg-[#171A21] border border-[#2D3139] rounded-lg text-xs font-mono text-[#E0E0E0] placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
              
              {/* Кнопка системного проводника если в Electron */}
              {typeof window !== 'undefined' && (window as any).electronAPI && (
                <button
                  type="button"
                  onClick={handleOpenSystemDialog}
                  title="Открыть диалог проводника операционной системы"
                  className="px-2.5 py-2 bg-[#1F222B] hover:bg-[#2D3139] text-gray-300 rounded-lg text-xs font-medium border border-[#2D3139] shrink-0 flex items-center gap-1 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Проводник ОС</span>
                </button>
              )}
            </div>
          </div>

          {/* Вкладка 1: Список предустановленных сетевых дисков */}
          {activeTab === 'network' && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-300">
                Быстрый выбор сетевого каталога (Astra Linux 1.7 / Windows 11):
              </p>
              <div className="grid grid-cols-1 gap-2 max-h-72 overflow-y-auto pr-1">
                {PRESET_PATHS.map((item, idx) => {
                  const isSelected = currentPath.replace(/\\/g, '/') === item.path.replace(/\\/g, '/');
                  return (
                    <div
                      key={idx}
                      onClick={() => setCurrentPath(item.path)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                        isSelected
                          ? 'bg-blue-600/15 border-blue-500/60 ring-1 ring-blue-500/30'
                          : 'bg-[#0F1115] hover:bg-[#1F222B] border-[#2D3139]'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                            item.type === 'smb' || item.type === 'nfs' || item.type === 'unc'
                              ? 'bg-blue-950 text-blue-400 border border-blue-800/50'
                              : 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                          }`}
                        >
                          {item.type === 'local' ? (
                            <HardDrive className="w-3.5 h-3.5" />
                          ) : (
                            <Network className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#E0E0E0] truncate">
                              {item.label}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#171A21] border border-[#2D3139] text-gray-400">
                              {item.type.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-xs font-mono text-blue-300/90 truncate mt-0.5">
                            {item.path}
                          </p>
                          <p className="text-[11px] text-gray-500 truncate mt-0.5">
                            {item.description}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 pt-1">
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Вкладка 2: Обзор папок и создание новых */}
          {activeTab === 'tree' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleNavigateUp}
                    className="px-2.5 py-1.5 bg-[#0F1115] hover:bg-[#1F222B] text-gray-300 rounded-lg text-xs font-medium border border-[#2D3139] flex items-center gap-1.5 cursor-pointer transition-colors"
                    title="Перейти на уровень выше"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                    <span>Вверх</span>
                  </button>
                  <span className="text-xs text-gray-400 truncate max-w-xs font-mono">
                    {currentPath}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCreatingFolder(!isCreatingFolder)}
                  className="px-2.5 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 rounded-lg text-xs font-medium border border-blue-500/30 flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>Создать папку</span>
                </button>
              </div>

              {/* Форма создания новой папки */}
              {isCreatingFolder && (
                <div className="p-3 bg-[#0F1115] border border-blue-500/40 rounded-xl flex items-center gap-2 animate-in fade-in duration-150">
                  <FolderPlus className="w-4 h-4 text-blue-400 shrink-0" />
                  <input
                    type="text"
                    autoFocus
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateFolder();
                      if (e.key === 'Escape') setIsCreatingFolder(false);
                    }}
                    placeholder="Название новой папки (например: backup_2026)..."
                    className="flex-1 px-3 py-1.5 bg-[#171A21] border border-[#2D3139] rounded-lg text-xs text-[#E0E0E0] placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleCreateFolder}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Создать
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreatingFolder(false)}
                    className="px-2.5 py-1.5 text-gray-400 hover:text-white text-xs cursor-pointer"
                  >
                    Отмена
                  </button>
                </div>
              )}

              {/* Список подпапок */}
              <div className="bg-[#0F1115] border border-[#2D3139] rounded-xl overflow-hidden max-h-60 overflow-y-auto divide-y divide-[#2D3139]/40">
                {subfolders.length === 0 ? (
                  <div className="p-6 text-center text-gray-500 text-xs">
                    В этой папке нет вложенных каталогов. Вы можете создать новую папку или нажать «Выбрать эту папку».
                  </div>
                ) : (
                  subfolders.map((folderName, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        const norm = normalizePath(currentPath);
                        const sep = norm.includes('\\') ? '\\' : '/';
                        setCurrentPath(`${norm}${folderName}${sep}`);
                      }}
                      className="flex items-center justify-between px-3.5 py-2.5 hover:bg-[#1F222B] transition-colors cursor-pointer text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <Folder className="w-4 h-4 text-blue-400 shrink-0" />
                        <span className="font-medium text-[#E0E0E0]">{folderName}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-500" />
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Вкладка 3: Ручной ввод и справка */}
          {activeTab === 'manual' && (
            <div className="space-y-3 text-xs text-gray-300">
              <p className="font-semibold text-[#E0E0E0]">
                Поддерживаемые форматы путей к сетевым и локальным дискам:
              </p>
              
              <div className="space-y-2 font-mono text-[11px]">
                <div className="p-2.5 bg-[#0F1115] border border-[#2D3139] rounded-lg">
                  <span className="text-blue-400 font-bold block mb-1">Сетевой диск SMB (Astra Linux 1.7 / 1.8):</span>
                  <span className="text-gray-300">/mnt/smb_share/docflow/</span>
                  <span className="block text-gray-500 text-[10px] mt-0.5">Точка монтирования Samba/CIFS в Linux</span>
                </div>

                <div className="p-2.5 bg-[#0F1115] border border-[#2D3139] rounded-lg">
                  <span className="text-blue-400 font-bold block mb-1">Сетевой ресурс Windows UNC:</span>
                  <span className="text-gray-300">\\192.168.1.100\docflow\ или \\server\share\docflow\</span>
                  <span className="block text-gray-500 text-[10px] mt-0.5">Сетевое имя или IP-адрес сервера в сети Windows</span>
                </div>

                <div className="p-2.5 bg-[#0F1115] border border-[#2D3139] rounded-lg">
                  <span className="text-emerald-400 font-bold block mb-1">Подключенный сетевой диск:</span>
                  <span className="text-gray-300">Z:\docflow\</span>
                  <span className="block text-gray-500 text-[10px] mt-0.5">Сетевая буква диска Windows</span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Подвал с кнопками подтверждения */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-[#2D3139] bg-[#12151B] flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#1F222B] hover:bg-[#2D3139] text-gray-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer border border-[#2D3139]"
          >
            Отмена
          </button>

          <button
            type="button"
            id="btn-confirm-folder-selection"
            onClick={handleSelectConfirm}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 flex items-center gap-2 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Выбрать эту папку</span>
          </button>
        </div>

      </div>
    </div>
  );
};
