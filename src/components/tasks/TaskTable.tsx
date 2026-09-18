import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Edit2,
  Trash2,
  Clock,
  User,
  CheckCircle2,
  Calendar,
  FileText,
  Lock,
  MoveDiagonal,
  RotateCcw,
  Maximize2,
  Minimize2,
  Sliders,
  X,
  AlertTriangle,
  FileSpreadsheet,
} from 'lucide-react';
import { TaskRecord } from '../../types';
import { formatDateRussian } from '../../utils/date';
import { calculateDaysRemaining, getTaskStatusInfo, formatDaysDisplay } from '../../utils/taskUtils';

export type TaskSortField =
  | 'id'
  | 'plannedEndDate'
  | 'actualEndDate'
  | 'daysRemaining'
  | 'assigneeName';

interface TaskTableProps {
  tasks: TaskRecord[];
  onEdit: (task: TaskRecord) => void;
  onDelete: (id: number) => Promise<void>;
  onToggleCheck: (id: number, field: 'isCompleted' | 'isAccepted', value: boolean) => Promise<void>;
  onChangeActualDate?: (id: number, dateStr: string) => Promise<void>;
  onOpenExport?: () => void;
}

// Начальные ширины колонок по умолчанию (в px)
const DEFAULT_COL_WIDTHS: Record<string, number> = {
  id: 60,
  task: 260,
  plannedEndDate: 115,
  actualEndDate: 135,
  isCompleted: 95,
  isAccepted: 90,
  daysRemaining: 135,
  assigneeName: 175,
  result: 210,
  actions: 85,
};

const MIN_COL_WIDTHS: Record<string, number> = {
  id: 45,
  task: 90,
  plannedEndDate: 75,
  actualEndDate: 95,
  isCompleted: 65,
  isAccepted: 65,
  daysRemaining: 80,
  assigneeName: 80,
  result: 90,
  actions: 65,
};

