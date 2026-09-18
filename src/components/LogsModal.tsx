import React, { useState, useEffect } from 'react';
import { Terminal, X, RefreshCw, Trash2, Download, Copy, Check, Maximize2, Minimize2 } from 'lucide-react';
import { LogEntry } from '../types';
import { electronBridge } from '../services/electronBridge';
import { formatDateTimeRussian } from '../utils/date';

interface LogsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LogsModal: React.FC<LogsModalProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [copied, setCopied] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await electronBridge.getLogs(200);
      setLogs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadLogs();
      setConfirmClear(false);
    }
  }, [isOpen]);

  const handleClear = async () => {
    await electronBridge.clearLogs();
    setLogs([]);
    setConfirmClear(false);
  };

  const handleCopy = () => {
    const text = logs
      .map((l) => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.message} ${l.details ? JSON.stringify(l.details) : ''}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredLogs = logs.filter((l) => {
    if (filterLevel === 'all') return true;
    return l.level === filterLevel;
  });

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${isMaximized ? 'p-1' : 'p-2 sm:p-4'} bg-black/75 backdrop-blur-xs animate-in fade-in duration-150`}>
      <div
        className={`bg-[#171A21] text-[#E0E0E0] shadow-2xl border border-[#2D3139] overflow-hidden flex flex-col transition-all duration-200 ${
          isMaximized
            ? 'w-[99vw] h-[98vh] rounded-xl'
            : 'w-[94vw] max-w-6xl max-h-[92vh] rounded-2xl'
        }`}
      >
        {/* Заголовок (двойной клик разворачивает окно) */}
        <div
          onDoubleClick={() => setIsMaximized((prev) => !prev)}
          title="Двойной клик разворачивает / восстанавливает окно"
          className="px-6 py-4 border-b border-[#2D3139] flex items-center justify-between bg-[#12151B]/60 shrink-0 select-none cursor-default"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-950/80 text-blue-400 flex items-center justify-center border border-blue-900/60 shrink-0">
              <Terminal className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-[#E0E0E0] truncate">
                Журнал системных событий и ошибок
              </h3>
              <p className="text-xs text-gray-400 truncate">
                Диагностика работы SQLite, сети SMB/NFS и блокировок busy_timeout
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            <button
              onClick={loadLogs}
              disabled={loading}
              title="Обновить журнал"
              className="p-1.5 text-gray-400 hover:text-white hover:bg-[#1F222B] rounded-lg transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-400' : ''}`} />
            </button>
            <button
              onClick={handleCopy}
              title="Скопировать логи в буфер обмена"
              className="p-1.5 text-gray-400 hover:text-white hover:bg-[#1F222B] rounded-lg transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            {confirmClear ? (
              <div className="flex items-center gap-1.5 bg-rose-950/60 border border-rose-800/80 px-2 py-1 rounded-lg text-xs">
                <span className="text-rose-300 text-[11px] font-medium">Очистить?</span>
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-semibold cursor-pointer"
                >
                  Да
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="px-2 py-0.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-[11px] cursor-pointer"
                >
                  Отмена
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmClear(true)}
                title="Очистить логи"
                className="p-1.5 text-gray-400 hover:text-rose-400 hover:bg-[#1F222B] rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsMaximized((prev) => !prev)}
              title={isMaximized ? 'Восстановить исходный размер' : 'Развернуть на весь экран'}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-[#1F222B] rounded-lg transition-colors cursor-pointer"
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              title="Закрыть окно"
              className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-[#1F222B] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Фильтры по уровню */}
        <div className="px-6 py-2.5 bg-[#0F1115]/60 border-b border-[#2D3139] flex items-center gap-2 text-xs">
          <span className="text-gray-400">Уровень:</span>
          {['all', 'info', 'warn', 'error'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setFilterLevel(lvl)}
              className={`px-2.5 py-1 rounded-md capitalize font-mono text-[11px] transition-colors cursor-pointer ${
                filterLevel === lvl
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'bg-[#1F222B] text-gray-400 hover:text-white'
              }`}
            >
              {lvl === 'all' ? 'Все' : lvl}
            </button>
          ))}
          <span className="ml-auto text-gray-400 font-mono text-[11px]">
            Записей: {filteredLogs.length}
          </span>
        </div>

        {/* Список логов */}
        <div className="p-4 overflow-y-auto font-mono text-[11px] space-y-1.5 bg-[#0F1115] flex-1">
          {filteredLogs.map((log, idx) => {
            const isError = log.level === 'error';
            const isWarn = log.level === 'warn';
            return (
              <div
                key={idx}
                className={`p-2.5 rounded-lg border ${
                  isError
                    ? 'bg-rose-950/40 border-rose-900/60 text-rose-300'
                    : isWarn
                    ? 'bg-amber-950/40 border-amber-900/60 text-amber-300'
                    : 'bg-[#171A21] border-[#2D3139] text-[#E0E0E0]'
                }`}
              >
                <div className="flex items-center gap-2 text-[10px] text-gray-400">
                  <span>{formatDateTimeRussian(log.timestamp)}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded font-bold uppercase ${
                      isError
                        ? 'bg-rose-900 text-rose-200'
                        : isWarn
                        ? 'bg-amber-900 text-amber-200'
                        : 'bg-[#1F222B] text-gray-300'
                    }`}
                  >
                    {log.level}
                  </span>
                </div>
                <div className="mt-1 font-medium select-text">{log.message}</div>
                {log.details && (
                  <pre className="mt-1 text-[10px] text-gray-400 bg-[#0F1115] p-2 rounded border border-[#2D3139]/60 overflow-x-auto">
                    {typeof log.details === 'string' ? log.details : JSON.stringify(log.details, null, 2)}
                  </pre>
                )}
              </div>
            );
          })}

          {filteredLogs.length === 0 && (
            <div className="py-12 text-center text-gray-500">
              Логи отсутствуют
            </div>
          )}
        </div>

        {/* Футер */}
        <div className="px-6 py-3 border-t border-[#2D3139] bg-[#12151B]/60 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#1F222B] hover:bg-[#2D3139] text-[#E0E0E0] rounded-xl text-xs font-semibold transition-colors cursor-pointer border border-[#2D3139]"
          >
            Закрыть
          </button>
        </div>

      </div>
    </div>
  );
};
