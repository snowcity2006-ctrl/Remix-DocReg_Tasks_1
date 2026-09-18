import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  X,
  CheckSquare,
  FolderOpen,
  Users,
  FileText,
  AlertCircle,
  Download,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { TaskRecord } from '../../types';
import {
  getExportDatePrefix,
  getSingleExportFileName,
  prepareTaskExcelFiles,
  getAssigneeExportFileName,
} from '../../utils/excelExport';
import { electronBridge } from '../../services/electronBridge';

interface TaskExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  filteredTasks: TaskRecord[];
  showNotification?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const TaskExportModal: React.FC<TaskExportModalProps> = ({
  isOpen,
  onClose,
  filteredTasks,
  showNotification,
}) => {
  const [splitByAssignee, setSplitByAssignee] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Дата выгрузки в формате «гггг.мм.дд»
  const todayDate = useMemo(() => new Date(), []);
  const datePrefix = useMemo(() => getExportDatePrefix(todayDate), [todayDate]);
  const singleFileName = useMemo(() => getSingleExportFileName(todayDate), [todayDate]);

  // Группировка задач по исполнителям для предпросмотра
  const assigneeGroups = useMemo(() => {
    const map = new Map<string, TaskRecord[]>();
    for (const t of filteredTasks) {
      const name = (t.assigneeName || '').trim() || 'Без исполнителя';
      const list = map.get(name) || [];
      list.push(t);
      map.set(name, list);
    }

    const sortedKeys = Array.from(map.keys()).sort((a, b) => {
      if (a === 'Без исполнителя') return 1;
      if (b === 'Без исполнителя') return -1;
      return a.localeCompare(b, 'ru');
    });

    return sortedKeys.map((name) => ({
      name,
      fileName: getAssigneeExportFileName(name, todayDate),
      tasks: map.get(name) || [],
      count: (map.get(name) || []).length,
    }));
  }, [filteredTasks, todayDate]);

  if (!isOpen) return null;

  const handleExport = async () => {
    if (filteredTasks.length === 0) {
      showNotification?.('Нет задач для выгрузки с учетом текущих фильтров', 'error');
      return;
    }

    setIsExporting(true);
    try {
      if (!splitByAssignee) {
        // --- Выгрузка в один общий файл: «гггг.мм.дд_текущие задачи.xlsx» ---
        // 1. Вызов диалогового окна ОС для выбора места сохранения
        let targetFilePath: string | null = null;
        if (electronBridge.showSaveExcelDialog) {
          targetFilePath = await electronBridge.showSaveExcelDialog(singleFileName);
        } else {
          targetFilePath = singleFileName;
        }

        if (!targetFilePath) {
          // Пользователь отменил выбор в диалоге ОС
          setIsExporting(false);
          return;
        }

        // 2. Формирование книги Excel
        const [singlePayload] = prepareTaskExcelFiles(filteredTasks, false, todayDate);

        // 3. Сохранение файла
        if (electronBridge.saveFiles) {
          const res = await electronBridge.saveFiles([
            {
              filePath: targetFilePath,
              base64Data: singlePayload.base64Data,
            },
          ]);
          if (!res.success) {
            throw new Error(res.message || 'Не удалось сохранить файл');
          }
        }

        showNotification?.(
          `Файл "${singleFileName}" успешно выгружен (${filteredTasks.length} задач)`,
          'success'
        );
        onClose();
      } else {
        // --- Выгрузка в отдельные файлы по каждому из исполнителей: «гггг.мм.дд_имя исполнителя.xlsx» ---
        // 1. Вызов диалогового окна ОС для выбора папки сохранения
        let targetFolder: string | null = null;
        if (electronBridge.selectExportFolder) {
          targetFolder = await electronBridge.selectExportFolder(
            'Выберите папку для сохранения файлов Excel по исполнителям'
          );
        } else {
          targetFolder = 'Загрузки';
        }

        if (!targetFolder) {
          // Пользователь отменил диалог ОС
          setIsExporting(false);
          return;
        }

        // Нормализация пути папки (убираем завершающий слэш для унификации)
        const cleanFolder = targetFolder.replace(/[/\\]+$/, '');

        // 2. Формирование отдельных книг Excel для каждого исполнителя
        const filePayloads = prepareTaskExcelFiles(filteredTasks, true, todayDate);

        const filesToSave = filePayloads.map((payload) => {
          const separator = cleanFolder.includes('\\') ? '\\' : '/';
          const fullPath = `${cleanFolder}${separator}${payload.fileName}`;
          return {
            filePath: fullPath,
            base64Data: payload.base64Data,
          };
        });

        // 3. Сохранение файлов
        if (electronBridge.saveFiles) {
          const res = await electronBridge.saveFiles(filesToSave);
          if (!res.success) {
            throw new Error(res.message || 'Ошибка сохранения файлов');
          }
        }

        showNotification?.(
          `Успешно выгружено файлов: ${filePayloads.length} (по исполнителям, всего задач: ${filteredTasks.length})`,
          'success'
        );
        onClose();
      }
    } catch (err: any) {
      console.error('Ошибка выгрузки в Excel:', err);
      showNotification?.(`Ошибка при выгрузке: ${err.message}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      id="task-export-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        id="task-export-modal-container"
        className="bg-[#171A21] border border-[#2D3139] rounded-2xl w-full max-w-xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]"
      >
        {/* Шапка модального окна */}
        <div className="p-4 sm:p-5 border-b border-[#2D3139] flex items-center justify-between bg-[#12151B]/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#E0E0E0] flex items-center gap-2">
                Выгрузка задач в Excel
              </h3>
              <p className="text-xs text-gray-400">
                Экспорт данных таблицы с учетом установленных фильтров
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1F222B] transition-colors cursor-pointer"
            title="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Тело модального окна */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Сводка о задачах */}
          <div className="bg-[#12151B] p-3.5 rounded-xl border border-[#2D3139] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <CheckSquare className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-gray-300">
                Задач к выгрузке (с учетом фильтров):
              </span>
            </div>
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {filteredTasks.length} шт.
            </span>
          </div>

          {filteredTasks.length === 0 ? (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 text-amber-400" />
              <div>
                В таблице нет задач, соответствующих текущим параметрам поиска и фильтрации.
                Сбросьте или скорректируйте фильтры перед выгрузкой.
              </div>
            </div>
          ) : (
            <>
              {/* Опция разделения по исполнителям (Чекбокс по ТЗ) */}
              <div className="p-4 rounded-xl bg-[#1F222B]/60 border border-[#2D3139] hover:border-[#3D424D] transition-colors">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    id="checkbox-split-assignees"
                    type="checkbox"
                    checked={splitByAssignee}
                    onChange={(e) => setSplitByAssignee(e.target.checked)}
                    disabled={isExporting}
                    className="mt-0.5 w-4 h-4 rounded-sm text-blue-600 bg-[#0F1115] border-[#2D3139] focus:ring-blue-500 cursor-pointer"
                  />
                  <div className="flex-1 text-xs">
                    <span className="font-semibold text-[#E0E0E0] block">
                      Выгрузить в отдельные файлы по каждому из исполнителей
                    </span>
                    <span className="text-gray-400 text-[11px] block mt-1">
                      Формат имени файла для каждого сотрудника: <span className="font-mono text-emerald-400">«гггг.мм.дд_имя исполнителя»</span>
                    </span>
                  </div>
                </label>
              </div>

              {/* Предпросмотр создаваемых файлов */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span className="font-semibold flex items-center gap-1.5 text-[#E0E0E0]">
                    <FileText className="w-3.5 h-3.5 text-blue-400" />
                    Предпросмотр создаваемых файлов:
                  </span>
                  <span className="text-[11px]">
                    {splitByAssignee
                      ? `Файлов: ${assigneeGroups.length}`
                      : 'Файлов: 1 (общий)'}
                  </span>
                </div>

                {!splitByAssignee ? (
                  /* Один файл */
                  <div className="p-3 bg-[#12151B] border border-[#2D3139] rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div className="truncate">
                        <p className="text-xs font-mono font-medium text-emerald-400 truncate">
                          {singleFileName}
                        </p>
                        <p className="text-[11px] text-gray-400">
                          Все отфильтрованные задачи в одном документе
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-[#1F222B] text-gray-300 border border-[#2D3139] shrink-0">
                      {filteredTasks.length} задач
                    </span>
                  </div>
                ) : (
                  /* Список файлов по исполнителям */
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 border border-[#2D3139] rounded-xl p-2 bg-[#12151B]">
                    {assigneeGroups.map((group) => (
                      <div
                        key={group.name}
                        className="p-2 rounded-lg bg-[#171A21] border border-[#2D3139] flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <div className="truncate">
                            <span className="font-mono text-emerald-400 font-medium block truncate text-[11px]">
                              {group.fileName}
                            </span>
                            <span className="text-[10px] text-gray-400 flex items-center gap-1">
                              <Users className="w-2.5 h-2.5" />
                              {group.name}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0 ml-2">
                          {group.count} шт.
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Информация о диалоге операционной системы */}
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-start gap-2.5 text-xs text-blue-300">
                <FolderOpen className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block text-blue-200">
                    Выбор места сохранения через диалоговое окно ОС
                  </span>
                  <span className="text-[11px] text-blue-300/90 leading-tight block mt-0.5">
                    {splitByAssignee
                      ? 'Будет открыто окно проводника для выбора папки назначения. Все файлы будут записаны в выбранную директорию.'
                      : 'Будет открыто стандартное диалоговое окно проводника операционной системы для выбора расположения и подтверждения имени файла.'}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Подвал с кнопками */}
        <div className="p-4 border-t border-[#2D3139] bg-[#12151B]/60 flex items-center justify-end gap-2.5">
          <button
            id="btn-cancel-export-tasks"
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 bg-[#1F222B] hover:bg-[#2D3139] text-gray-300 hover:text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer border border-[#2D3139]"
          >
            Отмена
          </button>
          <button
            id="btn-confirm-export-tasks"
            type="button"
            onClick={handleExport}
            disabled={filteredTasks.length === 0 || isExporting}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs shadow-emerald-500/20 transition-all cursor-pointer"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Выгрузка...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Выбрать место и выгрузить</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
