import React from 'react';
import {
  Search,
  RotateCcw,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Flame,
  CheckSquare
} from 'lucide-react';
import { TaskFilterState, Employee, TaskRecord } from '../../types';
import { calculateDaysRemaining } from '../../utils/taskUtils';
import { AssigneeMultiSelect } from './AssigneeMultiSelect';

interface TaskFiltersProps {
  filters: TaskFilterState;
  onChange: (filters: TaskFilterState) => void;
  employees: Employee[];
  tasks: TaskRecord[];
  totalCount: number;
  filteredCount: number;
}

export const TaskFilters: React.FC<TaskFiltersProps> = ({
  filters,
  onChange,
  employees,
  tasks,
  totalCount,
  filteredCount,
}) => {
  // Вычисление сводной статистики для инфо-бейжей
  const stats = React.useMemo(() => {
    let inProgress = 0;
    let completed = 0;
    let accepted = 0;
    let overdue = 0;
    let dueToday = 0;

    tasks.forEach((t) => {
      if (t.isAccepted) {
        accepted++;
      } else {
        // Все задачи, которые не приняты руководителем, считаются находящимися в работе (на исполнении)
        inProgress++;
        if (t.isCompleted) {
          completed++;
        }
        const days = calculateDaysRemaining(
          t.plannedEndDate,
          t.isAccepted,
          t.frozenDaysRemaining,
          t.actualEndDate
        );
        if (days !== null) {
          if (days < 0) overdue++;
          else if (days === 0) dueToday++;
        }
      }
    });

    return { inProgress, completed, accepted, overdue, dueToday };
  }, [tasks]);

  const handleReset = () => {
    onChange({
      searchQuery: '',
      status: 'all',
      assigneeId: null,
      assigneeIds: [],
      plannedFrom: '',
      plannedTo: '',
    });
  };

  const hasActiveFilters =
    Boolean(filters.searchQuery) ||
    filters.status !== 'all' ||
    (filters.assigneeIds && filters.assigneeIds.length > 0) ||
    Boolean(filters.plannedFrom) ||
    Boolean(filters.plannedTo);

  return (
    <div className="bg-[#171A21] border border-[#2D3139] rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
      {/* 1. Элементы "Всего задач", "В работе", "Срок сегодня", "Просрочено", "Принято" в одну строчку */}
      <div id="task-status-counters" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {/* Всего задач */}
        <button
          id="task-stat-all"
          data-active={filters.status === 'all'}
          type="button"
          onClick={() => onChange({ ...filters, status: 'all' })}
          className={`h-9 px-3 rounded-xl border flex items-center justify-between gap-2 transition-all cursor-pointer ${
            filters.status === 'all'
              ? 'bg-[#1F222B] border-blue-500/60 text-black dark:text-white shadow-xs'
              : 'bg-[#0F1115] border-[#2D3139] hover:border-gray-600 text-black dark:text-gray-300'
          }`}
          title="Показать все задачи"
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <CheckSquare className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 shrink-0" />
            <span className="text-xs font-semibold text-black dark:text-inherit truncate">Всего задач</span>
          </div>
          <span className="text-xs font-bold text-black dark:text-[#E0E0E0] font-mono px-1.5 py-0.5 rounded-md bg-[#1F222B] border border-[#2D3139] shrink-0">
            {tasks.length}
          </span>
        </button>

        {/* В работе */}
        <button
          id="task-stat-in-progress"
          data-active={filters.status === 'in_progress'}
          type="button"
          onClick={() => onChange({ ...filters, status: 'in_progress' })}
          className={`h-9 px-3 rounded-xl border flex items-center justify-between gap-2 transition-all cursor-pointer ${
            filters.status === 'in_progress'
              ? 'bg-emerald-950/40 border-emerald-500/60 text-black dark:text-white shadow-xs'
              : 'bg-[#0F1115] border-[#2D3139] hover:border-gray-600 text-black dark:text-gray-300'
          }`}
          title="Показать все задачи в работе (на исполнении)"
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-xs font-semibold text-black dark:text-inherit truncate">В работе</span>
          </div>
          <span className="text-xs font-bold text-black dark:text-emerald-300 font-mono px-1.5 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-500/30 shrink-0">
            {stats.inProgress}
          </span>
        </button>

        {/* Срок сегодня */}
        <button
          id="task-stat-due-today"
          data-active={filters.status === 'due_today'}
          type="button"
          onClick={() => onChange({ ...filters, status: 'due_today' })}
          className={`h-9 px-3 rounded-xl border flex items-center justify-between gap-2 transition-all cursor-pointer ${
            filters.status === 'due_today'
              ? 'bg-amber-950/40 border-amber-500/60 text-black dark:text-white shadow-xs'
              : 'bg-[#0F1115] border-[#2D3139] hover:border-gray-600 text-black dark:text-gray-300'
          }`}
          title="Показать задачи со сроком сегодня"
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="text-xs font-semibold text-black dark:text-inherit truncate">Срок сегодня</span>
          </div>
          <span className="text-xs font-bold text-black dark:text-amber-300 font-mono px-1.5 py-0.5 rounded-md bg-amber-950/60 border border-amber-500/30 shrink-0">
            {stats.dueToday}
          </span>
        </button>

        {/* Просрочено */}
        <button
          id="task-stat-overdue"
          data-active={filters.status === 'overdue'}
          type="button"
          onClick={() => onChange({ ...filters, status: 'overdue' })}
          className={`h-9 px-3 rounded-xl border flex items-center justify-between gap-2 transition-all cursor-pointer ${
            filters.status === 'overdue'
              ? 'bg-rose-950/40 border-rose-500/60 text-black dark:text-white shadow-xs'
              : 'bg-[#0F1115] border-[#2D3139] hover:border-gray-600 text-black dark:text-gray-300'
          }`}
          title="Показать просроченные задачи"
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <Flame className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
            <span className="text-xs font-semibold text-black dark:text-inherit truncate">Просрочено</span>
          </div>
          <span className="text-xs font-bold text-black dark:text-rose-300 font-mono px-1.5 py-0.5 rounded-md bg-rose-950/60 border border-rose-500/30 shrink-0">
            {stats.overdue}
          </span>
        </button>

        {/* Принято */}
        <button
          id="task-stat-accepted"
          data-active={filters.status === 'accepted'}
          type="button"
          onClick={() => onChange({ ...filters, status: 'accepted' })}
          className={`h-9 px-3 rounded-xl border flex items-center justify-between gap-2 transition-all cursor-pointer ${
            filters.status === 'accepted'
              ? 'bg-blue-950/40 border-blue-500/60 text-black dark:text-white shadow-xs'
              : 'bg-[#0F1115] border-[#2D3139] hover:border-gray-600 text-black dark:text-gray-300'
          }`}
          title="Показать принятые задачи"
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="text-xs font-semibold text-black dark:text-inherit truncate">Принято</span>
          </div>
          <span className="text-xs font-bold text-black dark:text-blue-300 font-mono px-1.5 py-0.5 rounded-md bg-blue-950/60 border border-blue-500/30 shrink-0">
            {stats.accepted}
          </span>
        </button>
      </div>

      {/* Панель элементов фильтрации */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        {/* Поиск по тексту задачи и результату */}
        <div className="md:col-span-4 relative">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="input-task-search"
            type="text"
            value={filters.searchQuery}
            onChange={(e) => onChange({ ...filters, searchQuery: e.target.value })}
            placeholder="Поиск по содержанию задачи или результату..."
            className="w-full pl-9 pr-4 py-2 bg-[#0F1115] border border-[#2D3139] rounded-xl text-xs text-[#E0E0E0] placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
          />
        </div>

        {/* 5. Поле выбора ответственных: множественный выбор и ручной ввод с клавиатуры */}
        <div className="md:col-span-4">
          <AssigneeMultiSelect
            employees={employees}
            tasks={tasks}
            selectedIds={filters.assigneeIds || []}
            onChange={(newIds) =>
              onChange({
                ...filters,
                assigneeIds: newIds,
                assigneeId: newIds.length === 1 ? newIds[0] : null,
              })
            }
            placeholder="Все ответственные (поиск и выбор)..."
          />
        </div>

        {/* Фильтр по плановой дате от/до */}
        <div className="md:col-span-3 flex items-center gap-1.5">
          <div className="relative flex-1">
            <Calendar className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="input-filter-task-date-from"
              type="date"
              title="План от"
              value={filters.plannedFrom}
              onChange={(e) => onChange({ ...filters, plannedFrom: e.target.value })}
              className="w-full pl-8 pr-2 py-2 bg-[#0F1115] border border-[#2D3139] rounded-xl text-[11px] text-[#E0E0E0] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>
          <span className="text-gray-500 text-xs">—</span>
          <div className="relative flex-1">
            <Calendar className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="input-filter-task-date-to"
              type="date"
              title="План до"
              value={filters.plannedTo}
              onChange={(e) => onChange({ ...filters, plannedTo: e.target.value })}
              className="w-full pl-8 pr-2 py-2 bg-[#0F1115] border border-[#2D3139] rounded-xl text-[11px] text-[#E0E0E0] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>
        </div>

        {/* Кнопка сброса */}
        <div className="md:col-span-1 flex justify-end">
          {hasActiveFilters && (
            <button
              id="btn-reset-task-filters"
              type="button"
              onClick={handleReset}
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-[#2D3139] transition-colors cursor-pointer"
              title="Сбросить все фильтры"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Строка со счетчиком совпадений */}
      <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1 border-t border-[#2D3139]/60">
        <span>
          Отображено: <strong className="text-[#E0E0E0]">{filteredCount}</strong> из {totalCount} задач
        </span>
        {hasActiveFilters && (
          <span className="text-blue-400">
            Применены пользовательские фильтры ({filters.assigneeIds?.length ? `Выбрано исполнителей: ${filters.assigneeIds.length}` : ''})
          </span>
        )}
      </div>
    </div>
  );
};
