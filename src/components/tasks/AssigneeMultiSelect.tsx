import React, { useState, useRef, useEffect, useMemo } from 'react';
import { User, Check, X, ChevronDown, Search } from 'lucide-react';
import { Employee, TaskRecord } from '../../types';

interface AssigneeMultiSelectProps {
  employees: Employee[];
  selectedIds: number[];
  onChange: (selectedIds: number[]) => void;
  placeholder?: string;
  tasks?: TaskRecord[];
}

function getTaskDeclension(n: number): string {
  const abs = Math.abs(n) % 100;
  const num = abs % 10;
  if (abs > 10 && abs < 20) return 'задач';
  if (num > 1 && num < 5) return 'задачи';
  if (num === 1) return 'задача';
  return 'задач';
}

export const AssigneeMultiSelect: React.FC<AssigneeMultiSelectProps> = ({
  employees,
  selectedIds,
  onChange,
  placeholder = 'Все ответственные',
  tasks = [],
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Расчет задач на исполнении (задача считается выполненной только при наличии отметки "Принято") и % загрузки исполнителей
  const { totalInExecution, workloadMap } = useMemo(() => {
    const inExecution = tasks.filter((t) => !t.isAccepted);
    const total = inExecution.length;
    const counts: Record<number, number> = {};

    inExecution.forEach((t) => {
      if (t.assigneeId != null) {
        counts[t.assigneeId] = (counts[t.assigneeId] || 0) + 1;
      }
    });

    const map: Record<number, { count: number; percentage: number; percentageStr: string }> = {};
    employees.forEach((emp) => {
      const count = counts[emp.id] || 0;
      const percentage = total > 0 ? (count / total) * 100 : 0;
      map[emp.id] = {
        count,
        percentage,
        percentageStr: `${percentage.toFixed(2)}%`,
      };
    });

    return { totalInExecution: total, workloadMap: map };
  }, [tasks, employees]);

  // Закрытие при клике вне компонента
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Фильтрация списка исполнителей по введенному с клавиатуры тексту
  const filteredEmployees = useMemo(() => {
    if (!searchQuery.trim()) return employees;
    const q = searchQuery.toLowerCase().trim();
    return employees.filter((emp) => {
      const nameMatch = emp.fullName.toLowerCase().includes(q);
      const posMatch = (emp.position || '').toLowerCase().includes(q);
      const deptMatch = (emp.departmentShortName || '').toLowerCase().includes(q);
      const orgMatch = (emp.organizationName || '').toLowerCase().includes(q);
      return nameMatch || posMatch || deptMatch || orgMatch;
    });
  }, [employees, searchQuery]);

  const selectedEmployees = useMemo(() => {
    return employees.filter((e) => selectedIds.includes(e.id));
  }, [employees, selectedIds]);

  const handleToggleEmployee = (id: number) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((item) => item !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const handleSelectAllFiltered = () => {
    const idsToAdd = filteredEmployees.map((e) => e.id);
    const combined = Array.from(new Set([...selectedIds, ...idsToAdd]));
    onChange(combined);
  };

  const handleClearAll = () => {
    onChange([]);
    setSearchQuery('');
  };

  const handleRemoveOne = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedIds.filter((item) => item !== id));
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Кнопка открытия / поисковое поле */}
      <div
        id="assignee-multiselect-trigger"
        onClick={() => {
          setIsOpen(true);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
        className={`w-full min-h-[38px] px-3 py-1.5 bg-[#0F1115] border rounded-xl text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors ${
          isOpen
            ? 'border-blue-500 ring-1 ring-blue-500'
            : selectedIds.length > 0
            ? 'border-blue-500/50 bg-[#12151D]'
            : 'border-[#2D3139] hover:border-gray-600'
        }`}
      >
        <div className="flex items-center gap-1.5 flex-1 flex-wrap overflow-hidden">
          <User className="w-3.5 h-3.5 text-gray-500 shrink-0" />

          {selectedEmployees.length === 0 ? (
            <span className="text-gray-400 select-none">{placeholder}</span>
          ) : (
            <div className="flex items-center gap-1 flex-wrap max-w-full">
              {selectedEmployees.slice(0, 2).map((emp) => {
                const wl = workloadMap[emp.id];
                return (
                  <span
                    key={emp.id}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-600/20 text-blue-300 border border-blue-500/30 text-[11px] font-medium shrink-0"
                  >
                    <span className="truncate max-w-[100px]" title={emp.fullName}>
                      {emp.fullName}
                    </span>
                    {wl && (
                      <span
                        className="text-[10px] font-mono text-blue-200 bg-blue-700/40 px-1 rounded"
                        title={`Загрузка: ${wl.percentageStr} (${wl.count} задач на исполнении)`}
                      >
                        {wl.percentageStr}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => handleRemoveOne(emp.id, e)}
                      className="hover:text-white rounded-full p-0.5 hover:bg-blue-600/40"
                      title="Удалить"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                );
              })}

              {selectedEmployees.length > 2 && (
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-[#1F222B] text-gray-300 border border-[#2D3139] font-mono shrink-0">
                  +{selectedEmployees.length - 2} еще
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 text-gray-400">
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClearAll();
              }}
              className="p-1 rounded hover:bg-[#2D3139] hover:text-white"
              title="Очистить всех выбранных"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-blue-400' : ''
            }`}
          />
        </div>
      </div>

      {/* Выпадающая панель с полем ввода и списком исполнителей */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1.5 bg-[#171A21] border border-[#2D3139] rounded-xl shadow-2xl overflow-hidden p-2.5 space-y-2 animate-in fade-in zoom-in-95 duration-100 min-w-[320px]">
          {/* Поле ручного клавиатурного ввода с фильтрацией на лету */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={inputRef}
              id="input-assignee-filter-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Введите ФИО или должность..."
              className="w-full pl-8 pr-7 py-1.5 bg-[#0F1115] border border-[#2D3139] rounded-lg text-xs text-[#E0E0E0] placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Быстрые действия: Выбрать всех отфильтрованных / Сброс и сводка по исполнению */}
          <div className="flex items-center justify-between text-[11px] text-gray-400 px-1 border-b border-[#2D3139]/60 pb-1.5">
            <div className="flex items-center gap-1.5 truncate">
              <span>
                {filteredEmployees.length} {filteredEmployees.length === 1 ? 'сотрудник' : 'сотрудников'}
              </span>
              <span className="text-gray-500">•</span>
              <span className="text-blue-400 font-mono" title="Всего незавершенных задач">
                {totalInExecution} на исполнении
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {filteredEmployees.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  className="text-blue-400 hover:underline cursor-pointer"
                >
                  Выбрать все
                </button>
              )}
              {selectedIds.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-rose-400 hover:underline cursor-pointer"
                >
                  Сбросить
                </button>
              )}
            </div>
          </div>

          {/* Список сотрудников с чекбоксами и информацией о загрузке в % с точностью до сотых */}
          <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
            {filteredEmployees.length === 0 ? (
              <div className="py-4 text-center text-gray-500 text-xs">
                Сотрудники по запросу не найдены
              </div>
            ) : (
              filteredEmployees.map((emp) => {
                const isChecked = selectedIds.includes(emp.id);
                const wl = workloadMap[emp.id] || { count: 0, percentage: 0, percentageStr: '0.00%' };
                return (
                  <div
                    key={emp.id}
                    onClick={() => handleToggleEmployee(emp.id)}
                    className={`flex items-center justify-between gap-2.5 px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                      isChecked
                        ? 'bg-blue-600/15 text-blue-200 border border-blue-500/30'
                        : 'text-gray-300 hover:bg-[#1F222B]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                          isChecked
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'border-[#3D424D] bg-[#0F1115]'
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-[#E0E0E0] truncate">
                          {emp.fullName}
                        </div>
                        {(emp.position || emp.departmentShortName) && (
                          <div className="text-[10px] text-gray-400 truncate">
                            {emp.position}
                            {emp.position && emp.departmentShortName ? ' • ' : ''}
                            {emp.departmentShortName}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Напротив каждого исполнителя: информация о загрузке в % от общего количества задач на исполнении */}
                    <div
                      className="shrink-0 flex flex-col items-end text-right pl-2"
                      title={`Загрузка: ${wl.percentageStr} (${wl.count} из ${totalInExecution} задач на исполнении)`}
                    >
                      <span
                        className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded-md border ${
                          wl.count > 0
                            ? 'bg-blue-950/70 text-blue-300 border-blue-500/40'
                            : 'bg-[#12151B] text-gray-500 border-[#2D3139]'
                        }`}
                      >
                        {wl.percentageStr}
                      </span>
                      <span className="text-[9px] text-gray-400 font-mono mt-0.5">
                        {wl.count} {getTaskDeclension(wl.count)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
