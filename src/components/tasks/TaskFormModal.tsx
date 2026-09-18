import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  CheckSquare,
  X,
  Check,
  AlertCircle,
  Calendar,
  User,
  FileText,
  Clock,
  Maximize2,
  Minimize2,
  CheckCircle2,
  Search,
  ChevronDown,
  Users
} from 'lucide-react';
import { TaskRecord, Employee } from '../../types';
import { calculateDaysRemaining, getTaskStatusInfo } from '../../utils/taskUtils';

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Omit<TaskRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: number }) => Promise<void>;
  onSaveMultiple?: (tasks: Array<Omit<TaskRecord, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
  employees: Employee[];
  initialData?: TaskRecord | null;
  onOpenNewEmployeeModal?: () => void;
  tasks?: TaskRecord[];
}

export const TaskFormModal: React.FC<TaskFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onSaveMultiple,
  employees,
  initialData,
  onOpenNewEmployeeModal,
  tasks = [],
}) => {
  const [taskText, setTaskText] = useState('');
  const [plannedEndDate, setPlannedEndDate] = useState('');
  const [actualEndDate, setActualEndDate] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);
  const [assigneeId, setAssigneeId] = useState<number | ''>('');
  const [result, setResult] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  // Множественный выбор исполнителей и ручной поиск с фильтрацией
  const [isMultipleAssignees, setIsMultipleAssignees] = useState(false);
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<number[]>([]);
  const [assigneeSearchQuery, setAssigneeSearchQuery] = useState('');
  const [isAssigneeDropdownOpen, setIsAssigneeDropdownOpen] = useState(false);

  const assigneeDropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Расчет загрузки исполнителей в % от задач на исполнении (задача считается выполненной только при наличии отметки "Принято")
  const workloadMap = useMemo(() => {
    const inExecution = tasks.filter((t) => !t.isAccepted);
    const total = inExecution.length;
    const map: Record<number, { count: number; percentageStr: string }> = {};

    employees.forEach((emp) => {
      const count = inExecution.filter((t) => t.assigneeId === emp.id).length;
      const pct = total > 0 ? (count / total) * 100 : 0;
      map[emp.id] = { count, percentageStr: `${pct.toFixed(2)}%` };
    });

    return { total, map };
  }, [tasks, employees]);

  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      setTaskText(initialData.task || '');
      setPlannedEndDate(initialData.plannedEndDate || '');
      setActualEndDate(initialData.actualEndDate || '');
      setIsCompleted(Boolean(initialData.isCompleted));
      setIsAccepted(Boolean(initialData.isAccepted));
      setAssigneeId(initialData.assigneeId ?? '');
      setSelectedAssigneeIds(initialData.assigneeId ? [initialData.assigneeId] : []);
      setIsMultipleAssignees(false);
      setResult(initialData.result || '');
    } else {
      setTaskText('');
      // По умолчанию плановая дата - через 7 дней
      const defDate = new Date();
      defDate.setDate(defDate.getDate() + 7);
      setPlannedEndDate(defDate.toISOString().slice(0, 10));
      setActualEndDate('');
      setIsCompleted(false);
      setIsAccepted(false);
      setAssigneeId('');
      setSelectedAssigneeIds([]);
      setIsMultipleAssignees(false);
      setResult('');
    }
    setAssigneeSearchQuery('');
    setIsAssigneeDropdownOpen(false);
    setError(null);
  }, [initialData, isOpen, employees]);

  // Закрытие выпадающего списка при клике вне компонента
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (assigneeDropdownRef.current && !assigneeDropdownRef.current.contains(e.target as Node)) {
        setIsAssigneeDropdownOpen(false);
      }
    };
    if (isAssigneeDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAssigneeDropdownOpen]);

  // Автофокус на поле ввода поиска при открытии выпадающего списка
  useEffect(() => {
    if (isAssigneeDropdownOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setAssigneeSearchQuery('');
    }
  }, [isAssigneeDropdownOpen]);

  // Фильтрация списка сотрудников в реальном времени при ручном наборе символов
  const filteredEmployees = useMemo(() => {
    if (!assigneeSearchQuery.trim()) return employees;
    const q = assigneeSearchQuery.toLowerCase().trim();
    return employees.filter((emp) => {
      const nameMatch = emp.fullName.toLowerCase().includes(q);
      const posMatch = (emp.position || '').toLowerCase().includes(q);
      const deptMatch = (emp.departmentShortName || '').toLowerCase().includes(q);
      const orgMatch = (emp.organizationName || '').toLowerCase().includes(q);
      return nameMatch || posMatch || deptMatch || orgMatch;
    });
  }, [employees, assigneeSearchQuery]);

  const handleToggleAssignee = (id: number) => {
    // Переключение чекбокса напротив сотрудника (работает как при создании, так и при редактировании)
    setSelectedAssigneeIds((prev) => {
      const exists = prev.includes(id);
      const updated = exists ? prev.filter((item) => item !== id) : [...prev, id];
      setAssigneeId(updated.length > 0 ? updated[0] : '');
      setIsMultipleAssignees(updated.length > 1);
      return updated;
    });
  };

  const handleSelectAllFiltered = () => {
    const idsToAdd = filteredEmployees.map((e) => e.id);
    setSelectedAssigneeIds((prev) => {
      const updated = Array.from(new Set([...prev, ...idsToAdd]));
      setAssigneeId(updated.length > 0 ? updated[0] : '');
      setIsMultipleAssignees(updated.length > 1);
      return updated;
    });
  };

  const handleClearAllSelected = () => {
    setSelectedAssigneeIds([]);
    setAssigneeId('');
    setIsMultipleAssignees(false);
  };

  const handleSelectSingleAssignee = (id: number | '') => {
    setAssigneeId(id);
    if (id) {
      setSelectedAssigneeIds([id]);
      setIsMultipleAssignees(false);
    } else {
      setSelectedAssigneeIds([]);
      setIsMultipleAssignees(false);
    }
  };

  if (!isOpen) return null;

  // Расчет оставшихся дней для интерактивного предпросмотра
  const previewDays = calculateDaysRemaining(
    plannedEndDate,
    isAccepted,
    initialData?.isAccepted ? initialData.frozenDaysRemaining : null,
    actualEndDate
  );
  const statusInfo = getTaskStatusInfo(previewDays, isAccepted, isCompleted);

  const handleToggleCompleted = (checked: boolean) => {
    setIsCompleted(checked);
    if (!checked && isAccepted) {
      setIsAccepted(false);
    }
  };

  const handleToggleAccepted = (checked: boolean) => {
    if (!isCompleted) return;
    setIsAccepted(checked);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskText.trim()) {
      setError('Укажите формулировку задачи');
      return;
    }
    if (!plannedEndDate) {
      setError('Укажите плановую дату окончания');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Если задача принята, пересчитываем значение как разницу между "План" - "Факт" (при наличии факта)
      let frozenDays: number | null = null;
      if (isAccepted && actualEndDate) {
        frozenDays = calculateDaysRemaining(plannedEndDate, true, null, actualEndDate);
      }

      // При множественном выборе исполнителей для НОВОЙ задачи: добавляем отдельную задачу в БД для каждого
      if (!initialData && selectedAssigneeIds.length > 1) {
        const taskListToCreate = selectedAssigneeIds.map((empId) => {
          const emp = employees.find((e) => e.id === empId);
          return {
            task: taskText.trim(),
            plannedEndDate,
            actualEndDate: actualEndDate || '',
            isCompleted,
            isAccepted,
            frozenDaysRemaining: frozenDays,
            assigneeId: empId,
            assigneeName: emp ? emp.fullName : '',
            result: result.trim(),
          };
        });

        if (onSaveMultiple) {
          await onSaveMultiple(taskListToCreate);
        } else {
          for (const t of taskListToCreate) {
            await onSave(t);
          }
        }
        onClose();
        return;
      }

      // При множественном выборе исполнителей для РЕДАКТИРУЕМОЙ задачи:
      // Текущая задача обновляется для первого/исходного выбранного исполнителя,
      // а для остальных отмеченных создаются копии задачи с идентичными параметрами
      if (initialData && selectedAssigneeIds.length > 1) {
        const primaryEmpId =
          initialData.assigneeId && selectedAssigneeIds.includes(initialData.assigneeId)
            ? initialData.assigneeId
            : selectedAssigneeIds[0];
        const primaryEmp = employees.find((e) => e.id === primaryEmpId);
        const additionalEmpIds = selectedAssigneeIds.filter((id) => id !== primaryEmpId);

        // 1. Обновляем исходную редактируемую задачу
        await onSave({
          id: initialData.id,
          task: taskText.trim(),
          plannedEndDate,
          actualEndDate: actualEndDate || '',
          isCompleted,
          isAccepted,
          frozenDaysRemaining: frozenDays,
          assigneeId: primaryEmpId,
          assigneeName: primaryEmp ? primaryEmp.fullName : '',
          result: result.trim(),
        });

        // 2. Для остальных выбранных исполнителей создаем отдельные задачи в БД
        const additionalTasksToCreate = additionalEmpIds.map((empId) => {
          const emp = employees.find((e) => e.id === empId);
          return {
            task: taskText.trim(),
            plannedEndDate,
            actualEndDate: actualEndDate || '',
            isCompleted,
            isAccepted,
            frozenDaysRemaining: frozenDays,
            assigneeId: empId,
            assigneeName: emp ? emp.fullName : '',
            result: result.trim(),
          };
        });

        if (onSaveMultiple) {
          await onSaveMultiple(additionalTasksToCreate);
        } else {
          for (const t of additionalTasksToCreate) {
            await onSave(t);
          }
        }
        onClose();
        return;
      }

      // Одиночный выбор исполнителя или снятие назначения (0 или 1 сотрудник)
      const effectiveAssigneeId = selectedAssigneeIds.length === 1
        ? selectedAssigneeIds[0]
        : (assigneeId !== '' ? Number(assigneeId) : null);
      const selectedEmp = effectiveAssigneeId ? employees.find((e) => e.id === effectiveAssigneeId) : undefined;
      const assigneeName = selectedEmp ? selectedEmp.fullName : '';

      await onSave({
        ...(initialData ? { id: initialData.id } : {}),
        task: taskText.trim(),
        plannedEndDate,
        actualEndDate: actualEndDate || '',
        isCompleted,
        isAccepted,
        frozenDaysRemaining: frozenDays,
        assigneeId: effectiveAssigneeId,
        assigneeName,
        result: result.trim(),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ошибка сохранения задачи');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className={`bg-[#171A21] border border-[#2D3139] shadow-2xl rounded-2xl flex flex-col transition-all duration-200 overflow-hidden ${
          isMaximized ? 'w-full h-full max-w-none rounded-none' : 'w-full max-w-2xl max-h-[92vh]'
        }`}
      >
        {/* Заголовок */}
        <div
          onDoubleClick={() => setIsMaximized((prev) => !prev)}
          title="Двойной клик разворачивает / восстанавливает окно"
          className="px-5 sm:px-6 py-3.5 sm:py-4 border-b border-[#2D3139] flex items-center justify-between bg-[#1F222B] shrink-0 select-none cursor-default"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-600/10 text-blue-400 flex items-center justify-center border border-blue-500/20 shrink-0">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3
                id="task-form-modal-title"
                className="text-base font-bold text-[#E0E0E0] truncate"
              >
                {initialData ? `Редактирование задачи №${initialData.id}` : 'Создание новой задачи'}
              </h3>
              <p className="text-xs text-gray-400 truncate">
                Символом <span className="text-rose-400 font-bold">*</span> обозначены обязательные для заполнения поля
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-2">
            <button
              type="button"
              onClick={() => setIsMaximized(!isMaximized)}
              className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-[#2D3139] transition-colors cursor-pointer"
              title={isMaximized ? 'Восстановить исходный размер' : 'Развернуть на весь экран'}
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Закрыть окно"
              className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-[#2D3139] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Тело формы */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl flex items-center gap-2.5 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Индикатор статуса и расчетных дней */}
          <div className="p-3.5 bg-[#0F1115] border border-[#2D3139] rounded-xl flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-xs text-gray-400">Текущий статус:</span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${statusInfo.badgeClass}`}
              >
                <span className={`w-2 h-2 rounded-full ${statusInfo.dotClass}`} />
                {statusInfo.statusText}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-gray-400">Осталось дней:</span>
              <span className={`font-mono font-bold text-sm ${statusInfo.textClass}`}>
                {previewDays === null ? '—' : previewDays > 0 ? `+${previewDays}` : previewDays}
              </span>
              {isAccepted && (
                <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/30">
                  зафиксировано
                </span>
              )}
            </div>
          </div>

          {/* Формулировка задачи */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gray-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              <span>Задача (описание поручения) *</span>
            </label>
            <textarea
              id="input-task-text"
              required
              rows={3}
              value={taskText}
              onChange={(e) => setTaskText(e.target.value)}
              placeholder="Введите содержание поручения или задачи..."
              className="w-full px-3.5 py-2.5 bg-[#0F1115] border border-[#2D3139] rounded-xl text-xs text-[#E0E0E0] placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-y"
            />
          </div>

          {/* Сроки: Плановая и Фактическая дата */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                <span>Дата окончания по плану *</span>
              </label>
              <input
                id="input-task-planned-date"
                type="date"
                required
                value={plannedEndDate}
                onChange={(e) => setPlannedEndDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#0F1115] border border-[#2D3139] rounded-xl text-xs text-[#E0E0E0] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                <span>Дата окончания по факту</span>
              </label>
              <input
                id="input-task-actual-date"
                type="date"
                value={actualEndDate}
                onChange={(e) => setActualEndDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#0F1115] border border-[#2D3139] rounded-xl text-xs text-[#E0E0E0] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Ответственный */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="block text-xs font-medium text-gray-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-400" />
                <span>Ответственный</span>
                {!initialData && selectedAssigneeIds.length > 1 && (
                  <span className="ml-1 text-[11px] text-blue-400 font-semibold bg-blue-900/30 border border-blue-500/30 px-1.5 py-0.5 rounded-md">
                    выбрано: {selectedAssigneeIds.length}
                  </span>
                )}
              </label>

              <div className="flex items-center gap-3">
                {onOpenNewEmployeeModal && (
                  <button
                    type="button"
                    onClick={onOpenNewEmployeeModal}
                    className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                  >
                    + Новый сотрудник
                  </button>
                )}
              </div>
            </div>

            {/* Интерактивный выпадающий список с ручным набором и фильтрацией */}
            <div ref={assigneeDropdownRef} className="relative w-full">
              {/* Триггер выпадающего списка */}
              <div
                id="trigger-task-assignee-dropdown"
                onClick={() => setIsAssigneeDropdownOpen((prev) => !prev)}
                className={`w-full min-h-[42px] px-3.5 py-2 bg-[#0F1115] border rounded-xl text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                  isAssigneeDropdownOpen
                    ? 'border-blue-500 ring-1 ring-blue-500'
                    : 'border-[#2D3139] hover:border-gray-500'
                }`}
              >
                {/* Содержимое триггера */}
                <div className="flex items-center gap-1.5 flex-1 flex-wrap overflow-hidden min-w-0">
                  {selectedAssigneeIds.length === 0 ? (
                    <span className="text-gray-400 select-none">
                      Не назначен (нажмите для выбора исполнителей)...
                    </span>
                  ) : selectedAssigneeIds.length === 1 ? (
                    (() => {
                      const selectedEmp = employees.find((e) => e.id === selectedAssigneeIds[0]);
                      if (!selectedEmp) {
                        return (
                          <span className="text-gray-400 select-none">
                            Не назначен (нажмите для выбора)
                          </span>
                        );
                      }
                      const wl = workloadMap.map[selectedEmp.id];
                      return (
                        <div className="flex items-center justify-between w-full min-w-0 pr-1">
                          <div className="flex items-center gap-2 truncate">
                            <span className="font-semibold text-[#E0E0E0] truncate">
                              {selectedEmp.fullName}
                            </span>
                            {selectedEmp.position && (
                              <span className="text-[11px] text-gray-400 truncate">
                                ({selectedEmp.position})
                              </span>
                            )}
                          </div>
                          {wl && (
                            <span className="font-mono text-[11px] text-blue-300 bg-blue-950/70 border border-blue-500/40 px-1.5 py-0.5 rounded shrink-0">
                              Загрузка: {wl.percentageStr}
                            </span>
                          )}
                        </div>
                      );
                    })()
                  ) : (
                    <div className="flex items-center gap-1.5 flex-wrap max-w-full">
                      {selectedAssigneeIds.map((id) => {
                        const emp = employees.find((e) => e.id === id);
                        if (!emp) return null;
                        const wl = workloadMap.map[emp.id];
                        return (
                          <span
                            key={emp.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-600/20 text-blue-200 border border-blue-500/30 text-[11px] font-medium"
                          >
                            <span className="truncate max-w-[130px]" title={emp.fullName}>
                              {emp.fullName}
                            </span>
                            {wl && (
                              <span
                                className="text-[10px] font-mono text-blue-300 bg-blue-900/50 px-1 rounded"
                                title={`Загрузка: ${wl.percentageStr}`}
                              >
                                {wl.percentageStr}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleAssignee(emp.id);
                              }}
                              className="hover:text-white rounded-full p-0.5 hover:bg-blue-600/40 text-blue-300 cursor-pointer"
                              title="Удалить"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0 text-gray-400">
                  {selectedAssigneeIds.length > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClearAllSelected();
                      }}
                      className="p-1 rounded hover:bg-[#2D3139] hover:text-white cursor-pointer"
                      title="Сбросить выбор"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${
                      isAssigneeDropdownOpen ? 'rotate-180 text-blue-400' : ''
                    }`}
                  />
                </div>
              </div>

              {/* Выпадающее окно со строкой поиска и списком исполнителей */}
              {isAssigneeDropdownOpen && (
                <div className="absolute z-50 left-0 right-0 top-full mt-1.5 bg-[#171A21] border border-[#2D3139] rounded-xl shadow-2xl p-3 space-y-2.5 animate-in fade-in zoom-in-95 duration-100 min-w-[320px]">
                  {/* Поле ручного набора символов с одновременной фильтрацией */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      ref={searchInputRef}
                      id="input-task-assignee-filter"
                      type="text"
                      value={assigneeSearchQuery}
                      onChange={(e) => setAssigneeSearchQuery(e.target.value)}
                      placeholder="Введите символы для фильтрации (ФИО, должность, отдел)..."
                      className="w-full pl-9 pr-8 py-2 bg-[#0F1115] border border-[#2D3139] rounded-xl text-xs text-[#E0E0E0] placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    />
                    {assigneeSearchQuery && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAssigneeSearchQuery('');
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-0.5 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Быстрые действия: количество и выбор всех */}
                  <div className="flex items-center justify-between text-[11px] text-gray-400 px-1 border-b border-[#2D3139]/60 pb-1.5">
                    <span className="flex items-center gap-1.5">
                      <span>Найдено:</span>
                      <strong className="text-gray-200">{filteredEmployees.length}</strong>
                      {selectedAssigneeIds.length > 0 && (
                        <span className="text-blue-400 font-semibold ml-1">
                          (отмечено: {selectedAssigneeIds.length})
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-3">
                      {filteredEmployees.length > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectAllFiltered();
                          }}
                          className="text-blue-400 hover:underline cursor-pointer font-medium"
                        >
                          Выбрать всех ({filteredEmployees.length})
                        </button>
                      )}
                      {selectedAssigneeIds.length > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleClearAllSelected();
                          }}
                          className="text-rose-400 hover:underline cursor-pointer font-medium"
                        >
                          Снять все
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Список сотрудников с надежными интерактивными чекбоксами */}
                  <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                    {/* Опция "Не назначен" */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClearAllSelected();
                      }}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer select-none transition-colors ${
                        selectedAssigneeIds.length === 0
                          ? 'bg-blue-600/15 text-blue-200 border border-blue-500/30 font-semibold'
                          : 'text-gray-400 hover:bg-[#1F222B] hover:text-white'
                      }`}
                    >
                      <span>— Не назначен</span>
                      {selectedAssigneeIds.length === 0 && <Check className="w-3.5 h-3.5 text-blue-400" />}
                    </div>

                    {filteredEmployees.length === 0 ? (
                      <div className="py-4 text-center text-gray-500 text-xs">
                        Сотрудники по запросу не найдены
                      </div>
                    ) : (
                      filteredEmployees.map((emp) => {
                        const isChecked = selectedAssigneeIds.includes(emp.id);
                        const wl = workloadMap.map[emp.id];

                        return (
                          <div
                            key={emp.id}
                            id={`item-assignee-${emp.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleAssignee(emp.id);
                            }}
                            className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-xs cursor-pointer select-none transition-colors ${
                              isChecked
                                ? 'bg-blue-600/20 text-blue-100 border border-blue-500/40 font-medium'
                                : 'text-gray-300 hover:bg-[#1F222B] border border-transparent'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              {/* Чекбокс с четкой видимой галочкой (Check) */}
                              <div
                                id={`checkbox-visual-assignee-${emp.id}`}
                                className={`w-4 h-4 rounded flex items-center justify-center shrink-0 transition-all border ${
                                  isChecked
                                    ? 'bg-blue-600 border-blue-500 text-white shadow-sm'
                                    : 'border-gray-500 bg-[#0F1115] hover:border-blue-400'
                                }`}
                              >
                                {isChecked && <Check className="w-3.5 h-3.5 stroke-[3] text-white" />}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className={`truncate ${isChecked ? 'font-bold text-white' : 'font-medium text-[#E0E0E0]'}`}>
                                  {emp.fullName}
                                </div>
                                {(emp.position || emp.departmentShortName) && (
                                  <div className="text-[10px] text-gray-400 truncate mt-0.5">
                                    {emp.position}
                                    {emp.position && emp.departmentShortName ? ' • ' : ''}
                                    {emp.departmentShortName}
                                  </div>
                                )}
                              </div>
                            </div>

                            {wl && (
                              <div className="shrink-0 flex flex-col items-end text-right pl-2">
                                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-950/60 border border-blue-500/30 text-blue-300">
                                  {wl.percentageStr}
                                </span>
                                <span className="text-[9px] text-gray-400 mt-0.5">
                                  {wl.count} в работе
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Кнопка закрытия выпадающего меню */}
                  <div className="pt-2 border-t border-[#2D3139]/80 flex items-center justify-between">
                    <span className="text-[11px] text-gray-400">
                      {selectedAssigneeIds.length > 0
                        ? `Выбрано: ${selectedAssigneeIds.length} сотр.`
                        : 'Не назначен'}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsAssigneeDropdownOpen(false);
                      }}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Готово
                    </button>
                  </div>
                </div>
              )}

              {/* Информационный баннер при множественном выборе (создание нескольких задач в БД) */}
              {selectedAssigneeIds.length > 1 && (
                <div className="mt-2 p-2.5 bg-blue-950/40 border border-blue-500/30 rounded-xl text-xs text-blue-300 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>
                      {initialData ? (
                        <>
                          Выбрано исполнителей: <strong>{selectedAssigneeIds.length}</strong>. Текущая задача будет обновлена для первого сотрудника, и дополнительно создано{' '}
                          <strong>{selectedAssigneeIds.length - 1}</strong> {selectedAssigneeIds.length - 1 === 1 ? 'копия' : 'копии'} задачи для остальных выбранных исполнителей.
                        </>
                      ) : (
                        <>
                          Выбрано исполнителей: <strong>{selectedAssigneeIds.length}</strong>. Будет создано{' '}
                          <strong>{selectedAssigneeIds.length}</strong> отдельных записей в базе данных (по одной для каждого сотрудника).
                        </>
                      )}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleClearAllSelected()}
                    className="text-[11px] text-blue-300 hover:text-white underline cursor-pointer shrink-0"
                  >
                    Очистить
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Чекбоксы: Выполнено и Принято */}
          <div className="p-4 bg-[#0F1115] border border-[#2D3139] rounded-xl space-y-3">
            <span className="text-xs font-semibold text-gray-300 block">Отметки исполнения:</span>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                htmlFor="checkbox-modal-task-completed"
                className="flex items-start gap-3 p-2.5 rounded-lg bg-[#171A21] border border-[#2D3139] cursor-pointer hover:border-gray-500 transition-colors"
              >
                <input
                  id="checkbox-modal-task-completed"
                  type="checkbox"
                  checked={isCompleted}
                  onChange={(e) => handleToggleCompleted(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500 bg-[#0F1115]"
                />
                <div>
                  <span className="text-xs font-medium text-[#E0E0E0] block">Выполнено</span>
                  <span className="text-[11px] text-gray-400 block mt-0.5">
                    Исполнитель завершил выполнение работы
                  </span>
                </div>
              </label>

              <label
                htmlFor="checkbox-modal-task-accepted"
                className={`flex items-start gap-3 p-2.5 rounded-lg border transition-colors ${
                  !isCompleted
                    ? 'bg-[#171A21]/50 border-[#2D3139]/50 opacity-40 cursor-not-allowed'
                    : 'bg-[#171A21] border-[#2D3139] cursor-pointer hover:border-gray-500'
                }`}
                title={!isCompleted ? 'Недоступно: сначала необходимо установить отметку "Выполнено"' : undefined}
              >
                <input
                  id="checkbox-modal-task-accepted"
                  type="checkbox"
                  disabled={!isCompleted}
                  checked={isAccepted}
                  onChange={(e) => handleToggleAccepted(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-gray-600 text-emerald-600 focus:ring-emerald-500 bg-[#0F1115] disabled:cursor-not-allowed"
                />
                <div>
                  <span className="text-xs font-medium text-[#E0E0E0] block">Принято</span>
                  <span className="text-[11px] text-gray-400 block mt-0.5">
                    {!isCompleted
                      ? 'Сначала необходимо установить отметку "Выполнено"'
                      : 'Руководитель принял результат (счетчик дней фиксируется)'}
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Поле "Результат" */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gray-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Результат выполнения</span>
            </label>
            <textarea
              id="input-task-result"
              rows={3}
              value={result}
              onChange={(e) => setResult(e.target.value)}
              placeholder="Укажите достигнутый результат, реквизиты подтверждающего документа или комментарий..."
              className="w-full px-3.5 py-2.5 bg-[#0F1115] border border-[#2D3139] rounded-xl text-xs text-[#E0E0E0] placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-y"
            />
          </div>

          {/* Кнопки действий */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#2D3139]">
            <button
              id="btn-cancel-task-form"
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-xs font-medium text-gray-400 hover:text-white hover:bg-[#2D3139] transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <button
              id="btn-save-task-form"
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs shadow-blue-500/20 transition-all cursor-pointer"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>
                {initialData
                  ? selectedAssigneeIds.length > 1
                    ? `Сохранить и создать копии (${selectedAssigneeIds.length - 1})`
                    : 'Сохранить изменения'
                  : selectedAssigneeIds.length > 1
                  ? `Создать задачи (${selectedAssigneeIds.length})`
                  : 'Создать задачу'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