export const TaskTable: React.FC<TaskTableProps> = ({
  tasks,
  onEdit,
  onDelete,
  onToggleCheck,
  onChangeActualDate,
  onOpenExport,
}) => {
  // Сортировка (включая колонку "#" / id по ТЗ)
  const [sortField, setSortField] = useState<TaskSortField>('daysRemaining');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [pendingCheckId, setPendingCheckId] = useState<number | null>(null);
  const [savingDateId, setSavingDateId] = useState<number | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    taskId: number | null;
    taskText: string;
  }>({
    isOpen: false,
    taskId: null,
    taskText: '',
  });
  const [deleting, setDeleting] = useState(false);

  // 3. Управление шириной колонок (Column Resizing)
  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('task_table_col_widths');
      return saved ? { ...DEFAULT_COL_WIDTHS, ...JSON.parse(saved) } : DEFAULT_COL_WIDTHS;
    } catch {
      return DEFAULT_COL_WIDTHS;
    }
  });

  const latestColWidthsRef = useRef<Record<string, number>>(colWidths);
  latestColWidthsRef.current = colWidths;

  const resizingCol = useRef<{ colKey: string; startX: number; startWidth: number } | null>(null);

  const handleColMouseMove = useCallback((e: MouseEvent) => {
    if (!resizingCol.current) return;
    const { colKey, startX, startWidth } = resizingCol.current;
    const delta = e.clientX - startX;
    const minW = MIN_COL_WIDTHS[colKey] || 45;
    const newWidth = Math.max(minW, startWidth + delta);
    setColWidths((prev) => {
      const updated = { ...prev, [colKey]: newWidth };
      latestColWidthsRef.current = updated;
      return updated;
    });
  }, []);

  const handleColMouseUp = useCallback(() => {
    resizingCol.current = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    document.removeEventListener('mousemove', handleColMouseMove);
    document.removeEventListener('mouseup', handleColMouseUp);
    try {
      localStorage.setItem('task_table_col_widths', JSON.stringify(latestColWidthsRef.current));
    } catch {}
  }, [handleColMouseMove]);

  const startResizingCol = (colKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizingCol.current = {
      colKey,
      startX: e.clientX,
      startWidth: colWidths[colKey] || DEFAULT_COL_WIDTHS[colKey] || 100,
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleColMouseMove);
    document.addEventListener('mouseup', handleColMouseUp);
  };

  // 4. Масштабирование таблицы мышкой по высоте и ширине (Table Resizing)
  const DEFAULT_TABLE_HEIGHT = 520;
  const [tableHeight, setTableHeight] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('task_table_height');
      if (saved) {
        const val = Number(saved);
        if (!isNaN(val) && val >= 220 && val <= 2500) return val;
      }
    } catch {}
    return DEFAULT_TABLE_HEIGHT;
  });

  const [tableWidth, setTableWidth] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem('task_table_width');
      if (saved) {
        const val = Number(saved);
        if (!isNaN(val) && val >= 420 && val <= 4000) return val;
      }
    } catch {}
    return null;
  });

  const [isMaximized, setIsMaximized] = useState(false);
  const [isResizingTable, setIsResizingTable] = useState<'bottom' | 'right' | 'corner-se' | null>(null);
  const [liveDimensions, setLiveDimensions] = useState<{ width: number; height: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const resizingTable = useRef<{
    edge: 'bottom' | 'right' | 'corner-se';
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
    startColWidths: Record<string, number>;
  } | null>(null);

  const startResizingTable = (edge: 'bottom' | 'right' | 'corner-se', e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isMaximized || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    resizingTable.current = {
      edge,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: rect.width,
      startHeight: rect.height,
      startColWidths: { ...colWidths },
    };
    setIsResizingTable(edge);
    setLiveDimensions({ width: Math.round(rect.width), height: Math.round(rect.height) });

    let latestDimensions = { width: Math.round(rect.width), height: Math.round(rect.height) };
    let latestScaledWidths: Record<string, number> | null = null;

    const handleTableMouseMove = (moveEvent: MouseEvent) => {
      if (!resizingTable.current) return;
      const { edge: currentEdge, startX, startY, startWidth, startHeight, startColWidths } = resizingTable.current;

      let newHeight = startHeight;
      let newWidth = startWidth;

      // Масштабирование по высоте
      if (currentEdge === 'bottom' || currentEdge === 'corner-se') {
        const deltaY = moveEvent.clientY - startY;
        newHeight = Math.max(200, Math.min(window.innerHeight - 60, startHeight + deltaY));
        setTableHeight(newHeight);
      }

      // Масштабирование по ширине с пропорциональным пересчетом колонок
      if (currentEdge === 'right' || currentEdge === 'corner-se') {
        const deltaX = moveEvent.clientX - startX;
        const minW = 420;
        const maxW = Math.max(window.innerWidth - 32, 3800);
        newWidth = Math.max(minW, Math.min(maxW, startWidth + deltaX));
        setTableWidth(newWidth);

        // Пропорциональное масштабирование ширины столбцов по ТЗ
        const totalStartColW = Object.values(startColWidths).reduce((a, b) => a + b, 0) || startWidth;
        const ratio = newWidth / totalStartColW;
        const scaledColWidths: Record<string, number> = {};

        for (const [key, initialW] of Object.entries(startColWidths)) {
          const minWCol = MIN_COL_WIDTHS[key] || 35;
          scaledColWidths[key] = Math.max(minWCol, Math.round(initialW * ratio));
        }

        latestScaledWidths = scaledColWidths;
        setColWidths(scaledColWidths);
      }

      latestDimensions = { width: Math.round(newWidth), height: Math.round(newHeight) };
      setLiveDimensions(latestDimensions);
    };

    const handleTableMouseUp = () => {
      resizingTable.current = null;
      setIsResizingTable(null);
      setLiveDimensions(null);
      document.removeEventListener('mousemove', handleTableMouseMove);
      document.removeEventListener('mouseup', handleTableMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';

      try {
        localStorage.setItem('task_table_height', String(latestDimensions.height));
        localStorage.setItem('task_table_width', String(latestDimensions.width));
        if (latestScaledWidths) {
          localStorage.setItem('task_table_col_widths', JSON.stringify(latestScaledWidths));
        }
      } catch {}
    };

    document.body.style.userSelect = 'none';
    if (edge === 'bottom') document.body.style.cursor = 'row-resize';
    else if (edge === 'right') document.body.style.cursor = 'col-resize';
    else if (edge === 'corner-se') document.body.style.cursor = 'se-resize';

    document.addEventListener('mousemove', handleTableMouseMove);
    document.addEventListener('mouseup', handleTableMouseUp);
  };

  const resetTableDimensions = () => {
    setTableHeight(DEFAULT_TABLE_HEIGHT);
    setTableWidth(null);
    setColWidths(DEFAULT_COL_WIDTHS);
    setIsMaximized(false);
    try {
      localStorage.removeItem('task_table_height');
      localStorage.removeItem('task_table_width');
      localStorage.removeItem('task_table_col_widths');
    } catch {}
  };

  // 2. Обработчик упорядочивания (включая колонку "#")
  const handleSort = (field: TaskSortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      // Для дат и номеров по умолчанию asc
      setSortOrder('asc');
    }
  };

  const sortedTasks = useMemo(() => {
    const list = [...tasks];
    list.sort((a, b) => {
      let valA: any;
      let valB: any;

      if (sortField === 'id') {
        valA = a.id;
        valB = b.id;
      } else if (sortField === 'daysRemaining') {
        valA = calculateDaysRemaining(a.plannedEndDate, a.isAccepted, a.frozenDaysRemaining, a.actualEndDate);
        valB = calculateDaysRemaining(b.plannedEndDate, b.isAccepted, b.frozenDaysRemaining, b.actualEndDate);
        if (valA === null) valA = 999999;
        if (valB === null) valB = 999999;
      } else if (sortField === 'plannedEndDate') {
        valA = a.plannedEndDate;
        valB = b.plannedEndDate;
      } else if (sortField === 'actualEndDate') {
        valA = a.actualEndDate || '9999-99-99';
        valB = b.actualEndDate || '9999-99-99';
      } else if (sortField === 'assigneeName') {
        valA = (a.assigneeName || '').toLowerCase();
        valB = (b.assigneeName || '').toLowerCase();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [tasks, sortField, sortOrder]);

  const handleToggle = async (id: number, field: 'isCompleted' | 'isAccepted', currentVal: boolean) => {
    try {
      setPendingCheckId(id);
      await onToggleCheck(id, field, !currentVal);
    } finally {
      setPendingCheckId(null);
    }
  };

  const handleDateChange = async (id: number, dateStr: string) => {
    if (!onChangeActualDate) return;
    try {
      setSavingDateId(id);
      await onChangeActualDate(id, dateStr);
    } finally {
      setSavingDateId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (deleteDialog.taskId !== null) {
      setDeleting(true);
      try {
        await onDelete(deleteDialog.taskId);
        setDeleteDialog({ isOpen: false, taskId: null, taskText: '' });
      } catch (err: any) {
        console.error('Ошибка при удалении задачи:', err);
      } finally {
        setDeleting(false);
      }
    }
  };

  const renderSortIcon = (field: TaskSortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-gray-600 opacity-60 group-hover:opacity-100 shrink-0" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-blue-400 shrink-0" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-blue-400 shrink-0" />
    );
  };

  if (tasks.length === 0) {
    return (
      <div className="bg-[#171A21] border border-[#2D3139] rounded-2xl p-12 text-center shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-[#1F222B] text-gray-400 flex items-center justify-center mx-auto mb-3">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-[#E0E0E0]">Задачи не найдены</h3>
        <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
          По текущим параметрам поиска или фильтрации нет подходящих поручений.
        </p>
      </div>
    );
  }

  // Общая сумма ширин всех колонок для таблицы
  const totalTableColsWidth = Object.values(colWidths).reduce((a, b) => a + b, 0);

  return (
    <div
      ref={containerRef}
      style={{
        width: isMaximized ? '100%' : tableWidth ? `${tableWidth}px` : '100%',
        maxWidth: '100%',
      }}
      className="relative bg-[#171A21] border border-[#2D3139] rounded-2xl shadow-xs flex flex-col transition-[width] duration-75 group/table"
    >
      {/* Верхняя панель управления размерами таблицы */}
      <div
        id="task-table-header"
        className="px-3 py-2 border-b border-blue-500/40 flex items-center justify-between text-xs text-white bg-blue-600 rounded-t-2xl select-none shadow-xs"
      >
        <div className="flex items-center gap-2">
          <span
            id="task-table-title"
            className="font-bold tracking-wide text-sm !text-white text-white"
            style={{ color: '#ffffff' }}
          >
            Таблица задач
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {onOpenExport && (
            <button
              id="btn-task-table-export-excel"
              type="button"
              onClick={onOpenExport}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-700/80 hover:bg-emerald-700 text-white transition-colors cursor-pointer text-[11px] border border-emerald-400/40 shadow-xs font-medium"
              title="Выгрузить отфильтрованные задачи в файл(ы) Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
              <span className="hidden sm:inline">В Excel</span>
            </button>
          )}

          <button
            type="button"
            onClick={resetTableDimensions}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-700/60 hover:bg-blue-800 text-white transition-colors cursor-pointer text-[11px] border border-blue-400/30 shadow-xs"
            title="Сбросить ширину, высоту и ширину колонок к значениям по умолчанию"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">Сбросить масштаб</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsMaximized(!isMaximized);
              if (!isMaximized) {
                setTableWidth(null);
              }
            }}
            className="p-1 rounded-lg hover:bg-blue-700/80 text-blue-100 hover:text-white transition-colors cursor-pointer"
            title={isMaximized ? 'Восстановить ширину' : 'На всю ширину экрана'}
          >
            {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Скроллируемая область таблицы */}
      <div
        style={{ height: `${tableHeight}px` }}
        className="overflow-auto relative scrollbar-thin scrollbar-thumb-gray-700"
      >
        <table
          className="w-full text-left border-collapse text-xs table-fixed"
          style={{ minWidth: `${totalTableColsWidth}px` }}
        >
          {/* Спецификация ширин колонок */}
          <colgroup>
            <col style={{ width: `${colWidths.id}px` }} />
            <col style={{ width: `${colWidths.task}px` }} />
            <col style={{ width: `${colWidths.plannedEndDate}px` }} />
            <col style={{ width: `${colWidths.actualEndDate}px` }} />
            <col style={{ width: `${colWidths.isCompleted}px` }} />
            <col style={{ width: `${colWidths.isAccepted}px` }} />
            <col style={{ width: `${colWidths.daysRemaining}px` }} />
            <col style={{ width: `${colWidths.assigneeName}px` }} />
            <col style={{ width: `${colWidths.result}px` }} />
            <col style={{ width: `${colWidths.actions}px` }} />
          </colgroup>

          {/* Заголовки с возможностью изменения ширины колонок и сортировки */}
          <thead className="sticky top-0 z-20 bg-[#0F1115] shadow-xs">
            <tr className="border-b border-[#2D3139] text-gray-400 font-semibold select-none">
              {/* 2. Колонка #: сортировка по возрастанию/убыванию */}
              <th
                onClick={() => handleSort('id')}
                className="py-3 px-2 text-center cursor-pointer hover:text-white transition-colors group relative select-none overflow-hidden border-r border-[#2D3139]"
                title="Сортировка по номеру (#)"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>#</span>
                  {renderSortIcon('id')}
                </div>
                {/* Ресайзер ширины колонки */}
                <div
                  onMouseDown={(e) => startResizingCol('id', e)}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-blue-500/60 transition-colors z-30"
                  title="Потяните для изменения ширины колонки"
                />
              </th>

              {/* Задача (без сортировки) */}
              <th className="py-3 px-3 relative select-none text-gray-400 font-semibold overflow-hidden border-r border-[#2D3139]">
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <FileText className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span className="truncate">Задача</span>
                </div>
                <div
                  onMouseDown={(e) => startResizingCol('task', e)}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-blue-500/60 transition-colors z-30"
                  title="Потяните для изменения ширины колонки"
                />
              </th>

              {/* Дата окончания по плану */}
              <th
                onClick={() => handleSort('plannedEndDate')}
                className="py-3 px-2.5 cursor-pointer hover:text-white transition-colors group relative select-none overflow-hidden border-r border-[#2D3139]"
                title="Сортировка по плановой дате"
              >
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span className="truncate">План</span>
                  {renderSortIcon('plannedEndDate')}
                </div>
                <div
                  onMouseDown={(e) => startResizingCol('plannedEndDate', e)}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-blue-500/60 transition-colors z-30"
                  title="Потяните для изменения ширины колонки"
                />
              </th>

              {/* Дата окончания по факту */}
              <th
                onClick={() => handleSort('actualEndDate')}
                className="py-3 px-2.5 cursor-pointer hover:text-white transition-colors group relative select-none overflow-hidden border-r border-[#2D3139]"
                title="Сортировка по фактической дате"
              >
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <Calendar className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                  <span className="truncate">Факт</span>
                  {renderSortIcon('actualEndDate')}
                </div>
                <div
                  onMouseDown={(e) => startResizingCol('actualEndDate', e)}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-blue-500/60 transition-colors z-30"
                  title="Потяните для изменения ширины колонки"
                />
              </th>

              {/* Выполнено (без сортировки) */}
              <th className="py-3 px-2 text-center relative select-none text-gray-400 font-semibold overflow-hidden border-r border-[#2D3139]">
                <div className="flex items-center justify-center gap-1">
                  <span className="truncate">Выполнено</span>
                </div>
                <div
                  onMouseDown={(e) => startResizingCol('isCompleted', e)}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-blue-500/60 transition-colors z-30"
                  title="Потяните для изменения ширины колонки"
                />
              </th>

              {/* Принято (без сортировки) */}
              <th className="py-3 px-2 text-center relative select-none text-gray-400 font-semibold overflow-hidden border-r border-[#2D3139]">
                <div className="flex items-center justify-center gap-1">
                  <span className="truncate">Принято</span>
                </div>
                <div
                  onMouseDown={(e) => startResizingCol('isAccepted', e)}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-blue-500/60 transition-colors z-30"
                  title="Потяните для изменения ширины колонки"
                />
              </th>

              {/* Осталось (План - Факт при принятии) */}
              <th
                onClick={() => handleSort('daysRemaining')}
                className="py-3 px-2.5 cursor-pointer hover:text-white transition-colors group relative select-none overflow-hidden border-r border-[#2D3139]"
                title="Сортировка по колонке 'Осталось' (при принятии: План - Факт)"
              >
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">Осталось</span>
                  {renderSortIcon('daysRemaining')}
                </div>
                <div
                  onMouseDown={(e) => startResizingCol('daysRemaining', e)}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-blue-500/60 transition-colors z-30"
                  title="Потяните для изменения ширины колонки"
                />
              </th>

              {/* Ответственный */}
              <th
                onClick={() => handleSort('assigneeName')}
                className="py-3 px-3 cursor-pointer hover:text-white transition-colors group relative select-none overflow-hidden border-r border-[#2D3139]"
                title="Сортировка по ответственному"
              >
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <User className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span className="truncate">Ответственный</span>
                  {renderSortIcon('assigneeName')}
                </div>
                <div
                  onMouseDown={(e) => startResizingCol('assigneeName', e)}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-blue-500/60 transition-colors z-30"
                  title="Потяните для изменения ширины колонки"
                />
              </th>

              {/* Результат */}
              <th className="py-3 px-3 relative select-none overflow-hidden border-r border-[#2D3139]">
                <span className="truncate">Результат</span>
                <div
                  onMouseDown={(e) => startResizingCol('result', e)}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-blue-500/60 transition-colors z-30"
                  title="Потяните для изменения ширины колонки"
                />
              </th>

              {/* Действия */}
              <th className="py-3 px-2 text-right relative select-none overflow-hidden">
                <span>Действия</span>
                <div
                  onMouseDown={(e) => startResizingCol('actions', e)}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-blue-500/60 transition-colors z-30"
                  title="Потяните для изменения ширины колонки"
                />
              </th>
            </tr>
          </thead>

          {/* 3 & 4. Тело таблицы: перенос содержимого по строкам при недостаточной ширине (break-words whitespace-normal text-wrap) */}
          <tbody className="divide-y divide-[#2D3139]/70 text-[#E0E0E0]">
            {sortedTasks.map((t) => {
              const daysRemaining = calculateDaysRemaining(
                t.plannedEndDate,
                t.isAccepted,
                t.frozenDaysRemaining,
                t.actualEndDate
              );
              const status = getTaskStatusInfo(daysRemaining, t.isAccepted, t.isCompleted);
              const isChecking = pendingCheckId === t.id;

              return (
                <tr
                  key={t.id}
                  className={`group transition-colors hover:bg-[#1C202A] ${
                    t.isAccepted
                      ? 'bg-[#12141a]/60 opacity-90'
                      : daysRemaining !== null && daysRemaining < 0
                      ? 'bg-rose-950/10'
                      : ''
                  }`}
                >
                  {/* Номер ID с поддержкой переноса */}
                  <td className="py-3 px-2 text-center text-gray-500 font-mono text-[11px] break-words overflow-hidden border-r border-[#2D3139]">
                    {t.id}
                  </td>

                  {/* Текст задачи: перенос по строкам при любой ширине */}
                  <td className="py-3 px-3 overflow-hidden border-r border-[#2D3139]">
                    <div className="font-medium text-[#E0E0E0] break-words whitespace-normal text-wrap leading-relaxed">
                      {t.task}
                    </div>
                  </td>

                  {/* Плановая дата */}
                  <td className="py-3 px-2.5 font-mono text-[11px] text-gray-300 break-words whitespace-normal text-wrap overflow-hidden border-r border-[#2D3139]">
                    {formatDateRussian(t.plannedEndDate)}
                  </td>

                  {/* Фактическая дата - ручной выбор */}
                  <td className="py-2 px-1.5 overflow-hidden border-r border-[#2D3139]">
                    <div className="flex items-center gap-1 group/date relative">
                      <input
                        type="date"
                        value={t.actualEndDate || ''}
                        disabled={savingDateId === t.id}
                        onChange={(e) => handleDateChange(t.id, e.target.value)}
                        onClick={(e) => {
                          try {
                            (e.currentTarget as HTMLInputElement).showPicker?.();
                          } catch {
                            // Игнорируем, если showPicker не поддерживается браузером
                          }
                        }}
                        className="bg-[#0F1115] hover:bg-[#1A1D24] focus:bg-[#1A1D24] text-[11px] font-mono text-gray-200 border border-[#2D3139] hover:border-blue-500/60 focus:border-blue-500 rounded-lg px-2 py-1 outline-none transition-all cursor-pointer w-full dark:[color-scheme:dark] [color-scheme:light] disabled:opacity-50"
                        title="Ручной выбор даты по факту"
                      />
                      {t.actualEndDate && (
                        <button
                          type="button"
                          onClick={() => handleDateChange(t.id, '')}
                          disabled={savingDateId === t.id}
                          className="p-1 rounded-md text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0 cursor-pointer"
                          title="Очистить дату"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Чекбокс: Выполнено */}
                  <td className="py-3 px-2 text-center overflow-hidden border-r border-[#2D3139]">
                    <button
                      type="button"
                      disabled={isChecking}
                      onClick={() => handleToggle(t.id, 'isCompleted', t.isCompleted)}
                      className={`inline-flex items-center justify-center p-1.5 rounded-lg border transition-all cursor-pointer ${
                        t.isCompleted
                          ? 'bg-blue-600/20 text-blue-400 border-blue-500/40 hover:bg-blue-600/30'
                          : 'bg-[#0F1115] text-gray-600 border-[#2D3139] hover:border-gray-500'
                      }`}
                      title={t.isCompleted ? 'Отмечено как выполнено' : 'Отметить выполнение'}
                    >
                      <input
                        type="checkbox"
                        checked={t.isCompleted}
                        onChange={() => {}}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-0 focus:ring-offset-0 bg-transparent border-none cursor-pointer pointer-events-none"
                      />
                    </button>
                  </td>

                  {/* Чекбокс: Принято */}
                  <td className="py-3 px-2 text-center overflow-hidden border-r border-[#2D3139]">
                    <button
                      type="button"
                      disabled={isChecking || !t.isCompleted}
                      onClick={() => {
                        if (!t.isCompleted) return;
                        handleToggle(t.id, 'isAccepted', t.isAccepted);
                      }}
                      className={`inline-flex items-center justify-center p-1.5 rounded-lg border transition-all ${
                        !t.isCompleted
                          ? 'opacity-35 cursor-not-allowed bg-[#0F1115] text-gray-700 border-[#2D3139]'
                          : t.isAccepted
                          ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-600/30 cursor-pointer'
                          : 'bg-[#0F1115] text-gray-600 border-[#2D3139] hover:border-gray-500 cursor-pointer'
                      }`}
                      title={
                        !t.isCompleted
                          ? 'Недоступно: сначала необходимо отметить выполнение задачи в колонке "Выполнено"'
                          : t.isAccepted
                          ? 'Задача принята руководителем (значение в колонке "Осталось" рассчитано как "План" - "Факт")'
                          : 'Принять задачу'
                      }
                    >
                      <input
                        type="checkbox"
                        checked={t.isAccepted}
                        disabled={!t.isCompleted}
                        onChange={() => {}}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-0 focus:ring-offset-0 bg-transparent border-none pointer-events-none disabled:opacity-50"
                      />
                    </button>
                  </td>

                  {/* Осталось с цветовой индикацией */}
                  <td className="py-3 px-2.5 overflow-hidden border-r border-[#2D3139]">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold border break-words whitespace-normal ${status.badgeClass}`}
                        title={
                          t.isAccepted
                            ? `Принято: расчет разницы "План" - "Факт" = ${formatDaysDisplay(daysRemaining, false)} дн.`
                            : `До планового срока: ${formatDaysDisplay(daysRemaining, false)} дн.`
                        }
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${status.dotClass} shrink-0`} />
                        <span className="font-mono">
                          {formatDaysDisplay(daysRemaining, t.isAccepted)}
                        </span>
                        {t.isAccepted && <Lock className="w-3 h-3 text-blue-400 ml-0.5 shrink-0" />}
                      </span>
                    </div>
                  </td>

                  {/* Ответственный: перенос по строкам */}
                  <td className="py-3 px-3 text-gray-300 overflow-hidden border-r border-[#2D3139]">
                    {t.assigneeName ? (
                      <div className="flex items-start gap-1.5 break-words whitespace-normal text-wrap">
                        <User className="w-3 h-3 text-gray-400 shrink-0 mt-0.5" />
                        <span className="break-words whitespace-normal text-wrap font-medium leading-relaxed">
                          {t.assigneeName}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-500 italic">—</span>
                    )}
                  </td>

                  {/* Результат: перенос по строкам */}
                  <td className="py-3 px-3 overflow-hidden border-r border-[#2D3139]">
                    {t.result ? (
                      <div className="text-gray-300 text-[11px] leading-relaxed break-words whitespace-normal text-wrap">
                        {t.result}
                      </div>
                    ) : (
                      <span className="text-gray-600 italic">—</span>
                    )}
                  </td>

                  {/* Действия */}
                  <td className="py-3 px-2 text-right overflow-hidden">
                    <div className="flex items-center justify-end gap-1 flex-wrap">
                      <button
                        type="button"
                        onClick={() => onEdit(t)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-400 hover:bg-[#2D3139] transition-colors cursor-pointer"
                        title="Редактировать"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        id={`btn-delete-task-${t.id}`}
                        type="button"
                        onClick={() =>
                          setDeleteDialog({
                            isOpen: true,
                            taskId: t.id,
                            taskText: t.task,
                          })
                        }
                        className="p-1.5 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-[#2D3139] transition-colors cursor-pointer"
                        title="Удалить задачу"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 4. Ручки масштабирования таблицы мышкой по высоте и ширине */}
      {!isMaximized && (
        <>
          {/* Нижняя граница (масштабирование по высоте) */}
          <div
            onMouseDown={(e) => startResizingTable('bottom', e)}
            className="h-2 w-full cursor-row-resize hover:bg-blue-500/20 active:bg-blue-500/40 transition-colors flex items-center justify-center border-t border-[#2D3139]/40 group"
            title="Потяните для изменения высоты таблицы"
          >
            <div className="w-8 h-1 rounded-full bg-gray-600/40 group-hover:bg-blue-400/80 transition-colors" />
          </div>

          {/* Правая граница (масштабирование по ширине) */}
          <div
            onMouseDown={(e) => startResizingTable('right', e)}
            className="absolute top-0 right-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-500/20 active:bg-blue-500/40 transition-colors z-20"
            title="Потяните для изменения ширины таблицы"
          />

          {/* Нижний правый угол (масштабирование одновременно по высоте и ширине) */}
          <div
            onMouseDown={(e) => startResizingTable('corner-se', e)}
            className="absolute -bottom-1 -right-1 w-6 h-6 cursor-se-resize flex items-end justify-end p-1 hover:text-blue-400 text-gray-500 transition-colors z-30"
            title="Потяните за угол для одновременного масштабирования по высоте и ширине"
          >
            <MoveDiagonal className="w-4 h-4 stroke-[2.5]" />
          </div>
        </>
      )}

      {/* Модальное окно подтверждения удаления задачи */}
      {deleteDialog.isOpen && (
        <div
          id="task-delete-dialog-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => {
            if (!deleting) setDeleteDialog({ isOpen: false, taskId: null, taskText: '' });
          }}
        >
          <div
            id="task-delete-dialog"
            className="bg-[#171A21] rounded-2xl shadow-2xl border border-[#2D3139] w-full max-w-md overflow-hidden p-6 space-y-4 text-[#E0E0E0]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-950/80 text-rose-400 flex items-center justify-center border border-rose-900 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#E0E0E0]">
                  Удаление задачи №{deleteDialog.taskId}
                </h4>
                <p className="text-xs text-gray-400">
                  Подтверждение операции
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              Вы уверены, что хотите безвозвратно удалить задачу: <br />
              <strong className="text-[#E0E0E0] break-words line-clamp-3 mt-1 block">«{deleteDialog.taskText}»</strong>?
            </p>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                id="btn-cancel-delete-task"
                type="button"
                onClick={() => setDeleteDialog({ isOpen: false, taskId: null, taskText: '' })}
                disabled={deleting}
                className="px-4 py-2 text-gray-400 hover:text-white text-xs font-semibold rounded-xl hover:bg-[#1F222B] transition-colors cursor-pointer disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                id="btn-confirm-delete-task"
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-xs shadow-rose-500/20 transition-colors cursor-pointer disabled:opacity-50"
              >
                {deleting ? 'Удаление...' : 'Удалить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
